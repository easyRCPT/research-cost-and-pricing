from rest_framework import serializers

from ..models import DeliverableType


class DeliverableSerializer(serializers.Serializer):
    number = serializers.IntegerField(min_value=1)
    description = serializers.CharField(max_length=200)

    # DeliverableType code
    deliverable_type = serializers.SlugRelatedField(
        slug_field="code",
        queryset=DeliverableType.objects.all(),
    )

    invoice_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    due_date = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
    dependency = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    sponsor = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )
