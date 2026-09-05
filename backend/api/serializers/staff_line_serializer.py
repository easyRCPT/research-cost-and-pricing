from rest_framework import serializers

from ..models import OnCostRate, SalaryRate, StaffCostLine


class YearAllocationSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    time = serializers.DecimalField(
        max_digits=8,
        decimal_places=4,
    )


class StaffLineSerializer(serializers.Serializer):
    name_role = serializers.CharField(max_length=100)
    employment_type = serializers.ChoiceField(choices=OnCostRate.EmploymentType.choices)
    category = serializers.ChoiceField(choices=SalaryRate.Category.choices)
    classification = serializers.CharField(max_length=20)
    time_basis = serializers.ChoiceField(choices=StaffCostLine.TimeBasis.choices)
    in_kind = serializers.BooleanField(default=False)

    allocations = YearAllocationSerializer(many=True, required=False)

    def validate_allocations(self, allocations):
        budget = self.context["budget"]
        project = budget.project

        years = set()

        for allocation in allocations:
            year = allocation["year"]

            if not project.start_year <= year <= project.end_year:
                raise serializers.ValidationError(
                    f"Year must be between {project.start_year} and {project.end_year}."
                )

            if year in years:
                raise serializers.ValidationError(
                    "Each year can only have one allocation."
                )

            years.add(year)

        return allocations
