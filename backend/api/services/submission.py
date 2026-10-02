from django.db import transaction
from django.utils import timezone

from api.calculation.pricing import calculate_dean_required
from api.models import (
    ApprovalStep,
    Budget,
    CalculationConstant,
    LookupConfiguration,
    User,
)
from api.services.audit import write_audit
from api.services.notification import notify_hod_review


@transaction.atomic
def submit_budget(actor: User, budget: Budget) -> None:
    # The rates this budget is priced with from here on (#57). Locked so an edit
    # cannot land between reading the version and stamping it.
    config = LookupConfiguration.objects.select_for_update().get(pk=1)
    version_id = config.current_version_id
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

    # The head of department always signs; the dean only when a trigger fired.
    #
    # These were the other way round, and each half passed its own tests: the
    # department step came out not_required and the faculty step pending. The
    # queue shows department steps during hod_review and decide treats the
    # faculty step as the optional one, so a budget needing no dean reached
    # nobody's queue and could never be approved (test_approval_flow).
    ApprovalStep.objects.create(
        budget=budget,
        level=ApprovalStep.Level.DEPARTMENT,
        status=ApprovalStep.Status.PENDING,
    )
    ApprovalStep.objects.create(
        budget=budget,
        level=ApprovalStep.Level.FACULTY,
        status=(
            ApprovalStep.Status.PENDING
            if require_dean
            else ApprovalStep.Status.NOT_REQUIRED
        ),
    )

    # Change status of the budget
    budget.dean_triggers = triggers
    budget.status = Budget.Status.HOD_REVIEW
    budget.submitted_at = timezone.now()
    # Stamped here, not at each decision. What the approvers sign is what was
    # submitted: stamping at decide let an edit between the head of
    # department's approval and the dean's re-stamp the budget, so the dean
    # signed a different price from the one the head of department had.
    budget.lookup_version_id = version_id
    budget.save(
        update_fields=["dean_triggers", "status", "submitted_at", "lookup_version"]
    )

    # And the version is now in use, so the next edit copies it rather than
    # writing into it. Left False until the first decision, an edit made while
    # the budget waited on the head of department changed the very rows it read.
    config.referenced = True
    config.save(update_fields=["referenced"])

    transaction.on_commit(lambda: notify_hod_review(budget))

    write_audit(
        actor=actor,
        action="budget.submit",
        object_type="budget",
        object_id=str(budget.id),
        detail={
            "after": {"status": budget.status},
            "triggers": triggers,
        },
    )
