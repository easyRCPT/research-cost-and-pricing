from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsSuperadmin
from api.services import lookup_update


class LookupVersionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_by = serializers.CharField(allow_null=True)
    budgets_priced = serializers.IntegerField()
    current = serializers.BooleanField()


class RestoredSerializer(serializers.Serializer):
    version_id = serializers.IntegerField()


class LookupVersionsView(APIView):
    """Every set of rates the tool has had, newest first (#137)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=LookupVersionSerializer(many=True))
    def get(self, request: Request) -> Response:
        return Response(
            LookupVersionSerializer(lookup_update.list_versions(), many=True).data
        )


class LookupVersionRestoreView(APIView):
    """Make an older set of rates current again, as a new version (#137)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(request=None, responses=RestoredSerializer)
    def post(self, request: Request, version_id: int) -> Response:
        restored = lookup_update.restore_version(version_id, request.user)
        return Response(RestoredSerializer({"version_id": restored}).data)
