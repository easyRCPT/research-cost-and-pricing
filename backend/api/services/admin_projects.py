"""
Every project in the tool, for the console's register (#66).

Unscoped on purpose: /api/projects/ is the caller's own list, and a superadmin
asking "where is that project" needs everyone's.
"""

from django.db.models import Max, OuterRef, Q, QuerySet, Subquery
from django.db.models.functions import Greatest

from ..models import Budget, Project
from .project import build_row


def _current_status():
    # The same budget build_row reports: the most recently touched one.
    return Subquery(
        Budget.objects.filter(project=OuterRef("pk"))
        .order_by("-updated_at", "-id")
        .values("status")[:1]
    )


def with_current_status() -> QuerySet[Project]:
    return Project.objects.annotate(current_status=_current_status())


def register(status: str = "", q: str = "") -> list[dict]:
    projects = (
        with_current_status()
        .select_related("department__faculty", "created_by")
        .prefetch_related("budgets")
        .annotate(last_activity=Greatest("updated_at", Max("budgets__updated_at")))
        .order_by("-last_activity", "-id")
    )
    if status:
        projects = projects.filter(current_status=status)
    if q:
        projects = projects.filter(Q(title__icontains=q) | Q(reference__icontains=q))

    # The owner is on every project row now (#98); the register adds the
    # department's code, so a department's move can count its costings (#70).
    return [
        {**build_row(project), "department_code": project.department.code}
        for project in projects
    ]
