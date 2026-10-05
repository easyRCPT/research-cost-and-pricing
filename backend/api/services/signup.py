"""Self sign-up: the account waits unconfirmed until its owner clicks the emailed link."""

import time

from django.conf import settings
from django.contrib.auth.models import Group
from django.core import signing
from django.db import transaction
from rest_framework.request import Request

from api.models import User
from api.services.notification import notify_signup_confirmation

PENDING = "pending_signup"
_SALT = "api.signup.confirm"
_LINK_AGE = 60 * 60 * 48
_RESEND_AFTER = 30


def start_signup(request: Request, data: dict) -> User:
    """Create the unconfirmed account, email its link, and remember it on this browser."""
    with transaction.atomic():
        # Nobody could sign in to an unconfirmed account, so signing up again replaces it.
        User.objects.filter(email__iexact=data["email"], email_confirmed=False).delete()
        user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            email_confirmed=False,
        )
        # Exactly one, and never superadmin: nothing self-serves that.
        user.groups.set(Group.objects.filter(name=data["account_type"]))
        transaction.on_commit(lambda: _send_link(user))

    request.session[PENDING] = user.pk
    request.session[f"{PENDING}_sent"] = time.time()
    return user


def pending_user(request: Request) -> User | None:
    """The account this browser signed up and is waiting on, if any."""
    pk = request.session.get(PENDING)
    return User.objects.filter(pk=pk).first() if pk else None


def resend(request: Request, user: User) -> bool:
    """Send the link again, at most every 30 seconds. False when it is too soon."""
    if time.time() - request.session.get(f"{PENDING}_sent", 0) < _RESEND_AFTER:
        return False
    request.session[f"{PENDING}_sent"] = time.time()
    _send_link(user)
    return True


def finish(request: Request) -> None:
    """Forget the pending sign-up once its session has started."""
    request.session.pop(PENDING, None)
    request.session.pop(f"{PENDING}_sent", None)


def confirm(token: str) -> User | None:
    """Mark the token's account confirmed. None if the link is bad, expired or replaced."""
    try:
        pk = signing.loads(token, salt=_SALT, max_age=_LINK_AGE)
    except signing.BadSignature:
        return None
    user = User.objects.filter(pk=pk).first()
    if user is not None and not user.email_confirmed:
        user.email_confirmed = True
        user.save(update_fields=["email_confirmed"])
    return user


def _send_link(user: User) -> None:
    token = signing.dumps(user.pk, salt=_SALT)
    url = f"{settings.FRONTEND_URL}/signup/confirm?token={token}"
    notify_signup_confirmation(user, url=url)
