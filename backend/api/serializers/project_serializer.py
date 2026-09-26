from rest_framework import serializers

from ..models import Budget, Department
from .budget_detail_serializer import CostDecimalField


class ProjectRowSerializer(serializers.Serializer):
    """One line of the projects list."""

    id = serializers.IntegerField()
    reference = serializers.CharField()
    title = serializers.CharField()
    chief_investigator = serializers.CharField(allow_blank=True)
    funder = serializers.CharField()
    department = serializers.CharField()
    faculty = serializers.CharField()

    start_year = serializers.IntegerField()
    end_year = serializers.IntegerField()

    # The budget the row opens: the most recently touched one. Null, with a
    # count of zero, for a project whose budgets have been deleted.
    budget_id = serializers.IntegerField(allow_null=True)
    status = serializers.ChoiceField(choices=Budget.Status.choices, allow_null=True)
    budget_count = serializers.IntegerField()

    total_price_inc_gst = CostDecimalField(max_digits=14, decimal_places=2)

    updated_at = serializers.DateTimeField()


class ProjectCreateSerializer(serializers.Serializer):
    """
    What it takes to start a project.

    Only the fields a project cannot exist without: a title for the list to
    show and a department for the engine to cost against. Everything else --
    external party, duration, scheme, activity, region -- is edited afterwards
    on Project Details, so the create form does not ask for it twice.
    """

    title = serializers.CharField(max_length=200)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all())

    funder = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    chief_investigator = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    scheme = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default=""
    )

    start_year = serializers.IntegerField(min_value=2000, max_value=2100)
    start_month = serializers.IntegerField(min_value=1, max_value=12)
    end_year = serializers.IntegerField(min_value=2000, max_value=2100)
    end_month = serializers.IntegerField(min_value=1, max_value=12)

    def validate(self, attrs):
        start = (attrs["start_year"], attrs["start_month"])
        end = (attrs["end_year"], attrs["end_month"])
        if end < start:
            raise serializers.ValidationError(
                "The project cannot end before it starts."
            )
        return attrs
