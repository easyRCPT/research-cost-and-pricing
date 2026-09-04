from rest_framework import serializers

from .models import Deliverable

# ------------------------------------------------------------------
# Serializers for database CRUD operations.
# Currently not used.
# ------------------------------------------------------------------


class DeliverableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deliverable
        fields = [
            "number",
            "description",
            "deliverable_type",
            "invoice_amount",
            "due_date",
            "dependency",
            "sponsor",
        ]
