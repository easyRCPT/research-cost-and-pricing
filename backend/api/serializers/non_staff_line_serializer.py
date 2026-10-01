from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from api.models import NonStaffCostCategory
from api.services.budget_details import get_lookup_version_for_budget
from api.services.budget_update import refuse_ten_percent

from .line_id import validate_new_line_id


class YearAmountSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )


@extend_schema_serializer(component_name="NonStaffLineInput")
class NonStaffLineSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False, validators=[validate_new_line_id])
    cost_group = serializers.CharField()
    expense_type = serializers.CharField()

    description = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
    )
    in_kind = serializers.BooleanField(default=False)
    in_kind_reason = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
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
        version = get_lookup_version_for_budget(self.context["budget"])

        try:
            category = NonStaffCostCategory.objects.get(
                cost_category=cost_group,
                cost_subcategory=expense_type,
                version=version,
            )
        except NonStaffCostCategory.DoesNotExist:
            raise serializers.ValidationError("Invalid cost group or expense type.")

        attrs["category"] = category
        if attrs.get("add_ten_percent"):
            refuse_ten_percent(category)
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
