import json

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction
from django.db.utils import IntegrityError
from django.forms.models import model_to_dict
from rest_framework.exceptions import ValidationError

from ..exceptions import Conflict
from ..models import (
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
    User,
)
from . import classification
from .audit import write_audit
from .lookup_definitions import LOOKUP_DEFINITIONS
from .lookup_loader import current_version_id, invalidate_lookup_cache

# Fixed by the University at its full cost recovery rate (#60). It sets the
# price of every budget; it no longer decides Dean review, which reads the
# margin and in-kind costs (calculation/pricing.py).
FIXED_CONSTANTS = frozenset({"full_cost_recovery_multiplier"})


def get_versioned_models() -> list[type[models.Model]]:
    return [
        definition.model
        for definition in LOOKUP_DEFINITIONS.values()
        if definition.versioned
    ]


def create_lookup_version(
    config: LookupConfiguration,
    actor: User | None = None,
) -> int:
    """
    Create a new Lookup Version and point current version to it.
    """
    old_version_id = config.current_version_id

    # Who made the change that needed a new version. The versions list shows
    # it, and without it every edited version read as though it were seeded.
    new_version = LookupVersion.objects.create(updated_by=actor)

    for model in get_versioned_models():
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

    # Audit lookup version creation only when triggered by a superadmin.
    # Initial import creates versions without an actor and should not create audit records.
    # A lookup edit can create both an edit log and a version creation log.
    if actor is not None:
        write_audit(
            actor=actor,
            action="admin.lookup_version.create",
            object_type="lookup_version",
            object_id=str(new_version.id),
            detail={
                "source_version_id": old_version_id,
            },
        )

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


def _reject_invalid_salary_rate_year(
    model: type[models.Model], lookup: dict, data: dict
) -> None:
    """Salary rate year must be a positive integer."""
    if model is not CalculationConstant:
        return

    name = lookup.get("name")
    value = data.get("value")
    if name != "salary_rate_year" or value is None:
        return

    if value <= 0 or value != value.to_integral_value():
        raise ValidationError("Salary Rate Year must be a positive small integer.")


def _reject_update_to_constant_name(model: type[models.Model], data: dict) -> None:
    """
    Names of calculation constant are used in the engine and cannot be updated by admin.
    """

    if model is not CalculationConstant:
        return

    if data.get("name") is not None:
        raise ValidationError("Name of calculation constant cannot be updated.")


def _validate_classification(model: type[models.Model], data: dict) -> None:
    if model is not SalaryRate:
        return

    if data.get("classification") is not None:
        classification.validate(current_version_id(), data["classification"])


def _validate_model_fields(model: type[models.Model], *sources: dict) -> None:
    for source in sources:
        # Process foreign key fields
        if model is Department:
            # Convert faculty code to a Faculty instance
            faculty_code = source.pop("faculty_code", None)
            if faculty_code is not None:
                faculty = Faculty.objects.filter(code=faculty_code).first()
                if faculty is None:
                    raise ValidationError(
                        f"Faculty with code {faculty_code} does not exist."
                    )
                source.update({"faculty": faculty})

        # Model fields validation
        valid_fields = {field.name for field in model._meta.fields}

        invalid_fields = set(source) - valid_fields

        if invalid_fields:
            raise ValidationError(
                f"Invalid fields: {', '.join(sorted(invalid_fields))}"
            )


def _validate_update(model: type[models.Model], lookup: dict, data: dict) -> None:
    _reject_fixed_constant(model, lookup, data)
    _reject_invalid_salary_rate_year(model, lookup, data)
    _reject_update_to_constant_name(model, data)

    _validate_classification(model, data)
    _validate_model_fields(model, lookup, data)


def _get_model(table: str) -> type[models.Model]:
    definition = LOOKUP_DEFINITIONS.get(table)

    if definition is None:
        raise ValidationError(f"Invalid lookup table: {table}")

    return definition.model


def _check_and_create_new_version(
    model: type[models.Model],
    actor: User | None = None,
) -> int:
    """
    Determines whether a new version should be created.
    Return id of current version or the created new version.
    """
    config = LookupConfiguration.objects.select_for_update().get()

    if model in get_versioned_models() and config.referenced:
        return create_lookup_version(config, actor)

    return config.current_version_id


def _save_validated_instance(
    instance: models.Model,
    update_fields: list[str] | None = None,
) -> None:
    # Validate the model before saving
    # Return django validation error with model validation.
    # ExceptionHandler convert django validation error to 400
    instance.full_clean()

    try:
        instance.save(update_fields=update_fields)
    except IntegrityError as exc:
        # Return 409 for database integrity conflicts
        raise Conflict("Lookup write conflicts with an existing lookup entry.") from exc


@transaction.atomic
def create(
    table: str,
    data: dict,
    actor: User | None = None,
) -> None:
    # Get model
    model = _get_model(table)

    _validate_classification(model, data)

    # Calculation constants are part of application logic and cannot be
    # created dynamically after deployment.
    if model == CalculationConstant:
        raise ValidationError("Calculation Constant cannot be created.")

    if model in get_versioned_models():
        # Determines whether a new version should be created
        version_id = _check_and_create_new_version(model, actor)
        instance = model(
            **data,
            version_id=version_id,
        )
    else:
        instance = model(**data)

    _save_validated_instance(instance)

    _audit(
        actor,
        "admin.lookup.insert",
        table,
        instance,
        before=None,
        after=data,
    )
    invalidate_lookup_cache()


@transaction.atomic
def update(
    table: str,
    lookup: dict,
    data: dict,
    actor: User | None = None,
) -> None:
    model = _get_model(table)

    _validate_update(model, lookup, data)

    try:
        if model in get_versioned_models():
            # Determines whether a new version should be created
            version_id = _check_and_create_new_version(model, actor)
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

    before = model_to_dict(instance, fields=data.keys())

    # Lookup fields may also be included in data and updated.
    for field, value in data.items():
        setattr(instance, field, value)
    _save_validated_instance(instance, update_fields=list(data))

    after = model_to_dict(instance, fields=data.keys())

    # Audit records use the service/model layer representation rather than the
    # original API field names. ForeignKey values are recorded as primary keys.
    _audit(
        actor,
        "admin.lookup.update",
        table,
        instance,
        before=before,
        after=after,
        lookup=lookup,
    )
    invalidate_lookup_cache()


def _audit(
    actor: User | None,
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
        if values is None:
            return None

        # Convert model instances to their primary keys
        values = {
            key: value.pk if isinstance(value, models.Model) else value
            for key, value in values.items()
        }

        # Decimals and dates, as the log's JSON column can hold them.
        return json.loads(json.dumps(values, cls=DjangoJSONEncoder))

    write_audit(
        actor=actor,
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


@transaction.atomic
def restore_version(version_id: int, actor: User | None) -> int:
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

    restored = LookupVersion.objects.create(updated_by=actor)
    for model in get_versioned_models():
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
        actor=actor,
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
