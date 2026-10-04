from typing import cast

from django.db.models import QuerySet

from api.models import (
    Budget,
    NonStaffCostLine,
    StaffCostLine,
)


def validate_submission(budget: Budget) -> list[str]:
    """Return all reasons why a budget cannot currently be submitted."""
    reasons: list[str] = []

    project = budget.project

    # Project information
    if not project.title:
        reasons.append("Project title is required.")

    if not project.chief_investigator:
        reasons.append("Chief investigator is required.")

    if not project.funder:
        reasons.append("Funder is required.")
    elif project.funder.lower() == "other" and (
        not project.other_funder or not project.other_funder_category
    ):
        reasons.append("Specify other funder and category.")

    if project.department_id is None:
        reasons.append("Department is required.")

    if project.end_year is None or project.end_month is None:
        reasons.append("Project end date is required.")
    elif project.end_year < project.start_year or (
        project.end_year == project.start_year
        and project.end_month < project.start_month
    ):
        reasons.append(
            "The project end date must not be before the project start date."
        )

    # Budget information
    # Required fields in Budget are non-null by model definition
    # No additional checks are needed.

    # No check that the costing has any costs (#192): one with no staff or
    # non-staff costs can be submitted, and approval is where it is caught.

    # Staff lines
    _validate_staff_lines(
        cast(QuerySet[StaffCostLine], budget.staff_lines.all()),
        reasons,
    )
    # Non-staff lines
    _validate_non_staff_lines(
        cast(QuerySet[NonStaffCostLine], budget.non_staff_lines.all()),
        reasons,
    )

    return reasons


def _validate_staff_lines(
    lines: QuerySet[StaffCostLine],
    reasons: list[str],
) -> None:
    if not lines.exists():
        return

    for line in lines:
        if not line.name_role:
            reasons.append("Every staff cost line must have a name or role.")

        if not line.employment_type:
            reasons.append("Every staff cost line must have an employment type.")

        if not line.category:
            reasons.append("Every staff cost line must have a category.")

        if not line.classification:
            reasons.append("Every staff cost line must have a classification.")

        if not line.time_basis:
            reasons.append("Every staff cost line must have a time basis.")

        if line.in_kind and not line.in_kind_reason:
            reasons.append("Every in-kind staff cost line must have a reason.")


def _validate_non_staff_lines(
    lines: QuerySet[NonStaffCostLine],
    reasons: list[str],
) -> None:
    if not lines.exists():
        return

    for line in lines:
        if not line.category_id:
            reasons.append("Every non-staff cost line must have a category.")

        if line.in_kind and not line.in_kind_reason:
            reasons.append("Every in-kind non-staff cost line must have a reason.")
