from django.db import models
from rest_framework.exceptions import ValidationError

from .lookup_loader import (
    LOOKUP_TABLES,
    LookupTable,
    invalidate_lookup_cache,
)


def create(
    table: str,
    data: dict,
) -> None:
    try:
        lookup_table = LookupTable(table)
    except ValueError:
        raise ValidationError(f"Invalid lookup table: {table}")

    model = LOOKUP_TABLES[lookup_table].model

    # Validate the model before saving
    instance = model(**data)
    instance.full_clean()
    instance.save()

    invalidate_lookup_cache()


def update(
    table: str,
    lookup: dict,
    data: dict,
) -> None:
    try:
        lookup_table = LookupTable(table)
    except ValueError:
        raise ValidationError(f"Invalid lookup table: {table}")

    model = LOOKUP_TABLES[lookup_table].model

    try:
        instance = model.objects.get(**lookup)
    except model.DoesNotExist:
        # Raise a validation error if no matching row is found
        raise ValidationError(
            f"No matching row found in lookup table '{table}'.",
        )
    except model.MultipleObjectsReturned:
        # Raise a validation error if multiple matching rows found
        raise ValidationError(
            f"Multiple matching rows found in lookup table '{table}'.",
        )

    # Delete the lookup row if a matching row is found and data is empty
    if not data:
        instance.delete()
    # Update the matching lookup row if data is provided
    else:
        _update_instance(instance, lookup, data)

    invalidate_lookup_cache()


def _update_instance(
    instance: models.Model,
    lookup: dict,
    data: dict,
) -> None:
    # Lookup fields are used to identify the row and cannot be updated.
    immutable_fields = lookup.keys() & data.keys()

    if immutable_fields:
        raise ValidationError(
            "Lookup fields cannot be updated: " + ", ".join(sorted(immutable_fields)),
        )

    for field, value in data.items():
        setattr(instance, field, value)

    instance.full_clean()
    instance.save(update_fields=list(data))
