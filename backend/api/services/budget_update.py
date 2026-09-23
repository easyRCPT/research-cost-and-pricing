from decimal import Decimal, InvalidOperation
from typing import cast

from django.core.exceptions import FieldDoesNotExist
from django.db import models, transaction
from django.db.models import Model
from rest_framework.exceptions import ValidationError

from ..models import (
    Activity,
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    NonStaffCostCategory,
    NonStaffCostLine,
    Region,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)
from .budget_details import get_budget_details
from .staff_time_validation import check_time


@transaction.atomic
def update_field(
    budget: Budget,
    data: dict,
) -> dict | None:
    # Update database
    section = data["section"]
    row_id = data.get("row_id")
    field = data["field"]
    value = data["value"]
    year = data.get("year")

    if section == "project":
        requires_calculation = update_project(budget, field, value)
    elif section == "budget":
        requires_calculation = update_budget(budget, field, value)
    elif section == "staff":
        if row_id is None:
            raise ValidationError("row_id is required for staff.")
        requires_calculation = update_staff(budget, row_id, field, value, year)
    elif section == "non_staff":
        if row_id is None:
            raise ValidationError("row_id is required for non_staff.")
        requires_calculation = update_non_staff(budget, row_id, field, value, year)
    elif section == "deliverable":
        if row_id is None:
            raise ValidationError("row_id is required for deliverable.")
        requires_calculation = update_deliverable(budget, row_id, field, value)
    else:
        raise ValidationError(f"Invalid section: {section}")

    if requires_calculation:
        return get_budget_details(budget)

    return None


def update_project(
    budget: Budget,
    field: str,
    value: object,
) -> bool:
    project = budget.project

    fields_without_calculation = {
        "title",
        "chief_investigator",
        "funder",
        "other_funder",
        "other_funder_category",
        "scheme",
        "additional_information",
    }

    fields_requiring_calculation = {
        "start_year",
        "start_month",
        "end_year",
        "end_month",
    }

    if field in fields_without_calculation:
        _set_field(project, field, value)
        return False

    if field in fields_requiring_calculation:
        _set_field(project, field, value)
        return True

    if field == "department":
        if not isinstance(value, str):
            raise ValidationError("Field 'department' must be a string.")
        try:
            project.department = Department.objects.get(pk=value)
        except Department.DoesNotExist:
            raise ValidationError("Invalid department.")

        _save(project, ["department"])
        return False

    if field == "activity":
        if value is None:
            project.activity = None
        elif not isinstance(value, str):
            raise ValidationError("Field 'activity' must be a string.")
        else:
            try:
                project.activity = Activity.objects.get(pk=value)
            except Activity.DoesNotExist:
                raise ValidationError("Invalid activity.")

        _save(project, ["activity"])
        return False

    if field == "region":
        if value is None:
            project.region = None
        elif not isinstance(value, str):
            raise ValidationError("Field 'region' must be a string.")
        else:
            try:
                project.region = Region.objects.get(pk=value)
            except Region.DoesNotExist:
                raise ValidationError("Invalid region.")

        _save(project, ["region"])
        return False

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_budget(
    budget: Budget,
    field: str,
    value: object,
) -> bool:
    fields_without_calculation = {
        "comments",
        "justification",
        "justification_notes",
        "dean_exemption_reason",
    }

    fields_requiring_calculation = {
        "mode",
        "in_kind_multiplier",
        "margin",
        "cash_co_contribution",
        "gst_applicable",
    }

    if field in fields_without_calculation:
        _set_field(budget, field, value)
        return False

    if field in fields_requiring_calculation:
        _set_field(budget, field, value)
        return True

    # Said in its own words rather than as the generic refusal below, because
    # this one is a rule rather than a typo: the multiplier is copied onto the
    # budget from full_cost_recovery_multiplier at creation, and it is what
    # decides whether the budget needs a Dean. Editable per budget, it would be
    # a second door into both the price and the approval route.
    if field == "cost_multiplier":
        raise ValidationError(
            "The cost multiplier is fixed at the University's full cost "
            "recovery rate and is not editable per budget."
        )

    raise ValidationError(f"Field '{field}' cannot be updated.")


def _set_in_kind(line, field: str, value: object) -> None:
    """
    Keep the reason and the tick in step.

    Unticking clears the sentence: a reason the University is absorbing a cost
    it is not absorbing is worse than no reason, and the database refuses the
    pair anyway. Writing a reason onto an unticked line is refused rather than
    silently ticking it, because which of the two the caller meant is a guess.
    """
    if field == "in_kind":
        line.in_kind = value
        if not value:
            line.in_kind_reason = ""
        line.full_clean()
        line.save(update_fields=["in_kind", "in_kind_reason"])
        return

    if not line.in_kind:
        raise ValidationError(
            "A line has to be marked in-kind before it can be given a reason.",
        )

    _set_field(line, field, value)


def update_staff(
    budget: Budget,
    row_id: int,
    field: str,
    value: object,
    year: int | None,
) -> bool:
    try:
        staff_line = budget.staff_lines.get(id=row_id)
    except StaffCostLine.DoesNotExist:
        raise ValidationError("Staff cost line not found.")

    staff_line = cast(StaffCostLine, staff_line)

    fields_without_calculation = {
        "name_role",
    }

    fields_requiring_calculation = {
        "classification",
        "employment_type",
        "category",
        "time_basis",
        "in_kind",
        "in_kind_reason",
    }

    if field in fields_without_calculation:
        _set_field(staff_line, field, value)
        return False

    if field in fields_requiring_calculation:
        if field in {"in_kind", "in_kind_reason"}:
            _set_in_kind(staff_line, field, value)
        else:
            _set_field(staff_line, field, value)
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_allocation(staff_line, year, value)
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_non_staff(
    budget: Budget,
    row_id: int,
    field: str,
    value: object,
    year: int | None,
) -> bool:
    try:
        non_staff_line = budget.non_staff_lines.get(id=row_id)
    except NonStaffCostLine.DoesNotExist:
        raise ValidationError("Non-staff cost line not found.")

    non_staff_line = cast(NonStaffCostLine, non_staff_line)

    fields_without_calculation = {
        "description",
    }

    fields_requiring_calculation = {
        "in_kind",
        "in_kind_reason",
        "add_ten_percent",
        "indirect_rate_multiplier",
    }

    if field in fields_without_calculation:
        _set_field(non_staff_line, field, value)
        return False

    if field in fields_requiring_calculation:
        if field in {"in_kind", "in_kind_reason"}:
            _set_in_kind(non_staff_line, field, value)
        else:
            _set_field(non_staff_line, field, value)
        return True

    if field == "category":
        if not isinstance(value, str):
            raise ValidationError("Field 'category' must be a string.")

        try:
            category = NonStaffCostCategory.objects.get(pk=value)
        except NonStaffCostCategory.DoesNotExist:
            raise ValidationError("Invalid category.")

        non_staff_line.category = category
        _save(non_staff_line, ["category"])
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_amount(non_staff_line, year, value)
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_year_allocation(
    line: StaffCostLine,
    year: int,
    value: object,
) -> None:
    decimal_value = _validate_year_and_convert_value(line, year, value)

    # Delete the year value if it is cleared
    if decimal_value is None:
        YearAllocation.objects.filter(
            staff_line=line,
            year=year,
        ).delete()
        return

    # Validate time value according to time basis
    check_time(line.time_basis, decimal_value)

    # Get or create instance
    # Model validation
    try:
        allocation = YearAllocation.objects.get(
            staff_line=line,
            year=year,
        )
    except YearAllocation.DoesNotExist:
        allocation = YearAllocation(
            staff_line=line,
            year=year,
            time=decimal_value,
        )
    else:
        allocation.time = decimal_value

    allocation.full_clean()
    allocation.save()


def update_year_amount(
    line: NonStaffCostLine,
    year: int,
    value: object,
) -> None:
    decimal_value = _validate_year_and_convert_value(line, year, value)

    # Delete the year value if it is cleared
    if decimal_value is None:
        YearAmount.objects.filter(
            non_staff_line=line,
            year=year,
        ).delete()
        return

    # Get or create instance
    # Model validation
    try:
        amount = YearAmount.objects.get(
            non_staff_line=line,
            year=year,
        )
    except YearAmount.DoesNotExist:
        amount = YearAmount(
            non_staff_line=line,
            year=year,
            amount=decimal_value,
        )
    else:
        amount.amount = decimal_value

    amount.full_clean()
    amount.save()


def _validate_year_and_convert_value(
    line: StaffCostLine | NonStaffCostLine,
    year: int,
    value: object,
) -> Decimal | None:
    # Check in project duration
    project = line.budget.project

    if year < project.start_year or year > project.end_year:
        raise ValidationError(
            f"Year must be between {project.start_year} and {project.end_year}."
        )

    # Return None to delete the year value
    if value is None:
        return None

    # Check valid decimal value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"Value for {year} must be a valid number.")


def update_deliverable(
    budget: Budget,
    row_id: int,
    field: str,
    value: object,
) -> bool:
    try:
        deliverable = budget.deliverables.get(id=row_id)
    except Deliverable.DoesNotExist:
        raise ValidationError("Deliverable not found.")

    deliverable = cast(Deliverable, deliverable)

    fields_without_calculation = {
        "number",
        "description",
        "invoice_amount",
        "due_date",
        "dependency",
        "sponsor",
    }

    fields_requiring_calculation = set()

    if field in fields_without_calculation:
        _set_field(deliverable, field, value)
        return False

    if field in fields_requiring_calculation:
        _set_field(deliverable, field, value)
        return True

    if field == "deliverable_type":
        if not isinstance(value, str):
            raise ValidationError("Field 'deliverable_type' must be a string.")

        try:
            deliverable.deliverable_type = DeliverableType.objects.get(pk=value)
        except DeliverableType.DoesNotExist:
            raise ValidationError("Invalid deliverable type.")

        _save(deliverable, ["deliverable_type"])
        return False

    raise ValidationError(f"Field '{field}' cannot be updated.")


def _set_field(
    instance: Model,
    field: str,
    value: object,
) -> None:
    setattr(instance, field, _as_decimal(instance, field, value))
    instance.full_clean()
    _save(instance, [field])


def _as_decimal(instance: Model, field: str, value: object) -> object:
    """
    Convert a JSON number bound for a DecimalField through its string form.

    A float is not exactly the number that was typed: a margin of 0.35 arrives
    as 0.34999999999999997779553950749686919152736663818359375, which
    full_clean rejects for having more decimal places than the field allows.
    str() gives back what the user actually entered. Year values already take
    this route -- see _validate_year_and_convert_value.
    """
    if not isinstance(value, float):
        return value

    try:
        model_field = instance._meta.get_field(field)
    except FieldDoesNotExist:
        return value

    if not isinstance(model_field, models.DecimalField):
        return value

    try:
        return Decimal(str(value))
    except InvalidOperation:
        return value


def _save(instance: Model, fields: list[str]) -> None:
    """
    Save the named fields, and the row's edit time with them.

    auto_now is skipped for any field left out of update_fields, so a partial
    save would otherwise leave updated_at reading as the creation time no
    matter how much the row had changed.
    """
    if hasattr(instance, "updated_at"):
        fields = [*fields, "updated_at"]
    instance.save(update_fields=fields)
