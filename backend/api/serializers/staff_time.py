from rest_framework import serializers

from ..models import StaffCostLine

# An FTE row is a fraction of one full-time position. Daily and hourly rows count
# days and hours, which the workbook leaves open-ended; a full year is as much as
# either can mean.
TIME_LIMITS = {
    StaffCostLine.TimeBasis.FTE: ("FTE", 1),
    StaffCostLine.TimeBasis.DAILY: ("Days", 366),
    StaffCostLine.TimeBasis.HOURLY: ("Hours", 366 * 24),
}


def check_time_against_basis(time_basis: str | None, entries: list[dict]) -> None:
    """Raise if any entry breaks the cap its time basis carries."""
    label, maximum = TIME_LIMITS.get(time_basis, (None, None))

    for entry in entries:
        time = entry["time"]

        if time < 0:
            raise serializers.ValidationError(
                f"Time for {entry['year']} cannot be negative."
            )

        if maximum is not None and time > maximum:
            raise serializers.ValidationError(
                f"{label} for {entry['year']} must be between 0 and {maximum}."
            )
