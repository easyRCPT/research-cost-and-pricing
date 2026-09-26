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


def notify_hod_review(budget: Budget) -> None:
    """Notify HoDs that a budget requires review."""
    _send_email(
        recipients=_get_hod_emails(budget),
        subject="Budget requires HOD review",
        template="budget_hod_review",
        context={
            "budget": budget,
            "url": get_url(),
        },
    )


def notify_dean_review(budget: Budget) -> None:
    """Notify Deans that a budget requires review."""
    _send_email(
        recipients=_get_dean_emails(budget),
        subject="Budget requires Dean review",
        template="budget_dean_review",
        context={
            "budget": budget,
            "triggers": budget.dean_triggers,
            "url": get_url(),
        },
    )


def notify_budget_decision(
    budget: Budget,
    *,
    decision: str,
    comment: str = "",
    approver: User,
) -> None:
    """Notify the budget owner after decision."""
    _send_email(
        recipients=_get_owner_emails(budget),
        subject="Budget approval updated",
        template="budget_decision",
        context={
            "budget": budget,
            "decision": decision,
            "comment": comment,
            "approver": approver,
            "requires_dean_review": budget.status == Budget.Status.DEAN_REVIEW,
            "url": get_url(),
        },
    )


# TODO: Add urls of approval step or RCPT to emails
def get_url() -> str:
    return ""


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
