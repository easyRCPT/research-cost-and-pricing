from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db.models import Model

from ..models import (
    Activity,
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    NonStaffCostCategory,
    NonStaffCostLine,
    OnCostRate,
    Region,
    SalaryRate,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)
from . import budget_details


def update_field(
    budget: Budget,
    data: dict,
) -> dict | None:
    # Update database
    section = data["section"]
    row_id = data.get("row_id")
    field = data["field"]
    value = data["value"]

    if section == "project":
        requires_calculation = update_project(budget, field, value)
    elif section == "budget":
        requires_calculation = update_budget(budget, field, value)
    elif section == "staff":
        if row_id is None:
            raise ValidationError("row_id is required for staff.")
        requires_calculation = update_staff(budget, row_id, field, value)
    elif section == "non_staff":
        if row_id is None:
            raise ValidationError("row_id is required for non_staff.")
        requires_calculation = update_non_staff(budget, row_id, field, value)
    elif section == "deliverable":
        if row_id is None:
            raise ValidationError("row_id is required for deliverable.")
        requires_calculation = update_deliverable(budget, row_id, field, value)
    else:
        raise ValueError(f"Invalid section: {section}")

    if requires_calculation:
        return budget_details.get_budget_details(budget)

    return None


def update_project(
    budget: Budget,
    field: str,
    value: object,
) -> bool:
    project = budget.project

    string_fields = {
        "title",
        "chief_investigator",
        "funder",
        "scheme",
        "additional_information",
    }

    integer_fields = {
        "start_year",
        "start_month",
        "end_year",
        "end_month",
    }

    if field in string_fields:
        _set_string_field(project, field, value)
        return False

    if field in integer_fields:
        _set_integer_field(project, field, value)
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
    string_fields = {
        "comments",
    }

    choice_fields = {
        "mode": Budget.Mode.values,
        "status": Budget.Status.values,
    }

    decimal_fields = {
        "cost_multiplier",
        "in_kind_multiplier",
        "cash_co_contribution",
    }

    boolean_fields = {
        "gst_applicable",
    }

    if field in string_fields:
        _set_string_field(budget, field, value)
        return False

    if field in choice_fields:
        _set_choice_field(budget, field, value, choice_fields[field])
        return field == "mode"

    if field in decimal_fields:
        _set_decimal_field(budget, field, value)
        return True

    if field in boolean_fields:
        _set_boolean_field(budget, field, value)
        return True

    raise ValidationError(f"Field '{field}' cannot be updated.")


def update_staff(
    budget: Budget,
    row_id: int,
    field: str,
    value: object,
) -> bool:
    try:
        staff_line = budget.staff_lines.get(id=row_id)
    except StaffCostLine.DoesNotExist:
        raise ValidationError("Staff cost line not found.")

    string_fields = {
        "name_role",
        "classification",
    }

    choice_fields = {
        "employment_type": OnCostRate.EmploymentType.values,
        "category": SalaryRate.Category.values,
        "time_basis": StaffCostLine.TimeBasis.values,
    }

    boolean_fields = {
        "in_kind",
    }

    if field in string_fields:
        _set_string_field(staff_line, field, value)
        return field != "name_role"

    if field in choice_fields:
        _set_choice_field(staff_line, field, value, choice_fields[field])
        return True

    if field in boolean_fields:
        _set_boolean_field(staff_line, field, value)
        return True

    # Year allocation
    update_year_value(staff_line, field, value)
    return True


def update_non_staff(
    budget: Budget,
    row_id: int,
    field: str,
    value: object,
) -> bool:
    try:
        non_staff_line = budget.non_staff_lines.get(id=row_id)
    except NonStaffCostLine.DoesNotExist:
        raise ValidationError("Non-staff cost line not found.")

    string_fields = {
        "description",
    }

    boolean_fields = {
        "in_kind",
        "add_ten_percent",
    }

    if field in string_fields:
        _set_string_field(non_staff_line, field, value)
        return True

    if field in boolean_fields:
        _set_boolean_field(non_staff_line, field, value)
        return True

    if field == "indirect_rate_multiplier":
        _set_decimal_field(non_staff_line, field, value, allow_null=True)
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

    # Year amount
    update_year_value(non_staff_line, field, value)
    return True


def update_year_value(
    line: StaffCostLine | NonStaffCostLine,
    field: str,
    value: object,
) -> None:
    # Check valid year
    try:
        year = int(field)
    except ValueError:
        raise ValidationError(f"Invalid field '{field}'.")

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

    # Check valid value
    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"Field '{field}' must be a valid decimal.")

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

    string_fields = {
        "description",
        "due_date",
        "sponsor",
    }

    if field in string_fields:
        _set_string_field(deliverable, field, value)
        return False

    if field == "number":
        _set_integer_field(deliverable, field, value)
        return False

    if field == "dependency":
        _set_integer_field(deliverable, field, value, allow_null=True)
        return False

    if field == "deliverable_type":
        if not isinstance(value, str):
            raise ValidationError("Field 'deliverable_type' must be a string.")

        try:
            deliverable_type = DeliverableType.objects.get(pk=value)
        except DeliverableType.DoesNotExist:
            raise ValidationError("Invalid deliverable type.")

        _set_field(deliverable, field, deliverable_type)
        return False

    if field == "invoice_amount":
        _set_decimal_field(deliverable, field, value, allow_null=True)
        return False

    raise ValidationError(f"Field '{field}' cannot be updated.")


def _set_string_field(
    instance: Model,
    field: str,
    value: object,
) -> None:
    if not isinstance(value, str):
        raise ValidationError(f"Field '{field}' must be a string.")

    _set_field(instance, field, value)


def _set_choice_field(
    instance: Model,
    field: str,
    value: object,
    choices: list[str],
) -> None:
    if not isinstance(value, str):
        raise ValidationError(f"Field '{field}' must be a string.")

    if value not in choices:
        raise ValidationError(f"Invalid {field}.")

    _set_field(instance, field, value)


def _set_integer_field(
    instance: Model,
    field: str,
    value: object,
    allow_null: bool = False,
) -> None:
    if value is None and allow_null:
        _set_field(instance, field, value)
        return

    if not isinstance(value, int):
        raise ValidationError(f"Field '{field}' must be an integer.")

    _set_field(instance, field, value)


def _set_decimal_field(
    instance: Model,
    field: str,
    value: object,
    allow_null: bool = False,
) -> None:
    if value is None and allow_null:
        _set_field(instance, field, value)
        return

    try:
        decimal_value = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"Field '{field}' must be a valid decimal.")

    _set_field(instance, field, decimal_value)


def _set_boolean_field(
    instance: Model,
    field: str,
    value: object,
) -> None:
    if not isinstance(value, bool):
        raise ValidationError(f"Field '{field}' must be a boolean.")

    _set_field(instance, field, value)


def _set_field(
    instance: Model,
    field: str,
    value: object,
) -> None:
    setattr(instance, field, value)
    instance.save(update_fields=[field])
