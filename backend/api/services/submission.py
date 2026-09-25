from django.db import transaction

from api.calculation.pricing import calculate_dean_required
from api.models import (
    ApprovalStep,
    Budget,
    CalculationConstant,
)


@transaction.atomic
def submit_budget(budget: Budget) -> None:
    # Check if the submission requires approval from dean and head of department
    version_id = budget.lookup_version_id
    margin = budget.margin
    minimum_margin = CalculationConstant.objects.get(
        name="minimum_margin",
        version_id=version_id,
    ).value
    has_in_kind = (
        budget.staff_lines.filter(in_kind=True).exists()
        or budget.non_staff_lines.filter(in_kind=True).exists()
    )
    result = calculate_dean_required(margin, minimum_margin, has_in_kind)
    require_dean = result["dean_required"]
    triggers = result["dean_triggers"]

    # Create approval steps.
    # Always create step towards faculty
    ApprovalStep.objects.create(
        budget=budget,
        level=ApprovalStep.Level.FACULTY,
        status=ApprovalStep.Status.PENDING,
    )

    # Create step towards department if dean approval required
    ApprovalStep.objects.create(
        budget=budget,
        level=ApprovalStep.Level.DEPARTMENT,
        status=(
            ApprovalStep.Status.PENDING
            if require_dean
            else ApprovalStep.Status.NOT_REQUIRED
        ),
    )

    # Change status of the budget
    budget.status = Budget.Status.HOD_REVIEW
    budget.save(update_fields=["status"])

    # TODO: Notify HoD

    # TODO: Audit log
    del triggers
