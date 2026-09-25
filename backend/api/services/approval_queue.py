from django.db.models import Q

from api.models import ApprovalStep, Budget, User, UserOrgAssignment


def get_approval_steps(user: User) -> list[ApprovalStep]:
    """
    Return pending approval steps the user is authorised to action.

    HODs receive department steps for budgets in HOD review where they
    are assigned to the budget's department. Deans receive faculty
    steps for budgets in Dean review where they are assigned to the
    budget's faculty. Budget owners are excluded.
    """

    # Find department id and faculty id of the user
    assignments = UserOrgAssignment.objects.filter(
        user=user,
        role__in=[
            UserOrgAssignment.Role.HOD,
            UserOrgAssignment.Role.DEAN,
        ],
    )

    hod_department_ids = assignments.filter(
        role=UserOrgAssignment.Role.HOD,
    ).values_list("department_id", flat=True)

    dean_faculty_ids = assignments.filter(
        role=UserOrgAssignment.Role.DEAN,
    ).values_list("faculty_id", flat=True)

    steps = (
        ApprovalStep.objects.filter(
            # The step is pending
            status=ApprovalStep.Status.PENDING,
        )
        .filter(
            # The budget is at that step.
            # The caller holds the matching assignment.
            Q(
                level=ApprovalStep.Level.DEPARTMENT,
                budget__status=Budget.Status.HOD_REVIEW,
                budget__project__department_id__in=hod_department_ids,
            )
            | Q(
                level=ApprovalStep.Level.FACULTY,
                budget__status=Budget.Status.DEAN_REVIEW,
                budget__project__department__faculty_id__in=dean_faculty_ids,
            )
        )
        .exclude(
            # The caller is not the budget's owner.
            budget__project__created_by=user,
        )
        .select_related(
            "budget",
            "budget__project",
            "budget__project__department",
            "budget__project__department__faculty",
        )
    )

    return list(steps)
