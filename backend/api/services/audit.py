from api.models import AuditLog


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


# The most the audit screen asks for at once (#67).
MAX_ENTRIES = 500


def entries(action: str = "", limit: int = 50):
    """The newest entries first, optionally one action only."""
    rows = AuditLog.objects.select_related("actor").order_by("-created_at", "-id")
    if action:
        rows = rows.filter(action=action)
    return rows[: min(limit, MAX_ENTRIES)]


def actions() -> list[str]:
    """
    The actions the log holds, read off the log itself (#67). A list kept
    beside the write_audit calls would fall behind the first new action, and
    the filter would then hide entries that exist.
    """
    return list(
        AuditLog.objects.values_list("action", flat=True).distinct().order_by("action")
    )
