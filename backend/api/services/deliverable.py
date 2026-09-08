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


@transaction.atomic
def delete(deliverable: Deliverable) -> None:
    deliverable.delete()
