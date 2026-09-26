"""
What may be written, and when.

A budget stops being editable the moment it leaves draft. Everything past that
point is either under review or is the record of a decision: an approver has to
be able to read a costing knowing it cannot change while they read it, and a
rejected attempt is the only copy of what was actually turned down (#81).
"""

from rest_framework.exceptions import PermissionDenied

from ..exceptions import Conflict
from ..models import Budget


def require_draft(budget: Budget) -> None:
    if budget.status != Budget.Status.DRAFT:
        raise Conflict(
            f"Budget {budget.id} is {budget.get_status_display().lower()} "
            f"and cannot be edited.",
        )


def require_rejected(budget: Budget) -> None:
    if budget.status != Budget.Status.REJECTED:
        raise Conflict(
            f"Budget {budget.id} is {budget.get_status_display().lower()} "
            f"and cannot be cloned.",
        )


def require_ownership(user, budget: Budget) -> None:
    if budget.project.created_by_id != user.pk:
        raise PermissionDenied("Only the person who created this budget can edit it")


def require_editable(user, budget: Budget) -> None:
    """Only if is owner and a draft can a budget be edited"""
    require_ownership(user, budget)
    require_draft(budget)
