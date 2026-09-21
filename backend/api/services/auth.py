"""
Who someone is, and which door they may come in through.

A group is the door: researcher, staff, superadmin, and nothing else (#40).
Being a head of department or a dean is not a group, because a group cannot
carry *which* department, so the client is told the assignments too and never
has to ask a second question to know whether someone approves anything.
"""

from django.contrib.auth.hashers import check_password, make_password

from ..models import User

SUPERADMIN = "superadmin"

# Hashing an unused password so that a login for an address nobody holds costs
# the same as one for an address somebody does. Without it the response time
# says which emails exist.
_ABSENT_USER_HASH = make_password("there is no user with this address")


def groups_of(user: User) -> list[str]:
    return sorted(group.name for group in user.groups.all())


def may_use_door(user: User, account_type: str) -> bool:
    """
    Whether this account signs in through the tab it was offered.

    A superadmin passes any door: it already passes every group check on every
    route, and the door is the same rule. Everyone else is matched literally,
    so a researcher cannot come in through Staff and be shown a reach they do
    not have.
    """
    groups = groups_of(user)
    return SUPERADMIN in groups or account_type in groups


def authenticate_by_email(email: str, password: str) -> User | None:
    """
    The user for these credentials, or None.

    None for every reason: no such address, wrong password, deactivated. The
    caller answers the same way to all of them, so which it was never leaves
    this function.
    """
    user = User.objects.filter(email__iexact=email.strip()).first()

    if user is None:
        # Spend the time anyway.
        check_password(password, _ABSENT_USER_HASH)
        return None

    if not user.check_password(password) or not user.is_active:
        return None

    return user


def me_for(user: User) -> dict:
    """Everything a guard needs, so the client makes one call and not three."""
    return {
        "user": {
            "id": user.pk,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        },
        "groups": groups_of(user),
        "assignments": [
            {
                "id": assignment.pk,
                "role": assignment.role,
                "department": assignment.department_id,
                "faculty": assignment.faculty_id,
            }
            for assignment in user.org_assignments.all()
        ],
    }
