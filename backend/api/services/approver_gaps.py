"""
Costings waiting on a role nobody holds, and the units missing an approver
(#121).

Routing stays strict (#79): a step reaches a queue only through a matching
assignment, so when nobody holds the role the costing waits. This is the same
filter as the queue, asked the other way round, so somebody can see the wait
and assign an approver. Assigning one needs nothing else: the step is already
pending, and it appears in the new holder's queue on their next fetch.
"""

from collections import defaultdict

from ..models import ApprovalStep, Budget, Department, Faculty, UserOrgAssignment


def _holders() -> tuple[dict[str, set[int]], dict[str, set[int]]]:
    """Active heads by department code, active deans by faculty code."""
    heads: dict[str, set[int]] = defaultdict(set)
    deans: dict[str, set[int]] = defaultdict(set)
    assignments = UserOrgAssignment.objects.filter(user__is_active=True).values_list(
        "role", "department_id", "faculty_id", "user_id"
    )
    for role, department, faculty, user in assignments:
        if role == UserOrgAssignment.Role.HOD:
            heads[department].add(user)
        elif role == UserOrgAssignment.Role.DEAN:
            deans[faculty].add(user)
    return heads, deans


def stranded() -> list[dict]:
    """
    Every costing in review whose current step nobody can decide: nobody
    active holds the role for its unit, or the only one who does is the
    costing's own owner, who may not approve their own (#79).
    """
    heads, deans = _holders()
    budgets = (
        Budget.objects.filter(
            status__in=(Budget.Status.HOD_REVIEW, Budget.Status.DEAN_REVIEW),
            approval_steps__status=ApprovalStep.Status.PENDING,
        )
        .select_related("project__department__faculty", "project__created_by")
        .distinct()
        .order_by("submitted_at", "id")
    )
    rows = []
    for budget in budgets:
        project = budget.project
        department = project.department
        if budget.status == Budget.Status.HOD_REVIEW:
            level, unit, holders = "department", department.name, heads[department.code]
        else:
            faculty = department.faculty
            level, unit, holders = "faculty", faculty.name, deans[faculty.code]
        if holders - {project.created_by_id}:
            continue
        rows.append(
            {
                "budget_id": budget.id,
                "project_id": project.id,
                "reference": project.reference,
                "title": project.title,
                "owner": project.created_by.email,
                "status": budget.status,
                "level": level,
                "unit": unit,
                "submitted_at": budget.submitted_at,
            }
        )
    return rows


def gaps() -> dict:
    """The stranded costings, and every unit with nobody to sign for it."""
    heads, deans = _holders()
    return {
        "stranded": stranded(),
        "departments_without_head": sorted(
            code
            for code in Department.objects.values_list("code", flat=True)
            if not heads[code]
        ),
        "faculties_without_dean": sorted(
            code
            for code in Faculty.objects.values_list("code", flat=True)
            if not deans[code]
        ),
    }
