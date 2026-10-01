from django.utils import timezone
from rest_framework import serializers

from ..models import Budget, Department
from ..services.project import NO_BUDGET
from .budget_detail_serializer import CostDecimalField
from .filter_serializer import FilterOptionSerializer


class ProjectOwnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.CharField(allow_blank=True)


class ProjectListQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, default="")
    # Checked against the model's own choices, as the console's register does
    # (#66), so a renamed status is a 400 naming the allowed values rather
    # than a filter silently matching nothing (#98).
    status = serializers.ListField(
        child=serializers.ChoiceField(choices=[*Budget.Status.values, NO_BUDGET]),
        required=False,
    )
    faculty = serializers.ListField(child=serializers.CharField(), required=False)
    department = serializers.ListField(child=serializers.CharField(), required=False)
    owner = serializers.ListField(child=serializers.EmailField(), required=False)
    ordering = serializers.CharField(
        required=False, help_text="A column, with - in front for descending."
    )


def list_query(request, serializer=ProjectListQuerySerializer) -> dict:
    """The list's search and filters as `narrow` takes them, without its sort."""
    query = serializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    data = dict(query.validated_data)
    data.pop("ordering", None)
    return data


class ProjectFiltersSerializer(serializers.Serializer):
    status = FilterOptionSerializer(many=True)
    faculty = FilterOptionSerializer(many=True)
    department = FilterOptionSerializer(many=True)
    owner = FilterOptionSerializer(many=True)


class ProjectRowSerializer(serializers.Serializer):
    """One line of the projects list."""

    id = serializers.IntegerField()
    reference = serializers.CharField()
    title = serializers.CharField(allow_blank=True)
    chief_investigator = serializers.CharField(allow_blank=True)
    funder = serializers.CharField(allow_blank=True)
    department = serializers.CharField(allow_blank=True)
    faculty = serializers.CharField(allow_blank=True)

    start_year = serializers.IntegerField()
    end_year = serializers.IntegerField(allow_null=True)

    # The budget the row opens: the most recently touched one. Null, with a
    # count of zero, for a project whose budgets have been deleted.
    budget_id = serializers.IntegerField(allow_null=True)
    status = serializers.ChoiceField(choices=Budget.Status.choices, allow_null=True)
    budget_count = serializers.IntegerField()

    total_price_inc_gst = CostDecimalField(max_digits=14, decimal_places=2)

    updated_at = serializers.DateTimeField()
    owner = ProjectOwnerSerializer()


class ProjectCreateSerializer(serializers.Serializer):
    """
    What it takes to start a project: nothing. New project opens the costing
    straight away, and Project Details asks for the rest.
    """

    title = serializers.CharField(max_length=200, required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )

    funder = serializers.CharField(max_length=100, required=False, allow_blank=True)
    chief_investigator = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    scheme = serializers.CharField(max_length=200, required=False, allow_blank=True)

    start_year = serializers.IntegerField(
        min_value=2000, max_value=2100, required=False
    )
    start_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    end_year = serializers.IntegerField(
        min_value=2000, max_value=2100, required=False, allow_null=True
    )
    end_month = serializers.IntegerField(
        min_value=1, max_value=12, required=False, allow_null=True
    )

    def validate(self, attrs):
        attrs.setdefault("start_year", timezone.localdate().year)
        attrs.setdefault("start_month", 1)
        if attrs.get("end_year") is None or attrs.get("end_month") is None:
            return attrs
        start = (attrs["start_year"], attrs["start_month"])
        end = (attrs["end_year"], attrs["end_month"])
        if end < start:
            raise serializers.ValidationError(
                "The project cannot end before it starts."
            )
        return attrs
