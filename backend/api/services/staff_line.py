from django.db import transaction

from ..models import Budget, StaffCostLine, YearAllocation
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    allocations = data.pop("allocations", [])

    staff_line = StaffCostLine.objects.create(
        budget=budget,
        **data,
    )

    YearAllocation.objects.bulk_create(
        [
            YearAllocation(
                staff_line=staff_line,
                **allocation,
            )
            for allocation in allocations
        ]
    )

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(budget: Budget, line: StaffCostLine) -> dict:
    line.delete()

    return budget_details.get_budget_details(budget)
