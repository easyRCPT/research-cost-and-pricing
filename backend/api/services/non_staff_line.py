from django.db import transaction

from ..models import Budget, NonStaffCostLine, YearAmount
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    amounts = data.pop("amounts", [])

    non_staff_line = NonStaffCostLine.objects.create(
        budget=budget,
        **data,
    )

    YearAmount.objects.bulk_create(
        [
            YearAmount(
                non_staff_line=non_staff_line,
                **amount,
            )
            for amount in amounts
        ]
    )

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(budget: Budget, line: NonStaffCostLine) -> dict:
    line.delete()

    return budget_details.get_budget_details(budget)
