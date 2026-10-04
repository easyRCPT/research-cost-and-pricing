from decimal import Decimal
from typing import cast

from django.db import transaction

from api.models import (
    Budget,
    Deliverable,
    NonStaffCostLine,
    StaffCostLine,
    User,
    YearAllocation,
    YearAmount,
)
from api.services import lookup_loader
from api.services.audit import write_audit
from api.services.lookup_update import current_categories

from .budget_state import require_clonable


@transaction.atomic
def clone_budget(user: User, budget: Budget) -> Budget:
    """Clone a rejected or withdrawn budget into a new draft budget."""
    # Raise 409 unless the attempt ended without approval
    require_clonable(budget)

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
        currency=budget.currency,
        exchange_rate_override=_rate_to_carry(budget),
        comments=budget.comments,
        justification=budget.justification,
        justification_notes=budget.justification_notes,
        dean_exemption_reason=budget.dean_exemption_reason,
    )

    _clone_staff_lines(budget, new_budget)
    _clone_non_staff_lines(budget, new_budget)
    _clone_deliverables(budget, new_budget)

    write_audit(
        actor=user,
        action="budget.clone",
        object_type="budget",
        object_id=str(new_budget.id),
        detail={
            "cloned_from": budget.id,
            "after": {"status": new_budget.status},
        },
    )

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
    non_staff_lines = (
        NonStaffCostLine.objects.filter(budget=source_budget)
        .select_related("category")
        .prefetch_related("amounts")
    )

    new_amounts: list[YearAmount] = []
    # A new draft prices on the current rates, so its lines point at the
    # current version's categories, as repoint_drafts keeps every draft's do.
    current = current_categories()

    for non_staff_line in non_staff_lines:
        new_non_staff_line = NonStaffCostLine.objects.create(
            budget=target_budget,
            category_id=current.get(
                non_staff_line.category.ledger_id, non_staff_line.category_id
            ),
            description=non_staff_line.description,
            in_kind=non_staff_line.in_kind,
            in_kind_reason=non_staff_line.in_kind_reason,
            add_ten_percent=non_staff_line.add_ten_percent,
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


def _rate_to_carry(budget: Budget) -> Decimal | None:
    """
    The researcher's own rate goes with the new draft (#152). If the currency
    has since left the rates table, the draft keeps the rate the old attempt
    was priced at as its own, rather than having nothing to price at.
    """
    if budget.exchange_rate_override is not None or budget.currency == "AUD":
        return budget.exchange_rate_override
    current = lookup_loader.get_constants(lookup_loader.current_version_id())
    if budget.currency in current["currencies"]:
        return None
    return lookup_loader.constants_for(budget)["currencies"][budget.currency]
