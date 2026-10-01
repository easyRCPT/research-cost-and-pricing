from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.pagination import NewestFirst
from api.permissions import IsSuperadmin
from api.serializers.filter_serializer import FilterOptionSerializer
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
    action = serializers.ListField(child=serializers.CharField(), required=False)
    actor = serializers.ListField(child=serializers.EmailField(), required=False)
    object_type = serializers.ListField(child=serializers.CharField(), required=False)
    since = serializers.DateField(required=False)
    until = serializers.DateField(required=False)


class AuditFiltersSerializer(serializers.Serializer):
    actor = FilterOptionSerializer(many=True)
    action = FilterOptionSerializer(many=True)
    object_type = FilterOptionSerializer(many=True)


def audit_query(request: Request) -> dict:
    query = AuditQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    return cast(dict, query.validated_data)


@extend_schema(parameters=[AuditQuerySerializer])
class AuditView(ListAPIView):
    """The audit log, newest first, a cursor page at a time (#67). Read-only."""

    permission_classes = [IsSuperadmin]
    serializer_class = AuditEntrySerializer
    pagination_class = NewestFirst

    def get_queryset(self):
        return audit.entries(**audit_query(self.request))


class AuditFiltersView(APIView):
    """Every value the log's filters can take."""

    permission_classes = [IsSuperadmin]

    @extend_schema(parameters=[AuditQuerySerializer], responses=AuditFiltersSerializer)
    def get(self, request: Request) -> Response:
        return Response(audit.filters(audit_query(request)))
