from django.db import transaction

from ..models import Budget, StaffCostLine, YearAllocation
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    allocations = data.pop("allocations", [])

    staff_line = StaffCostLine(
        budget=budget,
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

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(budget: Budget, line: StaffCostLine) -> dict:
    line.delete()

    return budget_details.get_budget_details(budget)
