from rest_framework import serializers

from ..models import StaffCostLine

# An FTE row is a fraction of one full-time position. Daily and hourly rows count
# days and hours, which the workbook leaves open-ended above zero.
MAX_FTE = 1


def check_time_against_basis(time_basis: str | None, entries: list[dict]) -> None:
    """Raise if any entry breaks the cap its time basis carries."""
    for entry in entries:
        time = entry["time"]

        if time < 0:
            raise serializers.ValidationError(
                f"Time for {entry['year']} cannot be negative."
            )

        if time_basis == StaffCostLine.TimeBasis.FTE and time > MAX_FTE:
            raise serializers.ValidationError(
                f"FTE for {entry['year']} must be between 0 and {MAX_FTE}."
            )
