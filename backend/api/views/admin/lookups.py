from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import IsSuperadmin
from api.serializers.lookup_serializer import (
    LOOKUP_SERIALIZERS,
    LookupCreateSerializer,
    LookupUpdateSerializer,
)
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


class LookupTableView(APIView):
    """
    Create or update a lookup table.

    Moved into the admin namespace from api/lookups/..
    """

    # Only superadmins are allowed to create/update lookup tables
    permission_classes = [IsSuperadmin]

    @extend_schema(request=LookupCreateSerializer, responses={201: None})
    def post(self, request: Request, table: str) -> Response:
        serializer = LookupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            serializer_class = LOOKUP_SERIALIZERS[table]
        except KeyError:
            raise ValidationError(f"Invalid lookup table: {table}")

        validated_data = cast(dict, serializer.validated_data)

        row_serializer = serializer_class(data=validated_data["values"])
        row_serializer.is_valid(raise_exception=True)

        lookup_update.create(
            table=table,
            data=cast(dict, row_serializer.validated_data),
            actor=request.user,
        )

        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(request=LookupUpdateSerializer, responses={204: None})
    def patch(self, request: Request, table: str) -> Response:
        serializer = LookupUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = cast(dict, serializer.validated_data)

        lookup_update.update(
            table=table,
            lookup=cast(dict, validated_data["lookup"]),
            data=cast(dict, validated_data["values"]),
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
