"""
The owner pulls a costing back out of review (#95).

Submission in reverse, in one transaction. The withdrawn attempt is kept as it
was, read-only like a rejected one: what was in front of an approver is the
only copy of what was submitted. The way forward is a new draft cloned from it
(budget_clone), exactly as after a rejection.
"""

from django.db import transaction

from ..exceptions import Conflict
from ..models import ApprovalStep, Budget, User
from .audit import write_audit
from .budget_state import require_ownership
from .notification import notify_withdrawn

IN_REVIEW = (Budget.Status.HOD_REVIEW, Budget.Status.DEAN_REVIEW)


@transaction.atomic
def withdraw_budget(user: User, budget: Budget) -> None:
    # Only the owner. An approver who wants it gone rejects it, which is a
    # decision with their name on it.
    require_ownership(user, budget)

    # The steps first, as a decision locks them (approval_decide), so a
    # withdrawal and a decision on the same costing queue for one another
    # rather than deadlock. Whichever goes second sees what the first did.
    steps = list(
        ApprovalStep.objects.select_for_update().filter(budget=budget).order_by("id")
    )
    # Locked, then read again: the status may have moved since the caller
    # loaded it, and the caller's own copy is the one left current.
    Budget.objects.select_for_update().only("id").get(pk=budget.pk)
    budget.refresh_from_db(fields=["status"])
    if budget.status not in IN_REVIEW:
        raise Conflict(
            f"Budget {budget.id} is {budget.get_status_display().lower()} "
            "and cannot be withdrawn: only a costing in review can be."
        )

    pending = [step for step in steps if step.status == ApprovalStep.Status.PENDING]
    waiting_on = [step.level for step in pending]
    cancelled = [step.id for step in pending]
    # Not a new state: not_required already means "nobody is waiting to decide
    # this", and its check constraint keeps the decider and time empty. A step
    # already approved keeps its decision: it happened.
    ApprovalStep.objects.filter(id__in=cancelled).update(
        status=ApprovalStep.Status.NOT_REQUIRED
    )

    before = budget.status
    budget.status = Budget.Status.WITHDRAWN
    budget.save(update_fields=["status"])

    write_audit(
        actor=user,
        action="budget.withdraw",
        object_type="budget",
        object_id=str(budget.id),
        detail={
            "before": {"status": before},
            "after": {"status": budget.status},
            "steps_cancelled": cancelled,
        },
    )

    # After commit: an approver told it is withdrawn must not find it still
    # in their queue because the transaction later rolled back.
    transaction.on_commit(lambda: notify_withdrawn(budget, levels=waiting_on))
