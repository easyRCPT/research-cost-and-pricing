from datetime import date

from api.models import AuditLog
from api.services.facets import emails_to_names, facets


def write_audit(
    actor,
    action: str,
    object_type: str,
    object_id: str,
    detail: dict | None = None,
) -> None:
    AuditLog.objects.create(
        actor=actor,
        action=action,
        object_type=object_type,
        object_id=object_id,
        detail=detail or {},
    )


def entries(
    action: list[str] | None = None,
    actor: list[str] | None = None,
    object_type: list[str] | None = None,
    since: date | None = None,
    until: date | None = None,
):
    """The log, newest first, narrowed to any values given. Days are local and inclusive."""
    rows = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")
    if action:
        rows = rows.filter(action__in=action)
    if actor:
        rows = rows.filter(actor__email__in=actor)
    if object_type:
        rows = rows.filter(object_type__in=object_type)
    if since:
        rows = rows.filter(created_at__date__gte=since)
    if until:
        rows = rows.filter(created_at__date__lte=until)
    return rows


def filters(query: dict) -> dict[str, list[dict]]:
    """
    Every value each filter can take, read off the log itself (#67), counted
    against `query`. A list kept beside the write_audit calls would fall
    behind the first new action, and the filter would then hide entries that
    exist.
    """
    return facets(
        entries,
        query,
        {"actor": "actor__email", "action": "action", "object_type": "object_type"},
        labels={"actor": emails_to_names},
    )
