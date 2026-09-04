from rest_framework import serializers


class BudgetUpdateSerializer(serializers.Serializer):
    section = serializers.ChoiceField(
        choices=[
            "project",
            "budget",
            "staff",
            "non_staff",
        ]
    )
    row_id = serializers.IntegerField(
        required=False,
        allow_null=True,
    )
    field = serializers.CharField()
    value = serializers.JSONField()

    def validate(self, attrs):
        section = attrs["section"]
        row_id = attrs.get("row_id")

        if section in {"staff", "non_staff"} and row_id is None:
            raise serializers.ValidationError(
                {"row_id": "This field is required for staff and non_staff."}
            )

        if section in {"project", "budget"} and row_id is not None:
            raise serializers.ValidationError(
                {"row_id": "This field is not allowed for project or budget."}
            )

        return attrs
