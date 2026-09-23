from django.db import models, transaction
from rest_framework.exceptions import ValidationError

from ..models import (
    CalculationConstant,
    EbaIncrease,
    LookupConfiguration,
    LookupVersion,
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
)
from .lookup_loader import (
    LOOKUP_MODELS,
    LookupTable,
    invalidate_lookup_cache,
)

# Fixed by the University, not a rate that gets corrected. It decides whether a
# budget needs a Dean (calculation/pricing.py), so editing it changes who has to
# approve every budget in the system rather than what any of them cost.
FIXED_CONSTANTS = frozenset({"full_cost_recovery_multiplier"})

VERSIONED_MODELS = (
    SalaryRate,
    SalaryRateMultiplier,
    EbaIncrease,
    OnCostRate,
    CalculationConstant,
)


def create_lookup_version(config: LookupConfiguration) -> int:
    """
    Create a new Lookup Version and point current version to it.
    """
    old_version_id = config.current_version_id

    new_version = LookupVersion.objects.create()

    for model in VERSIONED_MODELS:
        rows = model.objects.filter(version_id=old_version_id)

        for row in rows:
            fields = {
                field.name: getattr(row, field.name)
                for field in model._meta.concrete_fields
                if not field.primary_key and field.name != "version"
            }

            model.objects.create(
                **fields,
                version=new_version,
            )

    config.current_version = new_version
    config.referenced = False
    config.save(update_fields=["current_version", "referenced"])

    return new_version.id


def _reject_fixed_constant(model: type[models.Model], *sources: dict) -> None:
    """
    Refuse any write that names a constant the API does not get to change.

    Checked before anything else, because minting a version is a side effect and
    a refused edit should leave no trace. Covers the delete path too: `update`
    with empty data removes the row, which is a change to 1.70 by another name.
    """
    if model is not CalculationConstant:
        return

    for source in sources:
        name = source.get("name")
        if name in FIXED_CONSTANTS:
            raise ValidationError(
                f"'{name}' is fixed and cannot be changed through the API.",
            )


def _get_model(table: str) -> type[models.Model]:
    try:
        lookup_table = LookupTable(table)
    except ValueError:
        raise ValidationError(f"Invalid lookup table: {table}")

    return LOOKUP_MODELS[lookup_table]


def _check_and_create_new_version(model: type[models.Model]) -> int:
    """
    Determines whether a new version should be created.
    Return id of current version or the created new version.
    """
    config = LookupConfiguration.objects.select_for_update().get()

    if model in VERSIONED_MODELS and config.referenced:
        return create_lookup_version(config)

    return config.current_version_id


@transaction.atomic
def create(
    table: str,
    data: dict,
) -> None:
    # Get model
    model = _get_model(table)
    _reject_fixed_constant(model, data)

    # Determines whether a new version should be created
    # Validate the model before saving
    if model in VERSIONED_MODELS:
        version_id = _check_and_create_new_version(model)
        instance = model(
            **data,
            version_id=version_id,
        )
    else:
        instance = model(**data)

    instance.full_clean()
    instance.save()

    invalidate_lookup_cache()


@transaction.atomic
def update(
    table: str,
    lookup: dict,
    data: dict,
) -> None:
    # Get model
    model = _get_model(table)
    _reject_fixed_constant(model, lookup, data)

    try:
        if model in VERSIONED_MODELS:
            # Determines whether a new version should be created
            version_id = _check_and_create_new_version(model)
            instance = model.objects.get(
                **lookup,
                version_id=version_id,
            )
        else:
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
