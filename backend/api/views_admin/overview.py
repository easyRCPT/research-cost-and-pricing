from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget
from api.permissions import IsSuperadmin
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
