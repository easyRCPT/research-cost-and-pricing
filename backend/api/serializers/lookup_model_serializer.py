from rest_framework import serializers

from api.models import (
    Activity,
    CalculationConstant,
    DeliverableType,
    Department,
    EbaIncrease,
    Faculty,
    IncrementCap,
    NonStaffCostCategory,
    OnCostRate,
    Region,
    RevenueCategory,
    SalaryRate,
    SalaryRateMultiplier,
)


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ["code", "name"]


class DepartmentSerializer(serializers.ModelSerializer):
    # Faculty is a table now. It is still echoed as the two strings it used to
    # be, so the org units tab and the department picker read the same shape.
    # Faculty name is read-only on department. It is not required when creating
    # or updating a department. Edit the Faculty directly if the name needs
    # to change.
    faculty = serializers.CharField(source="faculty.name", read_only=True)
    faculty_code = serializers.PrimaryKeyRelatedField(
        source="faculty",
        queryset=Faculty.objects.all(),
    )

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
