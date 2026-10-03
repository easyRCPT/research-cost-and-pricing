"""The console's front door (#94): counts, the rate versions, recent activity."""

from django.contrib.auth.models import Group
from django.db.models import Count

from ..models import Budget, Faculty, User
from . import audit
from .admin_projects import with_current_status
from .lookup_update import version_rows, versions


def overview() -> dict:
    # Counted in the database, never by fetching a list and taking its length.
    groups = (
        Group.objects.values("name").annotate(accounts=Count("user")).order_by("name")
    )
    by_status = dict(
        with_current_status()
        .values("current_status")
        .annotate(n=Count("id"))
        .values_list("current_status", "n")
    )

    return {
        "accounts": {
            "total": User.objects.count(),
            "inactive": User.objects.filter(is_active=False).count(),
            "by_group": [{"group": g["name"], "count": g["accounts"]} for g in groups],
            "no_group": User.objects.filter(groups=None).count(),
        },
        "projects": {
            "total": sum(by_status.values()),
            # One row per status the model has, so a new status is a new row
            # here without a frontend edit.
            "by_status": [
                {"status": value, "label": label, "count": by_status.get(value, 0)}
                for value, label in Budget.Status.choices
            ],
            "faculties": Faculty.objects.filter(departments__project__isnull=False)
            .distinct()
            .count(),
        },
        # Option 3 on #94: nothing is scheduled under #52, so the panel that
        # showed scheduled rates shows the versions instead.
        "versions": {
            "total": versions().count(),
            "latest": version_rows(versions().order_by("-id")[:5]),
        },
        "recent": list(audit.entries()[:8]),
    }
