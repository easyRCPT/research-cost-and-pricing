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
