from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from api.exceptions import Conflict, UnprocessableEntity
from api.models import ApprovalStep, Budget, User, UserOrgAssignment


@transaction.atomic
def decide(
    user: User,
    step_id: int,
    decision: str,
    comment: str,
) -> None:
    """Approve or reject an approval step."""
    step = get_decidable_step(user, step_id)

    # Raise 422 if reject reason is not provided
    if decision == "reject" and not comment.strip():
        raise UnprocessableEntity("A comment is required when rejecting an approval.")

    budget = step.budget

    step.status = (
        ApprovalStep.Status.APPROVED
        if decision == "approve"
        else ApprovalStep.Status.REJECTED
    )
    step.decided_by = user
    step.decided_at = timezone.now()
    step.comment = comment
    step.save(
        update_fields=[
            "status",
            "decided_by",
            "decided_at",
            "comment",
        ],
    )

    if decision == "reject":
        budget.status = Budget.Status.REJECTED

        # Mark dean approval step as not required if rejected by HoD
        if step.level == ApprovalStep.Level.DEPARTMENT:
            ApprovalStep.objects.filter(
                budget=budget,
                level=ApprovalStep.Level.FACULTY,
                status=ApprovalStep.Status.PENDING,
            ).update(
                status=ApprovalStep.Status.NOT_REQUIRED,
            )
    elif step.level == ApprovalStep.Level.FACULTY:
        # Approved by dean
        budget.status = Budget.Status.APPROVED
    else:
        faculty_step = ApprovalStep.objects.get(
            budget=budget,
            level=ApprovalStep.Level.FACULTY,
        )

        # Approved by HoD, progress to dean review
        if faculty_step.status == ApprovalStep.Status.PENDING:
            budget.status = Budget.Status.DEAN_REVIEW
        # Mark budget as approved if HoD approves and dean review not required
        elif faculty_step.status == ApprovalStep.Status.NOT_REQUIRED:
            budget.status = Budget.Status.APPROVED
        else:
            raise Conflict("The approval workflow is in an invalid state.")

    budget.save(update_fields=["status"])

    # TODO: Audit log


def get_decidable_step(user: User, step_id: int) -> ApprovalStep:
    """
    Return a locked approval step if the user is authorised to decide it.
    The authorisation rules match the approval queue rules.
    """
    step = (
        ApprovalStep.objects.select_for_update()
        .select_related(
            "budget",
            "budget__project",
            "budget__project__department",
            "budget__project__department__faculty",
        )
        .get(id=step_id)
    )

    # Raise 409 if the step is not active
    # This can happen when two requests try to decide the same step concurrently.
    if step.status != ApprovalStep.Status.PENDING:
        raise Conflict("Approval step has already been decided.")

    budget = step.budget
    project = budget.project

    # Raise 403 if user don't have permission to decide
    if project.created_by_id == user.id:
        raise PermissionDenied(
            "You do not have permission to decide this approval step."
        )

    if step.level == ApprovalStep.Level.DEPARTMENT:
        if budget.status != Budget.Status.HOD_REVIEW:
            raise PermissionDenied(
                "You do not have permission to decide this approval step."
            )

        authorised = UserOrgAssignment.objects.filter(
            user=user,
            role=UserOrgAssignment.Role.HOD,
            department_id=project.department_id,
        ).exists()
    elif step.level == ApprovalStep.Level.FACULTY:
        if budget.status != Budget.Status.DEAN_REVIEW:
            raise PermissionDenied(
                "You do not have permission to decide this approval step."
            )

        authorised = UserOrgAssignment.objects.filter(
            user=user,
            role=UserOrgAssignment.Role.DEAN,
            faculty_id=project.department.faculty_id,
        ).exists()
    else:
        raise PermissionDenied(
            "You do not have permission to decide this approval step."
        )

    if not authorised:
        raise PermissionDenied(
            "You do not have permission to decide this approval step."
        )

    return step
