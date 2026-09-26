from rest_framework import serializers

from api.models import ApprovalStep


class ApprovalQueueBudgetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    project_title = serializers.CharField(source="project.title")
    department = serializers.CharField(source="project.department.name")
    faculty = serializers.CharField(source="project.department.faculty.name")
    chief_investigator = serializers.CharField(source="project.chief_investigator")

    total_price_inc_gst = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
    )
    margin = serializers.DecimalField(
        max_digits=5,
        decimal_places=4,
    )
    submitted_at = serializers.DateTimeField()


class ApprovalQueueSerializer(serializers.ModelSerializer):
    step_id = serializers.IntegerField(source="id")
    level = serializers.CharField()
    budget = ApprovalQueueBudgetSerializer()
    dean_triggers = serializers.ListField(
        source="budget.dean_triggers",
        child=serializers.CharField(),
    )

    class Meta:
        model = ApprovalStep
        fields = [
            "step_id",
            "level",
            "budget",
            "dean_triggers",
        ]


class ApprovalDecideSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=("approve", "reject"),
    )
    comment = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )
