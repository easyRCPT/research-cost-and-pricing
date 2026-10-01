from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsSuperadmin
from api.services import audit


class AuditEntrySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    actor_email = serializers.EmailField(
        source="actor.email", allow_null=True, default=None
    )
    # Their name, or their email when they have none.
    actor_name = serializers.CharField(
        source="actor.display_name", allow_null=True, default=None
    )
    action = serializers.CharField()
    object_type = serializers.CharField()
    object_id = serializers.CharField()
    detail = serializers.JSONField()


class AuditQuerySerializer(serializers.Serializer):
    action = serializers.CharField(required=False, default="", allow_blank=True)
    limit = serializers.IntegerField(
        required=False, default=50, min_value=1, max_value=audit.MAX_ENTRIES
    )


class AuditView(APIView):
    """The audit log, newest first (#67). Read-only: nothing edits an entry."""

    permission_classes = [IsSuperadmin]

    @extend_schema(
        parameters=[AuditQuerySerializer],
        responses=AuditEntrySerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        query = AuditQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = cast(dict, query.validated_data)
        rows = audit.entries(data["action"], data["limit"])
        return Response(AuditEntrySerializer(rows, many=True).data)


class AuditActionsView(APIView):
    """Every action the log holds, for the filter."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses={200: {"type": "array", "items": {"type": "string"}}})
    def get(self, request: Request) -> Response:
        return Response(audit.actions())
