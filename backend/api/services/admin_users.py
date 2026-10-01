"""
Accounts, groups and approver assignments, for the console (#64).

The two refusals that matter live here rather than in the views:

- The last active superadmin cannot lose the group or be deactivated. Nothing
  in the tool resets a password or reaches the console another way, so that
  mistake could not be undone from inside it.
- An assignment whose scope does not fit its role is refused, not stored. The
  approval queue matches on exactly those columns, so a mis-scoped row would
  not be a lesser record, it would be one silently skipped for ever.

No account is ever deleted. A project's owner is PROTECTed, so deactivating is
the operation: the sign-in rejects them and their costings stay attributed.
"""

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet

from ..exceptions import Conflict, UnprocessableEntity
from ..models import Department, Faculty, User, UserOrgAssignment
from .audit import write_audit
from .auth import RESEARCHER, SUPERADMIN, groups_of

Role = UserOrgAssignment.Role


def users(q: str = "", active: bool | None = None) -> QuerySet[User]:
    found = User.objects.prefetch_related(
        "groups", "org_assignments__department", "org_assignments__faculty"
    ).order_by("last_name", "first_name", "email")
    if q:
        found = found.filter(
            Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
        )
    if active is not None:
        found = found.filter(is_active=active)
    return found


def _is_superadmin(user: User) -> bool:
    return user.groups.filter(name=SUPERADMIN).exists()


def _others_can_still_administer(user: User) -> bool:
    return (
        User.objects.filter(is_active=True, groups__name=SUPERADMIN)
        .exclude(id=user.id)
        .exists()
    )


def _set_groups(user: User, names: list[str]) -> None:
    groups = list(Group.objects.filter(name__in=names))
    unknown = sorted(set(names) - {g.name for g in groups})
    if unknown:
        raise UnprocessableEntity(f"No such group: {', '.join(unknown)}.")
    user.groups.set(groups)
    # In step with the group, so Django admin and the console never disagree
    # about who administers the tool. is_staff too: Django admin checks it, and
    # it is where faculties and departments are edited.
    admin = SUPERADMIN in names
    user.is_superuser = admin
    user.is_staff = admin
    user.save(update_fields=["is_superuser", "is_staff"])


@transaction.atomic
def create_user(actor: User, data: dict) -> User:
    email = User.objects.normalize_email(data["email"])
    if User.objects.filter(email__iexact=email).exists():
        raise Conflict(f"An account for {email} already exists.")
    user = User.objects.create_user(
        email=email,
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
    )
    _set_groups(user, data.get("groups", []))
    write_audit(
        actor=actor,
        action="admin.user.create",
        object_type="user",
        object_id=str(user.id),
        detail={"email": email, "groups": sorted(data.get("groups", []))},
    )
    return user


@transaction.atomic
def update_user(actor: User, user: User, data: dict) -> User:
    losing_admin = _is_superadmin(user) and (
        ("groups" in data and SUPERADMIN not in data["groups"])
        or data.get("is_active") is False
    )
    if losing_admin and not _others_can_still_administer(user):
        raise UnprocessableEntity(
            "This is the only active superadmin. Give another account the "
            "superadmin group first, or nobody will be able to reach the console."
        )

    before = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "groups": sorted(user.groups.values_list("name", flat=True)),
    }
    for field in ("first_name", "last_name", "is_active"):
        if field in data:
            setattr(user, field, data[field])
    user.save()
    if "groups" in data:
        _set_groups(user, data["groups"])

    # One entry per kind of change (#67), not one listing them all: who may
    # approve and who may reach the console are what the log is read for, and
    # a name fixed in the same save must not bury a permission change.
    entries = []
    names = {
        field: {"old": before[field], "new": data[field]}
        for field in ("first_name", "last_name")
        if field in data and data[field] != before[field]
    }
    if names:
        entries.append(("admin.user.update", names))
    if "is_active" in data and data["is_active"] != before["is_active"]:
        entries.append(
            (
                "admin.user.activate" if data["is_active"] else "admin.user.deactivate",
                {},
            )
        )
    if "groups" in data:
        after = sorted(set(data["groups"]))
        added = sorted(set(after) - set(before["groups"]))
        removed = sorted(set(before["groups"]) - set(after))
        if added or removed:
            entries.append(("admin.user.groups", {"added": added, "removed": removed}))
    for action, detail in entries:
        write_audit(
            actor=actor,
            action=action,
            object_type="user",
            object_id=str(user.id),
            detail={"email": user.email, **detail},
        )
    return user


def _scope(role: str, department: str | None, faculty: str | None):
    """The scope a role needs, or a 422 saying which part is wrong."""
    if role in (Role.MEMBER, Role.HOD):
        if not department or faculty:
            raise UnprocessableEntity(
                "A head of department or member is assigned to a department, not a faculty."
            )
        try:
            return Department.objects.get(code=department), None
        except Department.DoesNotExist:
            raise UnprocessableEntity(f"No such department: {department}.")
    if role == Role.DEAN:
        if not faculty or department:
            raise UnprocessableEntity(
                "A dean is assigned to a faculty, not a department."
            )
        try:
            return None, Faculty.objects.get(code=faculty)
        except Faculty.DoesNotExist:
            raise UnprocessableEntity(f"No such faculty: {faculty}.")
    raise UnprocessableEntity(f"No such role: {role}.")


@transaction.atomic
def add_assignment(
    actor: User, user: User, role: str, department: str | None, faculty: str | None
) -> UserOrgAssignment:
    if RESEARCHER in groups_of(user):
        raise UnprocessableEntity(
            "A researcher cannot approve for a unit. Move the account to staff first."
        )
    dept, fac = _scope(role, department, faculty)
    if UserOrgAssignment.objects.filter(
        user=user, role=role, department=dept, faculty=fac
    ).exists():
        raise UnprocessableEntity("That assignment already exists.")
    try:
        assignment = UserOrgAssignment.objects.create(
            user=user, role=role, department=dept, faculty=fac
        )
    except IntegrityError:
        raise UnprocessableEntity("That assignment already exists.")
    write_audit(
        actor=actor,
        action="admin.assignment.create",
        object_type="user",
        object_id=str(user.id),
        detail={
            "email": user.email,
            "role": role,
            "department": department,
            "faculty": faculty,
        },
    )
    return assignment


@transaction.atomic
def remove_assignment(actor: User, user: User, assignment_id: int) -> None:
    try:
        assignment = user.org_assignments.get(id=assignment_id)
    except UserOrgAssignment.DoesNotExist:
        raise UnprocessableEntity("That assignment does not belong to this account.")
    detail = {
        "email": user.email,
        "role": assignment.role,
        "department": assignment.department_id,
        "faculty": assignment.faculty_id,
    }
    assignment.delete()
    write_audit(
        actor=actor,
        action="admin.assignment.delete",
        object_type="user",
        object_id=str(user.id),
        detail=detail,
    )
