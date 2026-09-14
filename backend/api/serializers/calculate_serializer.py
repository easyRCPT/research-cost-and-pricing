from decimal import Decimal

# TODO: temporary. Delete this file when auth lands and the frontend goes back
# to the budget routes.
"""Input side of the stateless calculator."""

from drf_spectacular.utils import extend_schema_serializer
from rest_framework import serializers

from ..models import Budget, OnCostRate, Project, SalaryRate, StaffCostLine
from ..services.staff_time_validation import check_time_against_basis


class ProjectInfoInputSerializer(serializers.Serializer):
    """Only the date fields reach the engine; the rest are echoed back."""

    title = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    chief_investigator = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    funder = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    department = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    faculty = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    scheme = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )

    start_year = serializers.IntegerField()
    start_month = serializers.IntegerField(min_value=1, max_value=12)
    end_year = serializers.IntegerField()
    end_month = serializers.IntegerField(min_value=1, max_value=12)

    company = serializers.CharField(
        required=False, allow_blank=True, default=Project.COMPANY_CODE
    )
    cost_centre = serializers.CharField(required=False, allow_blank=True, default="")
    activity = serializers.CharField(required=False, allow_null=True, default=None)
    region = serializers.CharField(required=False, allow_null=True, default=None)
    additional_information = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    other_funder = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    other_funder_category = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )

    def validate(self, attrs):
        start = (attrs["start_year"], attrs["start_month"])
        end = (attrs["end_year"], attrs["end_month"])
        if start > end:
            raise serializers.ValidationError("Project ends before it starts.")
        return attrs


class DeliverableInputSerializer(serializers.Serializer):
    """Echoed back untouched."""

    number = serializers.IntegerField()
    description = serializers.CharField(required=False, allow_blank=True, default="")
    deliverable_type = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    invoice_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, default=None
    )
    due_date = serializers.CharField(required=False, allow_blank=True, default="")
    dependency = serializers.IntegerField(required=False, allow_null=True, default=None)
    sponsor = serializers.CharField(required=False, allow_blank=True, default="")


class BudgetInfoInputSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=Budget.Mode.choices, default=Budget.Mode.FULL
    )

    cost_multiplier = serializers.DecimalField(max_digits=4, decimal_places=2)
    in_kind_multiplier = serializers.DecimalField(max_digits=4, decimal_places=2)
    margin = serializers.DecimalField(
        max_digits=5, decimal_places=4, required=False, default=Decimal("0.30")
    )

    gst_applicable = serializers.BooleanField(default=True)
    cash_co_contribution = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=0
    )

    comments = serializers.CharField(required=False, allow_blank=True, default="")
    justification = serializers.CharField(required=False, allow_blank=True, default="")
    justification_notes = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    dean_exemption_reason = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    status = serializers.ChoiceField(
        choices=Budget.Status.choices, default=Budget.Status.DRAFT
    )

    deliverables = DeliverableInputSerializer(many=True, required=False, default=list)


class StaffYearInputSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    time = serializers.DecimalField(max_digits=8, decimal_places=4)


@extend_schema_serializer(component_name="CalculateStaffLine")
class StaffLineInputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name_role = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    employment_type = serializers.ChoiceField(choices=OnCostRate.EmploymentType.choices)
    category = serializers.ChoiceField(choices=SalaryRate.Category.choices)
    classification = serializers.CharField(max_length=20)
    time_basis = serializers.ChoiceField(choices=StaffCostLine.TimeBasis.choices)
    in_kind = serializers.BooleanField(default=False)

    by_year = StaffYearInputSerializer(many=True, required=False, default=list)

    def validate(self, attrs):
        check_time_against_basis(attrs["time_basis"], attrs["by_year"])
        return attrs


class NonStaffYearInputSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)


@extend_schema_serializer(component_name="CalculateNonStaffLine")
class NonStaffLineInputSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cost_group = serializers.CharField()
    expense_type = serializers.CharField()
    description = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )
    in_kind = serializers.BooleanField(default=False)
    add_ten_percent = serializers.BooleanField(default=False)
    indirect_rate_multiplier = serializers.DecimalField(
        max_digits=4, decimal_places=2, required=False, allow_null=True, default=None
    )

    by_year = NonStaffYearInputSerializer(many=True, required=False, default=list)


@extend_schema_serializer(component_name="CalculateRequest")
class CalculateRequestSerializer(serializers.Serializer):
    """The whole budget, in one request."""

    project_info = ProjectInfoInputSerializer()
    budget_info = BudgetInfoInputSerializer()
    staff_lines = StaffLineInputSerializer(many=True, required=False, default=list)
    non_staff_lines = NonStaffLineInputSerializer(
        many=True, required=False, default=list
    )

    @staticmethod
    def _check_unique_years(rows, label):
        for row in rows:
            years = [entry["year"] for entry in row["by_year"]]
            if len(years) != len(set(years)):
                raise serializers.ValidationError(
                    f"{label} line {row['id']} has the same year more than once."
                )

    def validate(self, attrs):
        self._check_unique_years(attrs["staff_lines"], "Staff")
        self._check_unique_years(attrs["non_staff_lines"], "Non-staff")

        ids = [row["id"] for row in attrs["staff_lines"]]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Staff line ids must be unique.")

        ids = [row["id"] for row in attrs["non_staff_lines"]]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Non-staff line ids must be unique.")

        return attrs
