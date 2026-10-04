from django.core.exceptions import ValidationError

from api.models import Budget, IncrementCap, SalaryRate

from .budget_details import get_lookup_version_id_for_budget


def get_level_step(classification: str) -> tuple[str, str, str]:
    level, sep, step_str = classification.rpartition(".")
    if not sep or not step_str.isdigit():
        return classification, "", "0"
    return level, sep, step_str


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


def update_increment_cap_in_creation(
    category: str, classification: str, version_id: int
) -> None:
    """Create or update the increment cap when a salary rate row is created."""
    level, _, step_str = get_level_step(classification)
    step = int(step_str)

    cap, created = IncrementCap.objects.get_or_create(
        category=category,
        level=level,
        version_id=version_id,
        defaults={"max_steps": step},
    )

    if not created and step > cap.max_steps:
        cap.max_steps = step
        cap.save(update_fields=["max_steps"])


def update_increment_cap_in_deletion(key: dict, version_id: int) -> None:
    """
    Adjust the increment cap after a salary rate row is deleted.

    The increment cap is only adjusted once all salary-rate rows
    for that classification have been deleted.

    Set max_step to the highest remaining classification step.
    Leaving a gap is checked and refused after all changes are applied.
    """
    category = key["category"]
    classification = key["classification"]
    level, _, _ = get_level_step(classification)

    classifications = set(
        SalaryRate.objects.filter(category=category, version=version_id).values_list(
            "classification", flat=True
        )
    )
    if classification in classifications:
        return

    steps = [
        int(step_str)
        for remaining_classification in classifications
        for level_, _, step_str in [get_level_step(remaining_classification)]
        if level_ == level and step_str != "0"
    ]

    max_steps = max(steps, default=0)

    cap = IncrementCap.objects.get(category=category, level=level, version=version_id)
    if max_steps == 0:
        cap.delete()
    else:
        cap.max_steps = max_steps
        cap.save(update_fields=["max_steps"])
