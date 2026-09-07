from rest_framework import serializers

from ..models import (
    Activity,
    CalculationConstant,
    DeliverableType,
    Department,
    EbaIncrease,
    IncrementCap,
    MinimumCostRecoveryMultiplier,
    NonStaffCostCategory,
    OnCostRate,
    Region,
    RevenueCategory,
    SalaryRate,
    SalaryRateMultiplier,
)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = [
            "code",
            "name",
            "school",
            "school_code",
            "faculty",
            "faculty_code",
            "budget_unit",
        ]


class SalaryRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryRate
        fields = ["payroll_type", "category", "classification", "rate"]


class SalaryRateMultiplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryRateMultiplier
        fields = ["time_basis", "multiplier"]


class IncrementCapSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncrementCap
        fields = ["level", "max_steps"]


class EbaIncreaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = EbaIncrease
        fields = ["year", "multiplier"]


class OnCostRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnCostRate
        fields = ["on_cost_type", "employment_type", "year", "rate"]


class NonStaffCostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = NonStaffCostCategory
        fields = ["ledger_id", "cost_category", "cost_subcategory"]


class MinimumCostRecoveryMultiplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MinimumCostRecoveryMultiplier
        fields = ["year", "multiplier"]


class CalculationConstantSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalculationConstant
        fields = ["name", "description", "value"]


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["code", "name"]


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["code", "name"]


class DeliverableTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverableType
        fields = ["code", "name"]


class RevenueCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueCategory
        fields = ["budget_ledger_id", "external_party", "description"]


LOOKUP_SERIALIZERS = {
    "departments": DepartmentSerializer,
    "salary_rates": SalaryRateSerializer,
    "salary_rate_multipliers": SalaryRateMultiplierSerializer,
    "increment_caps": IncrementCapSerializer,
    "eba_increases": EbaIncreaseSerializer,
    "on_cost_rates": OnCostRateSerializer,
    "non_staff_cost_categories": NonStaffCostCategorySerializer,
    "minimum_cost_recovery_multipliers": MinimumCostRecoveryMultiplierSerializer,
    "calculation_constants": CalculationConstantSerializer,
    "activities": ActivitySerializer,
    "regions": RegionSerializer,
    "deliverable_types": DeliverableTypeSerializer,
    "revenue_categories": RevenueCategorySerializer,
}


class LookupTablesSerializer(serializers.Serializer):
    def get_fields(self):
        fields = {}

        for name, serializer_class in LOOKUP_SERIALIZERS.items():
            fields[name] = serializer_class(many=True)

        return fields


class LookupCreateSerializer(serializers.Serializer):
    values = serializers.DictField(
        child=serializers.JSONField(),
    )


class LookupUpdateSerializer(serializers.Serializer):
    lookup = serializers.DictField(
        child=serializers.JSONField(),
    )
    values = serializers.DictField(
        child=serializers.JSONField(),
        required=False,
        default=dict,
    )
