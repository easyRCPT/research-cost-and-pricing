"""
What the budget's own screens show about its review.

The approval steps belong to the budget, so its detail response carries them:
the Approvals screen renders who decided, what, when and why, and for a step
still open, who it is waiting on. No signature is collected anywhere -- the
signed-in account, the decision and the server's timestamp are the record
(#83).
"""

from ..models import ApprovalStep, Budget, UserOrgAssignment

# Department is decided before faculty, so that is the order they read in.
LEVEL_ORDER = {ApprovalStep.Level.DEPARTMENT: 0, ApprovalStep.Level.FACULTY: 1}


def _name(user) -> str:
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.email


def _waiting_on(budget: Budget, step: ApprovalStep) -> list[str]:
    """
    Everyone who could decide this step now.

    Empty is a real answer: nobody holds the role for that unit, so the step
    reaches no queue (#121). The owner is left out, because nobody approves
    their own budget.
    """
    department = budget.project.department
    if step.level == ApprovalStep.Level.DEPARTMENT:
        holders = UserOrgAssignment.objects.filter(
            role=UserOrgAssignment.Role.HOD, department=department
        )
    else:
        holders = UserOrgAssignment.objects.filter(
            role=UserOrgAssignment.Role.DEAN, faculty=department.faculty
        )
    return sorted(
        _name(a.user)
        for a in holders.select_related("user")
        if a.user.is_active and a.user_id != budget.project.created_by_id
    )


def approval_record(budget: Budget) -> dict:
    steps = sorted(
        budget.approval_steps.select_related("decided_by"),
        key=lambda step: LEVEL_ORDER.get(step.level, 99),
    )
    return {
        "submitted_at": budget.submitted_at,
        # The rates it was priced on, stamped at submit. What an approver signs
        # is this version, whatever the rates have become since.
        "lookup_version": budget.lookup_version_id,
        # Frozen at submit, so it says what the approvers were asked about
        # even if the rates behind the live figure have moved since.
        "dean_triggers": list(budget.dean_triggers or []),
        "steps": [
            {
                "id": step.id,
                "level": step.level,
                "status": step.status,
                "decided_by": _name(step.decided_by) if step.decided_by else None,
                "decided_at": step.decided_at,
                "comment": step.comment,
                "waiting_on": (
                    _waiting_on(budget, step)
                    if step.status == ApprovalStep.Status.PENDING
                    else []
                ),
            }
            for step in steps
        ],
    }


EMPTY_RECORD = {
    "submitted_at": None,
    "lookup_version": None,
    "dean_triggers": [],
    "steps": [],
}
