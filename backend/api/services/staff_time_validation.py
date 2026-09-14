from decimal import Decimal

from rest_framework.exceptions import ValidationError

# An FTE row is a fraction of one full-time position.
# Daily and hourly rows count days and hours, which the workbook leaves open-ended.
# Maximum 220 working days in a year from Salary Rate Multiplier
TIME_LIMITS = {
    "FTE": Decimal(1),
    "Daily": Decimal(220),
    "Hourly": Decimal(366 * 24),
}


def check_time_against_basis(
    time_basis: str | None,
    entries: list[dict],
) -> None:
    if time_basis is None:
        return

    for entry in entries:
        check_time(time_basis, entry["time"], year=entry["year"])


def check_time(
    time_basis: str,
    time: Decimal,
    year: int | None = None,
) -> None:
    """
    Validate time against the limit for its time basis.
    """
    max_value = TIME_LIMITS[time_basis]

    if time > max_value:
        if year is not None:
            raise ValidationError(
                f"Time for {year} cannot exceed {max_value} for time basis '{time_basis}'."
            )

        raise ValidationError(
            f"Time cannot exceed {max_value} for time basis '{time_basis}'."
        )
