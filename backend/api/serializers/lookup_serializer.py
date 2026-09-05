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


class LookupTablesSerializer(serializers.Serializer):
    departments = DepartmentSerializer(many=True)
    salary_rates = SalaryRateSerializer(many=True)
    salary_rate_multipliers = SalaryRateMultiplierSerializer(many=True)
    increment_caps = IncrementCapSerializer(many=True)
    eba_increases = EbaIncreaseSerializer(many=True)
    on_cost_rates = OnCostRateSerializer(many=True)
    non_staff_cost_categories = NonStaffCostCategorySerializer(many=True)
    minimum_cost_recovery_multipliers = MinimumCostRecoveryMultiplierSerializer(many=True)
    calculation_constants = CalculationConstantSerializer(many=True)
    activities = ActivitySerializer(many=True)
    regions = RegionSerializer(many=True)
    deliverable_types = DeliverableTypeSerializer(many=True)
    revenue_categories = RevenueCategorySerializer(many=True)
