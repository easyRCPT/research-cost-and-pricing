import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .messages import Notification

logger = logging.getLogger(__name__)


def send(notification: Notification) -> None:
    """Render a notification and hand it to the mail backend settings picked. Failures are logged, never raised."""
    try:
        to = notification.recipients()
        subject = notification.subject()
        if not to:
            logger.warning("No recipients for email: %s", subject)
            return

        context = notification.context()
        email = EmailMultiAlternatives(
            subject=subject,
            body=render_to_string(f"email/{notification.template}.txt", context),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to,
        )
        email.attach_alternative(
            render_to_string(f"email/{notification.template}.html", context),
            "text/html",
        )
        email.send()
    except Exception:
        # Sent after commit, so a failure here must not fail the request.
        logger.exception("Failed to send %s", type(notification).__name__)
