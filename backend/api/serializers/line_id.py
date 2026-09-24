from rest_framework import serializers

from ..models import NonStaffCostLine, StaffCostLine


def validate_new_line_id(value):
    """The browser mints a line's id, so refuse one already in use."""
    for model in (StaffCostLine, NonStaffCostLine):
        if model.objects.filter(id=value).exists():
            raise serializers.ValidationError("A line with this id already exists.")
