from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget
from api.permissions import IsSuperadmin
from api.services import approver_gaps
from api.services.admin_overview import overview

from .audit import AuditEntrySerializer
from .lookups import LookupVersionSerializer


class GroupCountSerializer(serializers.Serializer):
    group = serializers.CharField()
    count = serializers.IntegerField()


class AccountsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    inactive = serializers.IntegerField()
    by_group = GroupCountSerializer(many=True)
    no_group = serializers.IntegerField()


class StatusCountSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Budget.Status.choices)
    label = serializers.CharField()
    count = serializers.IntegerField()


class ProjectsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    by_status = StatusCountSerializer(many=True)
    faculties = serializers.IntegerField()


class VersionsSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    latest = LookupVersionSerializer(many=True)


class OverviewSerializer(serializers.Serializer):
    accounts = AccountsSummarySerializer()
    projects = ProjectsSummarySerializer()
    versions = VersionsSummarySerializer()
    recent = AuditEntrySerializer(many=True)


class OverviewView(APIView):
    """The console's landing screen, in one request (#94)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=OverviewSerializer)
    def get(self, request: Request) -> Response:
        return Response(OverviewSerializer(overview()).data)


class StrandedSerializer(serializers.Serializer):
    budget_id = serializers.IntegerField()
    project_id = serializers.IntegerField()
    reference = serializers.CharField(allow_null=True)
    title = serializers.CharField(allow_blank=True)
    owner = serializers.EmailField()
    status = serializers.ChoiceField(choices=Budget.Status.choices)
    level = serializers.ChoiceField(choices=["department", "faculty"])
    unit = serializers.CharField()
    submitted_at = serializers.DateTimeField(allow_null=True)


class ApproverGapsSerializer(serializers.Serializer):
    stranded = StrandedSerializer(many=True)
    departments_without_head = serializers.ListField(child=serializers.CharField())
    faculties_without_dean = serializers.ListField(child=serializers.CharField())


class ApproverGapsView(APIView):
    """Costings waiting on a role nobody holds, and the units missing one (#121)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=ApproverGapsSerializer)
    def get(self, request: Request) -> Response:
        return Response(ApproverGapsSerializer(approver_gaps.gaps()).data)
