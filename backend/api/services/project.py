from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import (
    Case,
    CharField,
    DecimalField,
    Max,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce, Concat, Greatest, Lower, NullIf, Trim

from ..models import (
    Budget,
    CalculationConstant,
    Project,
    UserOrgAssignment,
)
from . import lookup_loader
from .auth import SUPERADMIN, groups_of
from .facets import emails_to_names, facets

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
    # In-kind staff are costed at the full cost recovery rate too (#149).
    "in_kind_multiplier": (
        "full_cost_recovery_multiplier",
        Decimal("1.70"),
        Decimal("0.01"),
    ),
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


# What the list sorts by, by column, and the annotation each reads.
SORTS = {
    "reference": "sort_reference",
    "title": "title",
    "department": "sort_department",
    "owner": "sort_owner",
    "status": "sort_status",
    "total_price_inc_gst": "sort_price",
    "updated_at": "last_activity",
}

# The status filter's value for a project with no budget left.
NO_BUDGET = "none"


def _current(budgets, field: str):
    # The budget build_row reports: the most recently touched of `budgets`.
    return Subquery(
        budgets.filter(project=OuterRef("pk"))
        .order_by("-updated_at", "-id")
        .values(field)[:1]
    )


def _narrowable(projects, budgets):
    """What `narrow` reads: the current budget's status, and the owner by name."""
    owner = Trim(Concat("created_by__first_name", Value(" "), "created_by__last_name"))
    return projects.annotate(
        current_status=_current(budgets, "status"),
        sort_owner=Lower(
            Coalesce(
                NullIf(owner, Value("")),
                "created_by__email",
                output_field=CharField(),
            )
        ),
    )


def listing(projects, budgets):
    """
    `projects` with what the list sorts and filters on, read off each one's
    current budget among `budgets`. Every sort key is non-null, as the cursor
    needs.
    """
    return (
        _narrowable(projects, budgets)
        .select_related("department__faculty", "created_by")
        .prefetch_related(Prefetch("budgets", queryset=budgets))
        .annotate(
            last_activity=Greatest(
                "updated_at", Coalesce(Max("budgets__updated_at"), "updated_at")
            ),
            sort_reference=Coalesce("reference", Value("")),
            sort_department=Coalesce("department__name", Value("")),
            sort_status=Case(
                *[
                    When(current_status=value, then=Value(str(label)))
                    for value, label in Budget.Status.choices
                ],
                default=Value("No budget"),
            ),
            sort_price=Coalesce(
                _current(budgets, "total_price_inc_gst"),
                Value(Decimal(0)),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
        )
    )


def user_listing(user):
    return listing(visible_projects(user), visible_budgets(user))


def narrow(
    projects,
    q: str = "",
    status: list[str] | None = None,
    faculty: list[str] | None = None,
    department: list[str] | None = None,
    owner: list[str] | None = None,
):
    """A listing narrowed to a search and any values each filter is given."""
    if q:
        projects = projects.filter(
            Q(title__icontains=q)
            | Q(reference__icontains=q)
            | Q(chief_investigator__icontains=q)
            | Q(funder__icontains=q)
            | Q(department__name__icontains=q)
            | Q(sort_owner__icontains=q)
            | Q(created_by__email__icontains=q)
        )
    if status:
        statuses = Q(current_status__in=status)
        if NO_BUDGET in status:
            statuses |= Q(current_status__isnull=True)
        projects = projects.filter(statuses)
    if faculty:
        projects = projects.filter(department__faculty__name__in=faculty)
    if department:
        projects = projects.filter(department__name__in=department)
    if owner:
        projects = projects.filter(created_by__email__in=owner)
    return projects


def filter_options(projects, budgets, query: dict) -> dict:
    """Every value each filter can take across `projects`, counted against `query`."""
    base = _narrowable(projects, budgets)
    return facets(
        lambda **narrowed: narrow(base, **narrowed),
        query,
        {
            "status": "current_status",
            "faculty": "department__faculty__name",
            "department": "department__name",
            "owner": "created_by__email",
        },
        none={"status": NO_BUDGET},
        labels={"owner": emails_to_names},
    )


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
        "total_price_inc_gst": (latest.total_price_inc_gst if latest else Decimal(0)),
        "updated_at": getattr(project, "last_activity", project.updated_at),
        # An approver's list has a different owner on every row (#98).
        "owner": {
            "id": project.created_by.id,
            "email": project.created_by.email,
            "name": project.created_by.get_full_name(),
        },
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
