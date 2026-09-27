from django.db import transaction
from django.db.models import Max

from ..models import Budget, StaffCostLine, YearAllocation
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    allocations = data.pop("allocations", [])

    last = budget.staff_lines.aggregate(Max("position"))["position__max"]
    staff_line = StaffCostLine(
        budget=budget,
        position=0 if last is None else last + 1,
        **data,
    )
    staff_line.full_clean()
    staff_line.save()

    year_allocations = [
        YearAllocation(
            staff_line=staff_line,
            **allocation,
        )
        for allocation in allocations
    ]

    for year_allocation in year_allocations:
        year_allocation.full_clean()

    YearAllocation.objects.bulk_create(year_allocations)

    budget.touch()

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(budget: Budget, line: StaffCostLine) -> dict:
    line.delete()

    budget.touch()

    return budget_details.get_budget_details(budget)
