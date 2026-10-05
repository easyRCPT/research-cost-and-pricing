from api.models import Budget, User, UserOrgAssignment


def hods(budget: Budget) -> list[str]:
    """Emails of the Heads of Department for the costing's department."""
    return _assigned(
        role=UserOrgAssignment.Role.HOD,
        org_assignments__department=budget.project.department,
    )


def deans(budget: Budget) -> list[str]:
    """Emails of the Deans for the costing's faculty."""
    return _assigned(
        role=UserOrgAssignment.Role.DEAN,
        org_assignments__faculty=budget.project.department.faculty,
    )


def owner(budget: Budget) -> list[str]:
    """Email of the researcher who created the project."""
    return [budget.project.created_by.email]


def _assigned(*, role: str, **org) -> list[str]:
    return list(
        User.objects.filter(org_assignments__role=role, **org)
        .values_list("email", flat=True)
        .distinct()
    )
