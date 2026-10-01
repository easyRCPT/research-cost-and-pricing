import json
from datetime import date

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models, transaction
from django.db.models import (
    CharField,
    Count,
    F,
    OuterRef,
    Prefetch,
    ProtectedError,
    Q,
    QuerySet,
    Subquery,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce, Concat, NullIf, Trim
from django.db.utils import IntegrityError
from django.forms.models import model_to_dict
from rest_framework.exceptions import ValidationError

from ..exceptions import Conflict
from ..models import (
    AuditLog,
    Budget,
    Department,
    Faculty,
    LookupChangeSet,
    LookupConfiguration,
    LookupVersion,
    NonStaffCostCategory,
    NonStaffCostLine,
    User,
)
from .audit import write_audit
from .facets import emails_to_names, facets
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
    repoint_drafts(new_version.id)

    return new_version.id


def is_baseline(version: LookupVersion) -> bool:
    """
    The rates as first loaded: imported from the workbook or seeded, so made
    by nobody, and not changed since by any saved set. Never written into, so
    they can always be restored (the first set after loading starts a new
    version instead).
    """
    return version.updated_by_id is None and not version.change_sets.exists()


def current_categories() -> dict[int, int]:
    """The current version's non-staff categories, by ledger ID: {ledger: row id}."""
    version_id = LookupConfiguration.objects.get().current_version_id
    return dict(
        NonStaffCostCategory.objects.filter(version_id=version_id).values_list(
            "ledger_id", "id"
        )
    )


def repoint_drafts(version_id: int) -> None:
    """
    Keep drafts' non-staff lines on the version drafts price against.

    A line points at one version's category row, and the engine reads the
    category's excluded flag off that row (data_loader), as the budget form
    reads its ledger ID and names. A draft prices on the current rates, so
    when the current version changes its lines move to the same category in
    it, matched by ledger ID. Without this, a category's flag changed in a new
    version never reached the drafts already using it. A category the new
    version no longer has leaves the line where it was. Submitted costings
    keep the rows of the version they were stamped with.
    """
    by_ledger = dict(
        NonStaffCostCategory.objects.filter(version_id=version_id).values_list(
            "ledger_id", "id"
        )
    )
    lines = (
        NonStaffCostLine.objects.filter(budget__lookup_version__isnull=True)
        .exclude(category__version_id=version_id)
        .select_related("category")
    )
    moved = []
    for line in lines:
        target = by_ledger.get(line.category.ledger_id)
        if target is not None:
            line.category_id = target
            moved.append(line)
    # Not a save: re-pointing is not an edit to the draft, so updated_at stays.
    NonStaffCostLine.objects.bulk_update(moved, ["category"])


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


def _get_unversioned(table: str) -> LookupDefinition:
    """
    The tables a single-row write may change: the reference tables, which
    don't price a costing and are changed in place (#70, #144).

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

    return definition


def _reject_a_new_key(definition: LookupDefinition, data: dict) -> None:
    """
    A code or ledger ID is what other records point at, so it never changes.
    A different code is a different row.
    """
    label = definition.model._meta.verbose_name
    for field in definition.key:
        if field in data:
            message = (
                f"A {label}'s {field} can't be changed: other records point at "
                "it. Add a new one instead."
            )
            raise ValidationError({field: [message]})


# Faculties and departments are never removed (#70): projects, approvers and
# costings waiting on a dean all point at them.
NOT_REMOVED = {
    "faculties": "Faculties aren't removed: departments and deans point at them.",
    "departments": "Departments aren't removed: projects and heads of department "
    "point at them.",
}


def _in_use(error: ProtectedError) -> str:
    """'3 projects and 1 deliverable use', from what PROTECT found."""
    counts: dict[str, int] = {}
    for record in error.protected_objects:
        name = str(record._meta.verbose_name)
        counts[name] = counts.get(name, 0) + 1
    users = [
        f"{n} {name if n == 1 else name + 's'}" for name, n in sorted(counts.items())
    ]
    verb = "uses" if sum(counts.values()) == 1 else "use"
    return f"{' and '.join(users)} {verb}"


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
    model = _get_unversioned(table).model

    instance = model(**data)
    save_validated_instance(instance)

    _audit(
        actor,
        "admin.lookup.insert",
        table,
        str(instance.pk),
        before=None,
        after=data,
    )
    transaction.on_commit(invalidate_lookup_cache)


@transaction.atomic
def update(
    table: str,
    lookup: dict,
    data: dict,
    actor: User | None = None,
) -> None:
    definition = _get_unversioned(table)
    model = definition.model

    _reject_a_new_key(definition, data)
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
        str(instance.pk),
        before=before,
        after=after,
        lookup=lookup,
    )
    transaction.on_commit(invalidate_lookup_cache)


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


@transaction.atomic
def delete(table: str, key: str, actor: User | None = None) -> None:
    """
    Remove a reference row nothing uses (#144), named by its key. One in use
    is refused, saying what uses it, because PROTECT would refuse it anyway.
    """
    definition = _get_unversioned(table)
    model = definition.model
    if table in NOT_REMOVED:
        raise ValidationError(NOT_REMOVED[table])

    # Every reference table is keyed on one field: a code or a ledger ID.
    [field] = definition.key
    lookup = {field: key}
    try:
        instance = model.objects.get(**lookup)
    except (model.DoesNotExist, ValueError):
        raise ValidationError(f"There is no {model._meta.verbose_name} {key}.")

    object_id = str(instance.pk)
    before = model_to_dict(instance)
    try:
        instance.delete()
    except ProtectedError as exc:
        raise ValidationError(
            f"{_in_use(exc)} this {model._meta.verbose_name}, so it can't be removed."
        ) from exc

    _audit(
        actor,
        "admin.lookup.delete",
        table,
        object_id,
        before=before,
        after=None,
        lookup=lookup,
    )
    transaction.on_commit(invalidate_lookup_cache)


def _audit(
    actor: User | None,
    action: str,
    table: str,
    object_id: str,
    before: dict | None,
    after: dict | None,
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
        object_id=object_id,
        detail={
            "lookup": plain(lookup),
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


def changes_in(version_id: int) -> list[dict]:
    """
    The sets saved into a version, newest first, each with what its changes said
    before and after. That is kept in the set's audit entry (#73), not on the
    set.
    """
    if not LookupVersion.objects.filter(id=version_id).exists():
        raise ValidationError(f"There is no lookup version {version_id}.")

    sets = list(
        LookupChangeSet.objects.filter(version_id=version_id)
        .select_related("saved_by")
        .order_by("-saved_at", "-id")
    )
    logged = {
        entry.object_id: entry.detail.get("changes", [])
        for entry in AuditLog.objects.filter(
            action="admin.lookup.changes",
            object_id__in=[str(change_set.id) for change_set in sets],
        )
    }
    return [
        {
            "id": change_set.id,
            "note": change_set.note,
            "saved_by": change_set.saved_by.email if change_set.saved_by else None,
            "saved_by_name": (
                change_set.saved_by.display_name if change_set.saved_by else None
            ),
            "saved_at": change_set.saved_at,
            "change_count": change_set.change_count,
            "changes": logged.get(str(change_set.id), []),
        }
        for change_set in sets
    ]


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
    repoint_drafts(restored.id)

    write_audit(
        actor=actor,
        action="admin.lookup.restore",
        object_type="lookup_version",
        object_id=str(restored.id),
        detail={"restored_from": source.id, "replaced": replaced},
    )
    transaction.on_commit(invalidate_lookup_cache)
    return {"version_id": restored.id, "replaced": priced_on(replaced)}


# The By filter's value for a version made by nobody, such as the rates as loaded.
SYSTEM = "system"


def _name_of(user: str):
    """`display_name` in SQL: their full name, else their email, else blank."""
    full = Trim(Concat(F(f"{user}__first_name"), Value(" "), F(f"{user}__last_name")))
    return Coalesce(
        NullIf(full, Value("")),
        F(f"{user}__email"),
        Value(""),
        output_field=CharField(),
    )


def versions(
    by: list[str] | None = None,
    since: date | None = None,
    until: date | None = None,
    q: str = "",
) -> QuerySet[LookupVersion]:
    """
    Every version, narrowed to any filters given, with what the history sorts
    on annotated. Days are local and inclusive.
    """
    rows = (
        LookupVersion.objects.select_related("updated_by")
        .prefetch_related(
            Prefetch(
                "change_sets",
                queryset=LookupChangeSet.objects.select_related("saved_by").order_by(
                    "-saved_at", "-id"
                ),
            )
        )
        .annotate(
            by=_name_of("updated_by"),
            changes=Coalesce(
                Subquery(
                    LookupChangeSet.objects.filter(version=OuterRef("pk"))
                    .order_by()
                    .values("version")
                    .annotate(n=Sum("change_count"))
                    .values("n")
                ),
                0,
            ),
            budgets_priced=Coalesce(
                Subquery(
                    Budget.objects.filter(lookup_version=OuterRef("pk"))
                    .order_by()
                    .values("lookup_version")
                    .annotate(n=Count("id"))
                    .values("n")
                ),
                0,
            ),
        )
    )
    if by:
        made_by = Q(updated_by__email__in=by)
        if SYSTEM in by:
            made_by |= Q(updated_by__isnull=True)
        rows = rows.filter(made_by)
    if since:
        rows = rows.filter(created_at__date__gte=since)
    if until:
        rows = rows.filter(created_at__date__lte=until)
    if q:
        noted = LookupChangeSet.objects.filter(note__icontains=q).values("version")
        match = Q(id__in=noted) | Q(by__icontains=q) | Q(updated_by__email__icontains=q)
        if q.lstrip("#").isdigit():
            match |= Q(id=int(q.lstrip("#")))
        rows = rows.filter(match)
    return rows


def version_filters(query: dict) -> dict[str, list[dict]]:
    """The By filter's options, the system among them, counted against `query`."""
    return facets(
        versions,
        query,
        {"by": "updated_by__email"},
        none={"by": SYSTEM},
        labels={"by": emails_to_names},
    )


def version_rows(listed) -> list[dict]:
    """Each version from `versions()` as the history shows it (#138)."""
    config = LookupConfiguration.objects.select_related("current_version").get()
    current_is_baseline = is_baseline(config.current_version)
    return [
        {
            "id": version.id,
            "created_at": version.created_at,
            "updated_by": version.updated_by.email if version.updated_by else None,
            "updated_by_name": version.updated_by.display_name
            if version.updated_by
            else None,
            "budgets_priced": version.budgets_priced,
            "current": version.id == config.current_version_id,
            # Whether the next set writes into this version. Only the current
            # one, and only until a costing is submitted on it; after that the
            # next set starts a new version, so nothing priced moves. Never the
            # baseline, which is kept as first loaded.
            "accepts_changes": (
                version.id == config.current_version_id
                and not config.referenced
                and not current_is_baseline
            ),
            # The rates as first loaded, kept so they can always be restored.
            "baseline": (
                version.updated_by_id is None and not version.change_sets.all()
            ),
            "change_sets": [
                {
                    "id": change_set.id,
                    "note": change_set.note,
                    "saved_by": (
                        change_set.saved_by.email if change_set.saved_by else None
                    ),
                    "saved_by_name": (
                        change_set.saved_by.display_name
                        if change_set.saved_by
                        else None
                    ),
                    "saved_at": change_set.saved_at,
                    "change_count": change_set.change_count,
                }
                for change_set in version.change_sets.all()
            ],
        }
        for version in listed
    ]


def list_versions() -> list[dict]:
    """Every version, newest first."""
    return version_rows(versions().order_by("-id"))
