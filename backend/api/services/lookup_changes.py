"""
Saving lookup edits as one reviewed set (#138).

An administrator builds up changes across the rate tables, reviews them and
saves them once. The set is applied all at once or not at all, under the same
lock submission takes, so a costing is submitted either entirely before a set
or entirely after it. Saving a row at a time, a costing submitted while an
administrator was partway through the annual EBA update was frozen onto half
the new rates for good (#52).

When a version is made does not change: a set writes into the current version
until a costing is submitted on it, and the first set after that copies the
rates into a new version and writes there.
"""

from decimal import Decimal
from typing import Any, cast

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models, transaction
from django.db.models import ProtectedError
from django.forms.models import model_to_dict
from rest_framework import serializers
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.fields import get_error_detail

from ..calculation.staff import PAYROLL_TYPE
from ..models import (
    CalculationConstant,
    LookupChangeSet,
    LookupConfiguration,
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
    StaffCostLine,
    User,
)
from .audit import write_audit
from .lookup_definitions import LookupDefinition
from .lookup_loader import build_constants, invalidate_lookup_cache
from .lookup_update import (
    create_lookup_version,
    get_definition,
    is_baseline,
    plain,
    priced_on,
    save_validated_instance,
)

CREATE = "create"
UPDATE = "update"
DELETE = "delete"
OPS = (CREATE, UPDATE, DELETE)

# Below 1 the multiplier prices staff under their own salary and on-costs,
# which is never a cost recovery rate. Two places, because each budget keeps a
# copy of the rate it was priced at in a two-place column.
MULTIPLIER_FLOOR = Decimal(1)
MULTIPLIER_STEP = Decimal("0.01")

# Constants that are rates, held as decimals: 0.30 is 30%. A costing's
# margin runs from 0 to 100% (MAX_MARGIN in MarginPanel.tsx), so the margin
# constants share that range and the floor can't sit where no costing could
# reach it. #87 may move the margin's bounds; these follow (#151).
RATE_CONSTANTS = {
    "default_margin",
    "minimum_margin",
    "gst_rate",
    "max_payroll_tax",
    "override_uom_oncosts",
}
RATE_CEILING = Decimal(1)

# The engine reads every one of these by name or uses every row, so a set may
# change their values but never add or take one away.
NO_CREATE = {
    CalculationConstant: "Constants can't be added: the costing engine reads "
    "each one by name, so a new one would never be used.",
}
NO_DELETE = {
    CalculationConstant: "Constants can't be removed: the costing engine reads "
    "each one by name.",
    SalaryRateMultiplier: "Time basis multipliers can't be removed: every staff "
    "line is priced on one of them.",
}


def _check_and_create_new_version(
    config: LookupConfiguration, actor: User | None
) -> int:
    """
    The version a set writes into, checked once per set.

    The current one, unless a costing has been submitted on it: then the rates
    are copied into a new version first, so the submitted costing's rates
    never move. The same when the current version is the baseline, the rates
    as first loaded: they stay as they were, so they can always be restored.
    """
    if config.referenced or is_baseline(config.current_version):
        return create_lookup_version(config, actor)
    return config.current_version_id


def _label(definition: LookupDefinition) -> str:
    return str(definition.model._meta.verbose_name)


def _describe(key: dict) -> str:
    return " · ".join("any" if value is None else str(value) for value in key.values())


def _typed_key(definition: LookupDefinition, lookup: dict | None) -> dict:
    """
    The row's natural key, typed. Rows are named by their key and never by id:
    a set that starts a new version copies every row, and the copies have new
    ids, so an id read off the screen would name a row that is no longer there.
    """
    lookup = lookup or {}
    if set(lookup) != set(definition.key):
        raise ValidationError(
            f"Name the {_label(definition)} by {', '.join(definition.key)}."
        )

    fields = cast(serializers.Serializer, definition.serializer()).fields
    key = {}
    errors = {}
    for name in definition.key:
        try:
            key[name] = fields[name].run_validation(lookup[name])
        except ValidationError as exc:
            errors[name] = exc.detail
    if errors:
        raise ValidationError(errors)
    return key


def _typed_values(
    definition: LookupDefinition,
    values: dict | None,
    instance: models.Model | None = None,
) -> dict:
    """A row's new values, typed and checked by the table's serializer."""
    values = values or {}
    if not values:
        raise ValidationError("Give the values to save.")

    serializer = cast(
        serializers.Serializer,
        definition.serializer(instance, data=values, partial=instance is not None),
    )
    writable = {
        name for name, field in serializer.fields.items() if not field.read_only
    }
    unknown = set(values) - writable
    if unknown:
        raise ValidationError(f"Invalid fields: {', '.join(sorted(unknown))}")

    serializer.is_valid(raise_exception=True)
    return dict(cast(dict, serializer.validated_data))


def _check_constant(instance: models.Model, values: dict) -> None:
    """
    The constants with a range of their own. Checked on the row, so the rule
    follows the constant whatever else the change says.
    """
    if not isinstance(instance, CalculationConstant) or "value" not in values:
        return
    value: Decimal = values["value"]

    if instance.name == "full_cost_recovery_multiplier":
        # An administrator's to change (#149), within a range.
        if value < MULTIPLIER_FLOOR:
            raise ValidationError(
                "The full cost recovery multiplier can't be below 1.00: that "
                "would price staff below their own salary and on-costs."
            )
        if value != value.quantize(MULTIPLIER_STEP):
            raise ValidationError(
                "The full cost recovery multiplier takes at most two decimal places."
            )

    if instance.name == "salary_rate_year" and (
        value <= 0 or value != value.to_integral_value()
    ):
        raise ValidationError("Salary rate year must be a positive whole year.")

    if instance.name in RATE_CONSTANTS:
        _check_rate(instance.name, value)

    if instance.name == "max_leave_loading" and value < 0:
        raise ValidationError(
            "Max leave loading is a dollar cap and can't be negative."
        )


def _readable(name: str) -> str:
    """'minimum_margin' as a person reads it: 'Minimum margin'."""
    words = name.replace("_", " ")
    return words[0].upper() + words[1:]


def _check_rate(name: str, value: Decimal) -> None:
    """
    A rate is a decimal from 0 to 1 (#151). Anything above 1 is far more
    likely a percentage typed bare than a rate of over 100%, so it is refused
    with the decimal it probably meant, never converted by guesswork.
    """
    if value < 0:
        raise ValidationError(f"{_readable(name)} can't be below 0.")
    if value > RATE_CEILING:
        raise ValidationError(
            f"{_readable(name)} is a decimal from 0 to 1 (0% to 100%). "
            f"Did you mean {value.normalize():f}%? Enter "
            f"{(value / 100).normalize():f} or {value.normalize():f}%."
        )


def _find(definition: LookupDefinition, version_id: int, key: dict) -> models.Model:
    try:
        return definition.model.objects.get(**key, version_id=version_id)
    except definition.model.DoesNotExist:
        raise ValidationError(
            f"There is no {_label(definition)} for {_describe(key)} to change."
        )


def _create(definition: LookupDefinition, version_id: int, change: dict) -> dict:
    model = definition.model
    if model in NO_CREATE:
        raise ValidationError(NO_CREATE[model])

    values = _typed_values(definition, change.get("values"))
    key = {name: values.get(name) for name in definition.key}
    if model.objects.filter(**key, version_id=version_id).exists():
        raise ValidationError(
            f"There is already a {_label(definition)} for {_describe(key)}."
        )

    save_validated_instance(model(**values, version_id=version_id))
    return {"key": key, "before": None, "after": values}


def _update(definition: LookupDefinition, version_id: int, change: dict) -> dict:
    key = _typed_key(definition, change.get("lookup"))
    instance = _find(definition, version_id, key)

    renamed = set(change.get("values") or {}) & set(definition.key)
    if renamed:
        raise ValidationError(
            f"A {_label(definition)}'s {', '.join(sorted(renamed))} can't be "
            "changed: it is what names the row. Remove the row and add a new one."
        )

    values = _typed_values(definition, change.get("values"), instance)
    _check_constant(instance, values)

    before = model_to_dict(instance, fields=list(values))
    for field, value in values.items():
        setattr(instance, field, value)
    save_validated_instance(instance, update_fields=list(values))

    return {"key": key, "before": before, "after": values}


def _reject_removing_a_rate_in_use(instance: models.Model) -> None:
    """
    A draft prices on the current rates, and a staff line whose rate is gone
    is costed at nothing rather than refused (calculation/staff.py), so it
    could be submitted at that. Only drafts: a submitted costing keeps the
    version it was stamped with, which still holds the rate.
    """
    if not isinstance(instance, SalaryRate):
        return
    lines = StaffCostLine.objects.filter(
        budget__lookup_version__isnull=True,
        employment_type__in=[
            employment
            for employment, payroll in PAYROLL_TYPE.items()
            if payroll == instance.payroll_type
        ],
        category=instance.category,
        classification=instance.classification,
    ).count()
    if lines:
        raise ValidationError(
            f"{lines} draft staff {'line is' if lines == 1 else 'lines are'} costed "
            "at this rate, so it can't be removed: they would be costed at nothing."
        )


def _reject_removing_a_default_on_cost(instance: models.Model) -> None:
    """The rate for every year without one of its own; every costing needs it."""
    if isinstance(instance, OnCostRate) and instance.year is None:
        raise ValidationError(
            "This is the on-cost's rate for every year without one of its own, so "
            "it can't be removed. Change its rate instead."
        )


def _delete(definition: LookupDefinition, version_id: int, change: dict) -> dict:
    model = definition.model
    if model in NO_DELETE:
        raise ValidationError(NO_DELETE[model])

    key = _typed_key(definition, change.get("lookup"))
    instance = _find(definition, version_id, key)
    _reject_removing_a_rate_in_use(instance)
    _reject_removing_a_default_on_cost(instance)
    before = model_to_dict(instance, exclude=["id", "version"])

    # Only from this version. Costings priced on older versions keep the row,
    # because each version holds every row of its own.
    try:
        instance.delete()
    except ProtectedError:
        raise ValidationError(
            f"Draft costings use this {_label(definition)}, so it can't be removed."
        )

    return {"key": key, "before": before, "after": None}


APPLY = {CREATE: _create, UPDATE: _update, DELETE: _delete}


def _refused(index: int, exc: DjangoValidationError | APIException) -> ValidationError:
    """
    The whole set is refused, naming the change that caused it by its index,
    so the screen can mark that row.
    """
    if isinstance(exc, DjangoValidationError):
        detail: Any = get_error_detail(exc)
    elif isinstance(exc, ValidationError):
        detail = exc.detail
    else:
        # A conflict or other refusal with a single message.
        detail = [exc.detail]
    return ValidationError({"changes": {str(index): detail}})


@transaction.atomic
def apply_changes(changes: list[dict], note: str, actor: User | None) -> dict:
    """
    Apply a set of changes to the rate tables, all of it or none of it.

    Each change is {"table", "op", "lookup", "values"}: an update and a delete
    name their row by its key in `lookup`; a create and an update carry
    `values`. Returns the version the set went into and, when the set started
    a new version, who was priced on the one it replaced (#142).
    """
    if not changes:
        raise ValidationError("A set needs at least one change.")

    # The lock submission takes when it stamps a costing with the current
    # version. Held for the whole set, so a submission lands entirely before
    # the set or entirely after it, never between two of its changes.
    config = LookupConfiguration.objects.select_for_update().get()
    replaced = config.current_version_id
    version_id = _check_and_create_new_version(config, actor)
    new_version = version_id != replaced

    entries = []
    for index, change in enumerate(changes):
        try:
            definition = get_definition(change["table"])
            if not definition.versioned:
                raise ValidationError(
                    f"'{change['table']}' does not price costings, so it is not "
                    "changed as part of a set."
                )
            op = change["op"]
            if op not in APPLY:
                raise ValidationError(f"Unknown operation '{op}'.")
            entry = APPLY[op](definition, version_id, change)
        except (DjangoValidationError, APIException) as exc:
            # Raising rolls back every change before this one, and the new
            # version too if the set started one.
            raise _refused(index, exc) from exc

        entries.append(
            {
                "table": change["table"],
                "op": op,
                "key": plain(entry["key"]),
                "before": plain(entry["before"]),
                "after": plain(entry["after"]),
            }
        )

    # The rates the set leaves must still price a costing, whatever the
    # changes did between them: every constant there, every on-cost with a
    # rate for the years that have none of their own.
    try:
        build_constants(version_id)
    except (KeyError, ValueError) as exc:
        reason = exc.args[0] if exc.args else exc
        raise ValidationError(
            {
                "changes": [
                    f"These changes would leave rates that cannot price a costing: {reason}"
                ]
            }
        ) from exc

    change_set = LookupChangeSet.objects.create(
        version_id=version_id,
        note=note,
        saved_by=actor,
        change_count=len(entries),
    )

    # One entry for the whole set (#73), so one save reads as one event in the
    # log, with every change's before and after.
    write_audit(
        actor=actor,
        action="admin.lookup.changes",
        object_type="lookup_change_set",
        object_id=str(change_set.id),
        detail={
            "version": version_id,
            "started_from": replaced if new_version else None,
            "note": note,
            "changes": entries,
        },
    )

    # After commit: cleared any earlier, a request in between could fill the
    # cache again from the rates as they were before the set.
    transaction.on_commit(invalidate_lookup_cache)

    return {
        "change_set_id": change_set.id,
        "version_id": version_id,
        "new_version": new_version,
        "replaced": priced_on(replaced) if new_version else None,
    }
