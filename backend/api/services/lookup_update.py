import json

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction
from django.forms.models import model_to_dict
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
from .audit import write_audit
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


def create_lookup_version(config: LookupConfiguration, user=None) -> int:
    """
    Create a new Lookup Version and point current version to it.
    """
    old_version_id = config.current_version_id

    # Who made the change that needed a new version. The versions list shows
    # it, and without it every edited version read as though it were seeded.
    new_version = LookupVersion.objects.create(updated_by=user)

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
    """Refuse any write that names a constant the API does not get to change."""
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


def _check_and_create_new_version(model: type[models.Model], user=None) -> int:
    """
    Determines whether a new version should be created.
    Return id of current version or the created new version.
    """
    config = LookupConfiguration.objects.select_for_update().get()

    if model in VERSIONED_MODELS and config.referenced:
        return create_lookup_version(config, user)

    return config.current_version_id


@transaction.atomic
def create(
    table: str,
    data: dict,
    user=None,
) -> None:
    # Get model
    model = _get_model(table)
    _reject_fixed_constant(model, data)

    # Determines whether a new version should be created
    # Validate the model before saving
    if model in VERSIONED_MODELS:
        version_id = _check_and_create_new_version(model, user)
        instance = model(
            **data,
            version_id=version_id,
        )
    else:
        instance = model(**data)

    instance.full_clean()
    instance.save()

    _audit(user, "admin.lookup.insert", table, instance, before=None, after=data)
    invalidate_lookup_cache()


@transaction.atomic
def update(
    table: str,
    lookup: dict,
    data: dict,
    user=None,
) -> None:
    model = _get_model(table)
    _reject_fixed_constant(model, lookup, data)

    if not data:
        raise ValidationError("Nothing to update.")

    try:
        if model in VERSIONED_MODELS:
            # Determines whether a new version should be created
            version_id = _check_and_create_new_version(model, user)
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

    # The lookup may name the row by id rather than by name.
    _reject_fixed_constant(model, model_to_dict(instance))

    before = {field: getattr(instance, field, None) for field in data}
    _update_instance(instance, lookup, data)

    _audit(
        user,
        "admin.lookup.update",
        table,
        instance,
        before=before,
        after=data,
        lookup=lookup,
    )
    invalidate_lookup_cache()


def _audit(
    user,
    action: str,
    table: str,
    instance: models.Model,
    before: dict | None,
    after: dict,
    lookup: dict | None = None,
) -> None:
    """
    Who changed a lookup row and what it said before (#73), for every table.

    Only the fields the write touched, so a rate change reads as that rate's
    old and new value rather than two copies of the row. The versioned tables
    also keep their old rows in the older version; the in-place ones (a
    department renamed, a category re-coded) have nothing but this.
    """

    def plain(values: dict | None) -> dict | None:
        # Decimals and dates, as the log's JSON column can hold them.
        return (
            None
            if values is None
            else json.loads(json.dumps(values, cls=DjangoJSONEncoder))
        )

    write_audit(
        actor=user,
        action=action,
        object_type=table,
        object_id=str(instance.pk),
        detail={
            "lookup": plain(lookup),
            "version": getattr(instance, "version_id", None),
            "before": plain(before),
            "after": plain(after),
        },
    )


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


@transaction.atomic
def restore_version(version_id: int, user) -> int:
    """
    Put the rates back to how they were in an older version (#137).

    Restores forward: mints a new version as a copy of the old one and makes
    that current, rather than pointing current_version back at it. The old
    version is left exactly as it is, every budget keeps the version it was
    stamped with, and the restore shows up as the newest version, by whom and
    when, like any other edit. Pointing back would make an old version current
    again, and whether the next edit then copied it or wrote into it would
    depend on `referenced` -- priced history must never depend on that flag.

    Possible at all because each version holds every row, not a diff: the old
    version's rows are the whole answer.
    """
    config = LookupConfiguration.objects.select_for_update().get()
    try:
        source = LookupVersion.objects.get(id=version_id)
    except LookupVersion.DoesNotExist:
        raise ValidationError(f"There is no lookup version {version_id}.")
    if source.id == config.current_version_id:
        raise ValidationError(f"Version {version_id} is already the current rates.")

    restored = LookupVersion.objects.create(updated_by=user)
    for model in VERSIONED_MODELS:
        for row in model.objects.filter(version_id=source.id):
            fields = {
                field.name: getattr(row, field.name)
                for field in model._meta.concrete_fields
                if not field.primary_key and field.name != "version"
            }
            model.objects.create(**fields, version=restored)

    config.current_version = restored
    # Nothing has been priced on the copy yet, so the next edit may write
    # into it rather than minting another.
    config.referenced = False
    config.save(update_fields=["current_version", "referenced"])

    write_audit(
        actor=user,
        action="admin.lookup.restore",
        object_type="lookup_version",
        object_id=str(restored.id),
        detail={"restored_from": source.id},
    )
    invalidate_lookup_cache()
    return restored.id


def list_versions() -> list[dict]:
    """Every version, newest first, with who made it and what it priced."""
    from django.db.models import Count

    current = LookupConfiguration.objects.get().current_version_id
    versions = (
        LookupVersion.objects.order_by("-id")
        .values("id", "created_at", "updated_by__email")
        .annotate(budgets_priced=Count("budget"))
    )
    return [
        {
            "id": version["id"],
            "created_at": version["created_at"],
            "updated_by": version["updated_by__email"],
            "budgets_priced": version["budgets_priced"],
            "current": version["id"] == current,
        }
        for version in versions
    ]
