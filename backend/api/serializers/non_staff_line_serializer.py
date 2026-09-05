from rest_framework import serializers

from ..models import NonStaffCostCategory


class YearAmountSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


class NonStaffLineSerializer(serializers.Serializer):
    cost_group = serializers.CharField()
    expense_type = serializers.CharField()

    description = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
    )
    in_kind = serializers.BooleanField(default=False)
    add_ten_percent = serializers.BooleanField(default=False)
    indirect_rate_multiplier = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        required=False,
        allow_null=True,
    )

    amounts = YearAmountSerializer(
        many=True,
        required=False,
    )

    def validate(self, attrs):
        cost_group = attrs.pop("cost_group")
        expense_type = attrs.pop("expense_type")

        try:
            category = NonStaffCostCategory.objects.get(
                cost_category=cost_group,
                cost_subcategory=expense_type,
            )
        except NonStaffCostCategory.DoesNotExist:
            raise serializers.ValidationError("Invalid cost group or expense type.")

        attrs["category"] = category
        return attrs

    def validate_amounts(self, amounts):
        budget = self.context["budget"]
        project = budget.project

        years = set()

        for amount in amounts:
            year = amount["year"]

            if not project.start_year <= year <= project.end_year:
                raise serializers.ValidationError(
                    f"Year must be between {project.start_year} and {project.end_year}."
                )

            if year in years:
                raise serializers.ValidationError("Each year can only have one amount.")

            years.add(year)

        return amounts
