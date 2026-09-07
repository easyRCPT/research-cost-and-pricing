# TODO: temporary. Delete this file when auth lands and get_budget_details
# takes over again.
"""Stateless calculator: the budget arrives in the request body, nothing is saved."""

from rest_framework.exceptions import ValidationError

from ..models import build_account_string
from . import budget_details, lookup_loader

STAFF_INFO_FIELDS = (
    "name_role",
    "employment_type",
    "category",
    "classification",
    "time_basis",
    "in_kind",
)

NON_STAFF_INFO_FIELDS = (
    "cost_group",
    "expense_type",
    "description",
    "in_kind",
    "add_ten_percent",
    "indirect_rate_multiplier",
)


def calculate(payload: dict) -> dict:
    """Calculate one budget from the request body. Writes nothing."""
    constants = lookup_loader.get_constants()

    try:
        return budget_details.build_budget_details(
            constants,
            build_budget_data(payload),
        )
    except (KeyError, IndexError) as error:
        # Unsaved rows can carry a category/classification pair with no rate.
        raise ValidationError(
            f"No salary rate for one of the staff rows: {error}."
        ) from error


def build_budget_data(payload: dict) -> dict:
    """Turn the request body into the dicts data_loader builds from model rows."""
    project_info = {
        **payload["project_info"],
        "account_string": build_account_string(
            payload["project_info"]["company"],
            payload["project_info"]["cost_centre"],
            payload["project_info"]["activity"],
            payload["project_info"]["region"],
        ),
    }

    project_duration = {
        "start_year": project_info["start_year"],
        "start_month": project_info["start_month"],
        "end_year": project_info["end_year"],
        "end_month": project_info["end_month"],
    }

    staff_lines = payload["staff_lines"]
    staff_table = {
        "info_table": build_info_table(staff_lines, STAFF_INFO_FIELDS),
        "numeric_table": build_numeric_table(staff_lines, "time"),
    }

    non_staff_lines = payload["non_staff_lines"]
    non_staff_table = {
        "info_table": build_info_table(non_staff_lines, NON_STAFF_INFO_FIELDS),
        "numeric_table": build_numeric_table(non_staff_lines, "amount"),
    }

    return {
        "project_info": project_info,
        "project_duration": project_duration,
        "staff_table": staff_table,
        "non_staff_table": non_staff_table,
        "budget_info": payload["budget_info"],
    }


def build_info_table(lines: list[dict], fields: tuple[str, ...]) -> dict:
    return {line["id"]: {field: line[field] for field in fields} for line in lines}


def build_numeric_table(lines: list[dict], value_field: str) -> dict:
    return {
        line["id"]: {entry["year"]: entry[value_field] for entry in line["by_year"]}
        for line in lines
    }
