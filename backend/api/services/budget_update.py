from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import cast
from uuid import UUID

from django.core.exceptions import FieldDoesNotExist
from django.db import models, transaction
from django.db.models import Model
from rest_framework.exceptions import ValidationError

from api.models import (
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

from . import classification, lookup_loader
from .budget_details import exchange_rate_for, get_budget_details
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

    if field in {"currency", "exchange_rate_override"}:
        _set_currency(budget, field, value)
        return True

    # Said in its own words rather than as the generic refusal below, because
    # this one is a rule rather than a typo. Both multipliers are the
    # University's full cost recovery rate, set by an administrator as a
    # lookup rate (#149). The cost is the cost (#97): a budget changes its
    # price through the margin, which is also what routes it to a Dean.
    if field in {"cost_multiplier", "in_kind_multiplier"}:
        raise ValidationError(
            "The cost multiplier is the University's full cost recovery rate "
            "and is not editable per budget."
        )

    raise ValidationError(f"Field '{field}' cannot be updated.")


def _set_currency(budget: Budget, field: str, value: object) -> None:
    """
    Price the costing in another currency, or at the researcher's own rate
    (#152).

    Non-staff amounts, the cash co-contribution and deliverable invoices are
    entered in the costing's currency, so when the currency or its rate
    changes they move with it and keep their AUD value: back to AUD at the
    old rate, on at the new one. That is what the workbook's macro sets out
    to do on a currency change (update_to_aud_nonstaff_costs, then
    update_to_foreign_nonstaff_costs). Staff costs need nothing: the engine
    converts them from AUD on every pricing.
    """
    constants = lookup_loader.constants_for(budget)
    before = exchange_rate_for(
        budget.currency, budget.exchange_rate_override, constants
    )

    if field == "currency":
        if not isinstance(value, str) or value not in constants["currencies"]:
            raise ValidationError({"currency": [f"There is no currency '{value}'."]})
        budget.currency = value
        # A new currency starts at the table's rate, as the workbook's does:
        # a rate typed for the old currency means nothing for the new one.
        budget.exchange_rate_override = None
    else:
        if budget.currency == "AUD" and value is not None:
            raise ValidationError(
                {
                    "exchange_rate_override": [
                        "An AUD costing has no exchange rate to set."
                    ]
                }
            )
        budget.exchange_rate_override = _as_decimal(
            budget, "exchange_rate_override", value
        )

    budget.full_clean()
    after = exchange_rate_for(budget.currency, budget.exchange_rate_override, constants)
    _save(budget, ["currency", "exchange_rate_override"])
    if after != before:
        _convert_entered_amounts(budget, after / before)


def _convert_entered_amounts(budget: Budget, factor: Decimal) -> None:
    """Every amount entered in the costing's currency, at a new rate."""

    def moved(amount: Decimal) -> Decimal:
        return (amount * factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    amounts = list(YearAmount.objects.filter(non_staff_line__budget=budget))
    for year_amount in amounts:
        year_amount.amount = moved(year_amount.amount)
    YearAmount.objects.bulk_update(amounts, ["amount"])

    deliverables = list(budget.deliverables.exclude(invoice_amount=None))
    for deliverable in deliverables:
        deliverable.invoice_amount = moved(deliverable.invoice_amount)
    Deliverable.objects.bulk_update(deliverables, ["invoice_amount"])

    budget.cash_co_contribution = moved(budget.cash_co_contribution)
    budget.save(update_fields=["cash_co_contribution"])


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
        _save(line, ["in_kind", "in_kind_reason"])
        return

    if not line.in_kind:
        raise ValidationError(
            "A line has to be marked in-kind before it can be given a reason.",
        )

    _set_field(line, field, value)


def _set_ci(budget: Budget, line: StaffCostLine, value: object) -> None:
    """
    Mark the chief investigator's line (#166). At most one per budget, so
    marking a line takes the mark from any other.
    """
    if not isinstance(value, bool):
        raise ValidationError("is_ci must be true or false.")
    if value:
        budget.staff_lines.exclude(id=line.id).filter(is_ci=True).update(is_ci=False)
    line.is_ci = value
    _save(line, ["is_ci"])


def update_staff(
    budget: Budget,
    row_id: UUID,
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
        "position",
    }

    if field == "is_ci":
        _set_ci(budget, staff_line, value)
        return False

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
            # Validate category and classification before update
            # Other fields are validated through model validation
            if field == "classification":
                classification.validate_with_budget(
                    budget, staff_line.category, str(value)
                )
            if field == "category":
                classification.validate_with_budget(
                    budget, str(value), staff_line.classification
                )

            _set_field(staff_line, field, value)
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_allocation(staff_line, year, value)
        _save(staff_line, [])
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def refuse_ten_percent(category: NonStaffCostCategory) -> None:
    """
    Contingency, Student Support and Shared Grant Payments never take the
    additional 10% (#148): contingency is a flat row in the workbook, and its
    macro forces the 10% off for the other two. The engine ignores it on them
    anyway, so a tick there would only claim an uplift that isn't charged.
    """
    if category.excludes_additional_rate:
        raise ValidationError(
            {
                "add_ten_percent": [
                    f"{category.cost_category} doesn't take the additional 10%."
                ]
            }
        )


def update_non_staff(
    budget: Budget,
    row_id: UUID,
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
        "position",
    }

    fields_requiring_calculation = {
        "in_kind",
        "in_kind_reason",
        "add_ten_percent",
    }

    if field in fields_without_calculation:
        _set_field(non_staff_line, field, value)
        return False

    if field in fields_requiring_calculation:
        if field in {"in_kind", "in_kind_reason"}:
            _set_in_kind(non_staff_line, field, value)
        else:
            if field == "add_ten_percent" and value is True:
                refuse_ten_percent(non_staff_line.category)
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
        changed = ["category"]
        # Moved onto a category that never takes the 10%: the tick goes with
        # it, rather than sitting on the line doing nothing (#148).
        if category.excludes_additional_rate and non_staff_line.add_ten_percent:
            non_staff_line.add_ten_percent = False
            changed.append("add_ten_percent")
        _save(non_staff_line, changed)
        return True

    if field == "year_value":
        if year is None:
            raise ValidationError("year is required for year_value.")
        update_year_amount(non_staff_line, year, value)
        _save(non_staff_line, [])
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

    end_year = project.end_year or project.start_year
    if year < project.start_year or year > end_year:
        raise ValidationError(
            f"Year must be between {project.start_year} and {end_year}."
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
