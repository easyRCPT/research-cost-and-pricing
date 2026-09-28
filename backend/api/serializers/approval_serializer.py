from rest_framework import serializers

from api.models import ApprovalStep


class ApprovalQueueBudgetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    # So the decision panel can open the full budget (#98), whose screens are
    # addressed by project.
    project_id = serializers.IntegerField(source="project.id")
    reference = serializers.CharField(source="project.reference", allow_null=True)
    project_title = serializers.CharField(source="project.title")
    # The first thing an approver scans for: a different owner on every row.
    submitted_by = serializers.SerializerMethodField()
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

    def get_submitted_by(self, budget) -> str:
        owner = budget.project.created_by
        return f"{owner.first_name} {owner.last_name}".strip() or owner.email


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


class ApprovalDecisionResultSerializer(serializers.Serializer):
    """Where the budget went, so the screen says so rather than guessing."""

    budget_status = serializers.CharField()
