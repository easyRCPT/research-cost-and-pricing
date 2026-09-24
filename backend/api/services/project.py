from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Max, Prefetch, Q
from django.db.models.functions import Greatest

from ..models import Budget, CalculationConstant, Project, UserOrgAssignment
from . import lookup_loader
from .auth import SUPERADMIN, groups_of

# What a budget's numbers start at. The live values are rows, not Python
# constants, so they are read at creation time and then frozen on the budget.
#
# Margin is here for the same reason the multipliers are: what a new budget
# starts at is a decision someone makes in the lookup editor, not one compiled
# into the model as a field default.
#
# Each carries the step it is stored at, because constants are kept at six
# decimal places and the budget's own columns are narrower -- a multiplier
# holds two, a margin four, so a raw 1.900000 is a digit too wide to save.
BUDGET_DEFAULTS = {
    "cost_multiplier": (
        "full_cost_recovery_multiplier",
        Decimal("1.70"),
        Decimal("0.01"),
    ),
    "in_kind_multiplier": ("in_kind_multiplier", Decimal("1.70"), Decimal("0.01")),
    "margin": ("default_margin", Decimal("0.30"), Decimal("0.0001")),
}


def budget_defaults() -> dict[str, Decimal]:
    # Filtered to the current version: a name exists once per version, so
    # reading them all would collapse several versions into one dict and take
    # whichever row happened to come last.
    values = dict(
        CalculationConstant.objects.filter(
            version_id=lookup_loader.current_version_id()
        ).values_list("name", "value")
    )
    return {
        field: Decimal(values.get(name, fallback)).quantize(
            step, rounding=ROUND_HALF_UP
        )
        for field, (name, fallback, step) in BUDGET_DEFAULTS.items()
    }


def visible_projects(user):
    """Projects you own, and any with a budget you may read."""
    return Project.objects.filter(
        Q(created_by=user) | Q(id__in=visible_budgets(user).values("project"))
    )


def visible_budgets(user):
    """
    Your own budgets, any status. A HoD also reads their department's and a Dean
    their faculty's, but only once submitted. The superadmin reads everything.
    """
    if SUPERADMIN in groups_of(user):
        return Budget.objects.all()

    Role = UserOrgAssignment.Role
    departments = user.org_assignments.filter(role=Role.HOD).values("department")
    faculties = user.org_assignments.filter(role=Role.DEAN).values("faculty")
    reviews = Q(project__department__in=departments) | Q(
        project__department__faculty__in=faculties
    )

    return Budget.objects.filter(
        Q(project__created_by=user) | (reviews & ~Q(status=Budget.Status.DRAFT))
    )


def list_projects(user) -> list[dict]:
    """One row per project, newest activity first."""
    # Prefetched so the whole list costs two queries rather than one per
    # project. Which budget is the latest is decided in build_row, not here.
    projects = (
        visible_projects(user)
        .select_related("department__faculty")
        .prefetch_related(Prefetch("budgets", queryset=visible_budgets(user)))
        .annotate(last_activity=Greatest("updated_at", Max("budgets__updated_at")))
        .order_by("-last_activity", "-id")
    )

    return [build_row(project) for project in projects]


def build_row(project: Project) -> dict:
    """
    A project as the list screen needs it.

    Status belongs to a budget and a project can carry several, so the row
    reports the most recently touched one and says how many there are. The
    price is read off that budget rather than calculated, which is the whole
    reason it is stored.
    """
    budgets = list(project.budgets.all())
    latest = max(
        budgets, key=lambda budget: (budget.updated_at, budget.id), default=None
    )

    return {
        "id": project.id,
        "reference": project.reference,
        "title": project.title,
        "chief_investigator": project.chief_investigator,
        "funder": project.funder,
        "department": project.department.name,
        "faculty": project.department.faculty.name,
        "start_year": project.start_year,
        "end_year": project.end_year,
        # Null only for a project whose budgets have all been deleted. The
        # list still has to render it, hence a row rather than a skip.
        "budget_id": latest.id if latest else None,
        "status": latest.status if latest else None,
        "budget_count": len(budgets),
        "total_price_exc_gst": (latest.total_price_exc_gst if latest else Decimal(0)),
        "updated_at": getattr(project, "last_activity", project.updated_at),
    }


@transaction.atomic
def create(data: dict, user) -> dict:
    """
    Make a project and the first budget on it.

    The two go together because a project with no budget has nothing to open:
    every editing route is budgets/<id>/.
    """
    project = Project(**data, created_by=user)
    project.full_clean()
    project.save()

    budget = Budget(project=project, **budget_defaults())
    budget.full_clean()
    budget.save()

    return build_row(project)
