from django.core.exceptions import ValidationError

from api.models import Budget, IncrementCap

from .budget_details import get_lookup_version_id_for_budget


def validate(version_id: int, classification: str) -> None:
    """Validate a classification string against the cap table."""
    level, sep, step_str = classification.rpartition(".")
    level = level or classification

    cap = IncrementCap.objects.filter(level=level, version_id=version_id).first()
    if not cap:
        # Reject classification not recorded in database.
        raise ValidationError(f"Unknown level: '{level}'.")

    if cap.max_steps == 0:
        # Reject classification like "UOM 10.1" if UOM 10 is stepless.
        if sep:
            raise ValidationError(f"'{level}' is stepless and takes no step.")
        return

    if not sep or not step_str.isdigit():
        # Reject stepped classification with no step.
        raise ValidationError(
            f"Invalid classification '{classification}': expected '<level>.<step>'."
        )

    step = int(step_str)
    if not (1 <= step <= cap.max_steps):
        raise ValidationError(
            f"Step {step} out of range for '{level}' (max {cap.max_steps})."
        )


def validate_with_budget(budget: Budget, classification: str) -> None:
    version_id = get_lookup_version_id_for_budget(budget)
    validate(version_id, classification)
