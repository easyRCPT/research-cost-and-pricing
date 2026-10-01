import json

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction
from django.db.models import Count, Prefetch
from django.db.utils import IntegrityError
from django.forms.models import model_to_dict
from rest_framework.exceptions import ValidationError

from ..exceptions import Conflict
from ..models import (
    Budget,
    Department,
    Faculty,
    LookupChangeSet,
    LookupConfiguration,
    LookupVersion,
    User,
)
from .audit import write_audit
from .lookup_definitions import LOOKUP_DEFINITIONS, LookupDefinition
from .lookup_loader import invalidate_lookup_cache

# A costing stamped with a version and still waiting on an approver. It can be
# rejected and resubmitted on newer rates; an approved one cannot (#142).
IN_REVIEW = (
    Budget.Status.SUBMITTED,
    Budget.Status.HOD_REVIEW,
    Budget.Status.DEAN_REVIEW,
)


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

    Not audited here: the set of changes that needed the new version records
    it, so one save reads as one event in the log (#138).
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

    return new_version.id


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


def get_definition(table: str) -> LookupDefinition:
    definition = LOOKUP_DEFINITIONS.get(table)

    if definition is None:
        raise ValidationError(f"Invalid lookup table: {table}")

    return definition


def _get_unversioned_model(table: str) -> type[models.Model]:
    """
    The tables a single-row write may change.

    The versioned ones price a costing, so they change only as a reviewed set
    (lookup_changes.apply_changes, #138). A row at a time, a costing submitted
    halfway through a many-row change was frozen onto half the new rates.
    """
    definition = get_definition(table)

    if definition.versioned:
        raise ValidationError(
            f"'{table}' prices costings, so it is changed only as a reviewed set "
            "of changes: POST /api/admin/lookups/changes/."
        )

    return definition.model


def save_validated_instance(
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
    model = _get_unversioned_model(table)

    instance = model(**data)
    save_validated_instance(instance)

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
    model = _get_unversioned_model(table)

    _validate_model_fields(model, lookup, data)

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

    before = model_to_dict(instance, fields=data.keys())

    # Lookup fields may also be included in data and updated.
    for field, value in data.items():
        setattr(instance, field, value)
    save_validated_instance(instance, update_fields=list(data))

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


def plain(values: dict | None) -> dict | None:
    """A row's values as the audit log's JSON column can hold them."""
    if values is None:
        return None

    # Convert model instances to their primary keys
    values = {
        key: value.pk if isinstance(value, models.Model) else value
        for key, value in values.items()
    }

    # Decimals and dates, as the log's JSON column can hold them.
    return json.loads(json.dumps(values, cls=DjangoJSONEncoder))


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
    Who changed a lookup row and what it said before (#73), for the tables
    changed a row at a time.

    Only the fields the write touched, so a rename reads as that field's old
    and new value rather than two copies of the row. These tables are changed
    in place (a department renamed, a category re-coded), so this is the only
    record of what they said before.
    """
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


def priced_on(version_id: int) -> dict:
    """
    How many costings in review and approved were priced on a version (#142).

    What an administrator needs to hear when the rates move away from it: the
    ones in review can be sent back and resubmitted on the new rates, and the
    approved ones keep their price. Drafts are never stamped, so never counted.
    """
    counts = (
        Budget.objects.filter(lookup_version_id=version_id)
        .values("status")
        .annotate(n=Count("id"))
    )
    by_status = {row["status"]: row["n"] for row in counts}
    return {
        "version_id": version_id,
        "in_review": sum(by_status.get(status, 0) for status in IN_REVIEW),
        "approved": by_status.get(Budget.Status.APPROVED, 0),
    }


def budgets_on(version_id: int) -> list[dict]:
    """Every costing stamped with a version, newest submission first (#142)."""
    if not LookupVersion.objects.filter(id=version_id).exists():
        raise ValidationError(f"There is no lookup version {version_id}.")

    budgets = (
        Budget.objects.filter(lookup_version_id=version_id)
        .select_related("project__created_by")
        .order_by("-submitted_at", "-id")
    )
    return [
        {
            "id": budget.id,
            "project_id": budget.project.id,
            "reference": budget.project.reference,
            "title": budget.project.title,
            "owner": {
                "email": budget.project.created_by.email,
                "name": budget.project.created_by.get_full_name(),
            },
            "status": budget.status,
            "total_price_inc_gst": budget.total_price_inc_gst,
            "submitted_at": budget.submitted_at,
        }
        for budget in budgets
    ]


@transaction.atomic
def restore_version(version_id: int, actor: User | None) -> dict:
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

    Returns the new version and who was priced on the one it replaced (#142).
    """
    config = LookupConfiguration.objects.select_for_update().get()
    try:
        source = LookupVersion.objects.get(id=version_id)
    except LookupVersion.DoesNotExist:
        raise ValidationError(f"There is no lookup version {version_id}.")
    replaced = config.current_version_id
    if source.id == replaced:
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
        detail={"restored_from": source.id, "replaced": replaced},
    )
    transaction.on_commit(invalidate_lookup_cache)
    return {"version_id": restored.id, "replaced": priced_on(replaced)}


def list_versions() -> list[dict]:
    """
    Every version, newest first: who made it, what it priced, and the sets of
    changes saved into it (#138).
    """
    config = LookupConfiguration.objects.get()
    budgets_priced = dict(
        Budget.objects.filter(lookup_version__isnull=False)
        .values("lookup_version")
        .annotate(n=Count("id"))
        .values_list("lookup_version", "n")
    )
    versions = (
        LookupVersion.objects.order_by("-id")
        .select_related("updated_by")
        .prefetch_related(
            Prefetch(
                "change_sets",
                queryset=LookupChangeSet.objects.select_related("saved_by").order_by(
                    "-saved_at", "-id"
                ),
            )
        )
    )
    return [
        {
            "id": version.id,
            "created_at": version.created_at,
            "updated_by": version.updated_by.email if version.updated_by else None,
            "budgets_priced": budgets_priced.get(version.id, 0),
            "current": version.id == config.current_version_id,
            # Whether the next set writes into this version. Only the current
            # one, and only until a costing is submitted on it; after that the
            # next set starts a new version, so nothing priced moves.
            "accepts_changes": (
                version.id == config.current_version_id and not config.referenced
            ),
            "change_sets": [
                {
                    "id": change_set.id,
                    "note": change_set.note,
                    "saved_by": (
                        change_set.saved_by.email if change_set.saved_by else None
                    ),
                    "saved_at": change_set.saved_at,
                    "change_count": change_set.change_count,
                }
                for change_set in version.change_sets.all()
            ],
        }
        for version in versions
    ]
