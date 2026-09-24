from django.db import transaction
from django.db.models import Max

from ..models import Budget, NonStaffCostLine, YearAmount
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    amounts = data.pop("amounts", [])

    last = budget.non_staff_lines.aggregate(Max("position"))["position__max"]
    non_staff_line = NonStaffCostLine(
        budget=budget,
        position=0 if last is None else last + 1,
        **data,
    )
    non_staff_line.full_clean()
    non_staff_line.save()

    year_amounts = [
        YearAmount(
            non_staff_line=non_staff_line,
            **amount,
        )
        for amount in amounts
    ]

    for amount in year_amounts:
        amount.full_clean()

    YearAmount.objects.bulk_create(year_amounts)

    budget.touch()

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(budget: Budget, line: NonStaffCostLine) -> dict:
    line.delete()

    budget.touch()

    return budget_details.get_budget_details(budget)
