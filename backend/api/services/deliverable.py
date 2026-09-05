from django.db import transaction

from ..models import Budget, Deliverable


@transaction.atomic
def create(budget: Budget, data: dict) -> None:
    Deliverable.objects.create(
        budget=budget,
        **data,
    )


@transaction.atomic
def delete(deliverable: Deliverable) -> None:
    deliverable.delete()
