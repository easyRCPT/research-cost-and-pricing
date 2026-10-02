from django.db import transaction

from ..models import Budget, Deliverable
from . import budget_details


@transaction.atomic
def create(budget: Budget, data: dict) -> dict:
    deliverable = Deliverable(
        budget=budget,
        **data,
    )
    deliverable.full_clean()
    deliverable.save()
    budget.touch()

    return budget_details.get_budget_details(budget)


@transaction.atomic
def delete(deliverable: Deliverable) -> dict:
    budget = deliverable.budget
    deliverable.delete()
    budget.touch()

    return budget_details.get_budget_details(budget)
