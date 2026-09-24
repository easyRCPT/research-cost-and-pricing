"""
What may be written, and when.

A budget stops being editable the moment it leaves draft. Everything past that
point is either under review or is the record of a decision: an approver has to
be able to read a costing knowing it cannot change while they read it, and a
rejected attempt is the only copy of what was actually turned down (#81).
"""

from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied

from ..models import Budget


class Conflict(APIException):
    """
    409 rather than 403.

    403 says *you* may not do this; 409 says nobody may, in this state. The
    frontend renders them differently, one as a permission problem and the
    other as a read-only screen, so the distinction has to reach it.
    """

    status_code = status.HTTP_409_CONFLICT
    default_code = "conflict"


def require_draft(budget: Budget) -> None:
    if budget.status != Budget.Status.DRAFT:
        raise Conflict(
            f"Budget {budget.id} is {budget.get_status_display().lower()} "
            f"and cannot be edited.",
        )


def require_editable(user, budget: Budget) -> None:
    """Only if is owner and a draft can a budget be edited"""
    if budget.project.created_by_id != user.pk:
        raise PermissionDenied("Only the person who created this budget can edit it")
    require_draft(budget)
