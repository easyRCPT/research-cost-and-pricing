from typing import cast

from django.db import transaction

from api.exceptions import Conflict
from api.models import (
    Budget,
    Deliverable,
    NonStaffCostLine,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)


@transaction.atomic
def clone_budget(budget: Budget) -> Budget:
    """Clone a rejected budget into a new draft budget."""
    # Raise 409 if budget is not at the status rejected
    if budget.status != Budget.Status.REJECTED:
        raise Conflict("Only rejected budget can be cloned.")

    new_budget = Budget.objects.create(
        project=budget.project,
        status=Budget.Status.DRAFT,
        lookup_version=None,
        cloned_from=budget,
        cost_multiplier=budget.cost_multiplier,
        in_kind_multiplier=budget.in_kind_multiplier,
        margin=budget.margin,
        gst_applicable=budget.gst_applicable,
        cash_co_contribution=budget.cash_co_contribution,
        comments=budget.comments,
        justification=budget.justification,
        justification_notes=budget.justification_notes,
        dean_exemption_reason=budget.dean_exemption_reason,
    )

    _clone_staff_lines(budget, new_budget)
    _clone_non_staff_lines(budget, new_budget)
    _clone_deliverables(budget, new_budget)

    # TODO: Audit log

    return new_budget


def _clone_staff_lines(source_budget: Budget, target_budget: Budget) -> None:
    """Clone staff cost lines and their year allocations to a new budget."""
    staff_lines = StaffCostLine.objects.filter(
        budget=source_budget,
    ).prefetch_related("allocations")

    new_allocations: list[YearAllocation] = []

    for staff_line in staff_lines:
        new_staff_line = StaffCostLine.objects.create(
            budget=target_budget,
            name_role=staff_line.name_role,
            employment_type=staff_line.employment_type,
            category=staff_line.category,
            classification=staff_line.classification,
            time_basis=staff_line.time_basis,
            in_kind=staff_line.in_kind,
            in_kind_reason=staff_line.in_kind_reason,
        )

        for allocation in staff_line.allocations.all():
            allocation = cast(YearAllocation, allocation)

            new_allocations.append(
                YearAllocation(
                    staff_line=new_staff_line,
                    year=allocation.year,
                    time=allocation.time,
                )
            )

    YearAllocation.objects.bulk_create(new_allocations)


def _clone_non_staff_lines(source_budget: Budget, target_budget: Budget) -> None:
    """Clone non-staff cost lines and their year amounts to a new budget."""
    non_staff_lines = NonStaffCostLine.objects.filter(
        budget=source_budget,
    ).prefetch_related("amounts")

    new_amounts: list[YearAmount] = []

    for non_staff_line in non_staff_lines:
        new_non_staff_line = NonStaffCostLine.objects.create(
            budget=target_budget,
            category=non_staff_line.category,
            description=non_staff_line.description,
            in_kind=non_staff_line.in_kind,
            in_kind_reason=non_staff_line.in_kind_reason,
            add_ten_percent=non_staff_line.add_ten_percent,
            indirect_rate_multiplier=non_staff_line.indirect_rate_multiplier,
        )

        for amount in non_staff_line.amounts.all():
            amount = cast(YearAmount, amount)

            new_amounts.append(
                YearAmount(
                    non_staff_line=new_non_staff_line,
                    year=amount.year,
                    amount=amount.amount,
                )
            )

    YearAmount.objects.bulk_create(new_amounts)


def _clone_deliverables(source_budget: Budget, target_budget: Budget) -> None:
    """Clone deliverables to a new budget."""
    deliverables = Deliverable.objects.filter(
        budget=source_budget,
    ).select_related("deliverable_type")

    new_deliverables = [
        Deliverable(
            budget=target_budget,
            number=deliverable.number,
            description=deliverable.description,
            deliverable_type=deliverable.deliverable_type,
            invoice_amount=deliverable.invoice_amount,
            due_date=deliverable.due_date,
            dependency=deliverable.dependency,
            sponsor=deliverable.sponsor,
        )
        for deliverable in deliverables
    ]

    Deliverable.objects.bulk_create(new_deliverables)
