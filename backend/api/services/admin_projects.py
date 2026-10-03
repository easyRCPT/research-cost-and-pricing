"""
Every project in the tool, for the console's register (#66).

Unscoped on purpose: /api/projects/ is the caller's own list, and a superadmin
asking "where is that project" needs everyone's.
"""

from django.db.models import OuterRef, QuerySet, Subquery

from ..models import Budget, Project
from .project import build_row, listing


def _current_status():
    # The same budget build_row reports: the most recently touched one.
    return Subquery(
        Budget.objects.filter(project=OuterRef("pk"))
        .order_by("-updated_at", "-id")
        .values("status")[:1]
    )


def with_current_status() -> QuerySet[Project]:
    return Project.objects.annotate(current_status=_current_status())


def register():
    return listing(Project.objects.all(), Budget.objects.all())


def row(project: Project) -> dict:
    # The owner is on every project row now (#98); the register adds the
    # department's code, so a department's move can count its costings (#70).
    return {**build_row(project), "department_code": project.department_id or ""}
