from django.db import transaction

from ..models import Budget, Deliverable


@transaction.atomic
def create(budget: Budget, data: dict) -> None:
    deliverable = Deliverable(
        budget=budget,
        **data,
    )
    deliverable.full_clean()
    deliverable.save()
    budget.touch()


@transaction.atomic
def delete(deliverable: Deliverable) -> None:
    budget = deliverable.budget
    deliverable.delete()
    budget.touch()
