from rest_framework import serializers


class FilterOptionSerializer(serializers.Serializer):
    """One value a filter can take, and how many rows the other filters leave with it."""

    value = serializers.CharField(allow_blank=True)
    # A name for an email, where the value alone would not read.
    label = serializers.CharField(required=False)
    count = serializers.IntegerField()
