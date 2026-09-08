from decimal import Decimal, InvalidOperation
from typing import cast

from django.db import transaction
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
from . import budget_details

MAX_VALUE_BY_TIME_BASIS = {
    "FTE": Decimal(1),
    "Daily": Decimal(220),
    "Hourly": Decimal(366 * 24),
}


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
        return budget_details.get_budget_details(budget)

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

        project.save(update_fields=["department"])
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

        project.save(update_fields=["activity"])
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

        project.save(update_fields=["region"])
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
        "status",
    }

    fields_requiring_calculation = {
        "mode",
        "cost_multiplier",
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

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_staff(
    budget: Budget, row_id: int, field: str, value: object, year: int | None
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
    }

    if field in fields_without_calculation:
        _set_field(staff_line, field, value)
        return False

    if field in fields_requiring_calculation:
        _set_field(staff_line, field, value)
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_value(staff_line, year, value)
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_non_staff(
    budget: Budget, row_id: int, field: str, value: object, year: int | None
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
        "add_ten_percent",
        "indirect_rate_multiplier",
    }

    if field in fields_without_calculation:
        _set_field(non_staff_line, field, value)
        return False

    if field in fields_requiring_calculation:
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
        non_staff_line.save(update_fields=["category"])
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_value(non_staff_line, year, value)
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_year_value(
    line: StaffCostLine | NonStaffCostLine,
    year: int,
    value: object,
) -> None:
    project = line.budget.project

    # Check in project duration
    if year < project.start_year or year > project.end_year:
        raise ValidationError(
            f"Year must be between {project.start_year} and {project.end_year}."
        )

    # Delete the year value if it is cleared
    if value is None:
        if isinstance(line, StaffCostLine):
            YearAllocation.objects.filter(
                staff_line=line,
                year=year,
            ).delete()
        else:
            YearAmount.objects.filter(
                non_staff_line=line,
                year=year,
            ).delete()

        return

    # Check valid decimal value
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"Year '{year}' must be a valid number.")

    validate_year_value(line, decimal_value)

    # Update or create
    if isinstance(line, StaffCostLine):
        YearAllocation.objects.update_or_create(
            staff_line=line,
            year=year,
            defaults={"time": decimal_value},
        )
    else:
        YearAmount.objects.update_or_create(
            non_staff_line=line,
            year=year,
            defaults={"amount": decimal_value},
        )


def validate_year_value(
    line: StaffCostLine | NonStaffCostLine,
    value: Decimal,
) -> None:
    if isinstance(line, StaffCostLine):
        max_value = MAX_VALUE_BY_TIME_BASIS[line.time_basis]

        if value > max_value:
            raise ValidationError(
                f"value must be smaller than {max_value} for time basis '{line.time_basis}'."
            )


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

        deliverable.save(update_fields=["deliverable_type"])
        return False

    raise ValidationError(f"Field '{field}' cannot be updated.")


def _set_field(
    instance: Model,
    field: str,
    value: object,
) -> None:
    setattr(instance, field, value)
    instance.full_clean()
    instance.save(update_fields=[field])
