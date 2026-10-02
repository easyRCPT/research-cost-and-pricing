import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from api.models import (
    Budget,
    User,
    UserOrgAssignment,
)

logger = logging.getLogger(__name__)


# Same wording as the approvals screen (frontend/src/screens/approvals/triggers.ts).
TRIGGER_TEXT = {
    "margin_below_minimum": "The margin is below the University's minimum.",
    "in_kind_present": "The University is contributing costs in kind.",
}


def notify_hod_review(budget: Budget) -> None:
    """Notify HoDs that a budget requires review."""
    _send_email(
        recipients=_get_hod_emails(budget),
        subject=f"Approval needed: {_title(budget)}",
        template="budget_hod_review",
        context=_context(budget),
    )


def notify_dean_review(budget: Budget) -> None:
    """Notify Deans that a budget requires review."""
    _send_email(
        recipients=_get_dean_emails(budget),
        subject=f"Dean approval needed: {_title(budget)}",
        template="budget_dean_review",
        context=_context(
            budget,
            triggers=[TRIGGER_TEXT.get(code, code) for code in budget.dean_triggers],
        ),
    )


def notify_budget_decision(
    budget: Budget,
    *,
    decision: str,
    comment: str = "",
    approver: User,
) -> None:
    """Notify the budget owner after decision."""
    requires_dean_review = budget.status == Budget.Status.DEAN_REVIEW
    if decision == "reject":
        heading = "Rejected"
    elif requires_dean_review:
        heading = "Approved by your Head of Department"
    else:
        heading = "Approved"
    _send_email(
        recipients=_get_owner_emails(budget),
        subject=f"{heading}: {_title(budget)}",
        template="budget_decision",
        context=_context(
            budget,
            heading=heading,
            decision=decision,
            comment=comment,
            approver=approver,
            requires_dean_review=requires_dean_review,
        ),
    )


def notify_withdrawn(budget: Budget, *, levels: list[str]) -> None:
    """
    Tell the approvers it was waiting on that it has been withdrawn (#95), so
    nobody opens a costing that is no longer theirs to decide.
    """
    recipients: list[str] = []
    if "department" in levels:
        recipients += _get_hod_emails(budget)
    if "faculty" in levels:
        recipients += _get_dean_emails(budget)
    _send_email(
        recipients=sorted(set(recipients)),
        subject=f"Withdrawn: {_title(budget)}",
        template="budget_withdrawn",
        context=_context(budget),
    )


def get_url(budget: Budget) -> str:
    """The costing's approvals screen, where approvers decide and owners see the outcome."""
    return f"{settings.FRONTEND_URL}/projects/{budget.project_id}/approvals"


def _title(budget: Budget) -> str:
    return budget.project.title or "Untitled project"


def _context(budget: Budget, **extra) -> dict:
    return {
        "budget": budget,
        "project": budget.project,
        "title": _title(budget),
        "url": get_url(budget),
        **extra,
    }


def _send_email(
    *,
    recipients: list[str],
    subject: str,
    template: str,
    context: dict,
) -> None:
    """
    Send notification email.

    Email failures are logged only and must not affect business transactions.
    """

    if not recipients:
        logger.warning("No recipients for email: %s", subject)
        return

    try:
        text_content = render_to_string(f"email/{template}.txt", context)
        html_content = render_to_string(f"email/{template}.html", context)
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
        )
        email.attach_alternative(html_content, "text/html")
        email.send()

    except Exception:
        # Email failure must not affect committed approval decisions.
        logger.exception("Failed to send email: %s to %s", subject, recipients)


def _get_hod_emails(budget: Budget) -> list[str]:
    return list(
        User.objects.filter(
            org_assignments__role=UserOrgAssignment.Role.HOD,
            org_assignments__department=budget.project.department,
        )
        .values_list("email", flat=True)
        .distinct()
    )


def _get_dean_emails(budget: Budget) -> list[str]:
    return list(
        User.objects.filter(
            org_assignments__role=UserOrgAssignment.Role.DEAN,
            org_assignments__faculty=budget.project.department.faculty,
        )
        .values_list("email", flat=True)
        .distinct()
    )


def _get_owner_emails(budget: Budget) -> list[str]:
    return [budget.project.created_by.email]
