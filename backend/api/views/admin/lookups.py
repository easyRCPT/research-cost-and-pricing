from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget
from api.permissions import IsSuperadmin
from api.serializers.lookup_serializer import (
    LookupCreateSerializer,
    LookupUpdateSerializer,
)
from api.services import lookup_changes, lookup_update
from api.services.lookup_definitions import LOOKUP_DEFINITIONS


class ChangeSetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    note = serializers.CharField(allow_blank=True)
    saved_by = serializers.CharField(allow_null=True)
    saved_at = serializers.DateTimeField()
    change_count = serializers.IntegerField()


class LookupVersionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_by = serializers.CharField(allow_null=True)
    budgets_priced = serializers.IntegerField()
    current = serializers.BooleanField()
    accepts_changes = serializers.BooleanField()
    change_sets = ChangeSetSerializer(many=True)


class PricedOnSerializer(serializers.Serializer):
    """Who was priced on the version the rates just moved away from (#142)."""

    version_id = serializers.IntegerField()
    in_review = serializers.IntegerField()
    approved = serializers.IntegerField()


class RestoredSerializer(serializers.Serializer):
    version_id = serializers.IntegerField()
    replaced = PricedOnSerializer()


class VersionBudgetOwnerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(allow_blank=True)


class VersionBudgetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    project_id = serializers.IntegerField()
    reference = serializers.CharField(allow_null=True)
    title = serializers.CharField(allow_blank=True)
    owner = VersionBudgetOwnerSerializer()
    status = serializers.ChoiceField(choices=Budget.Status.choices)
    total_price_inc_gst = serializers.DecimalField(max_digits=14, decimal_places=2)
    submitted_at = serializers.DateTimeField(allow_null=True)


VERSIONED_TABLES = [
    name for name, definition in LOOKUP_DEFINITIONS.items() if definition.versioned
]


class LookupChangeSerializer(serializers.Serializer):
    table = serializers.ChoiceField(choices=VERSIONED_TABLES)
    op = serializers.ChoiceField(choices=lookup_changes.OPS)
    # The row's natural key, for an update or a delete.
    lookup = serializers.DictField(child=serializers.JSONField(), required=False)
    # The new values, for a create or an update.
    values = serializers.DictField(child=serializers.JSONField(), required=False)


class LookupChangesSerializer(serializers.Serializer):
    note = serializers.CharField(
        max_length=200, allow_blank=True, required=False, default=""
    )
    changes = LookupChangeSerializer(many=True, allow_empty=False)


class ChangesAppliedSerializer(serializers.Serializer):
    change_set_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    new_version = serializers.BooleanField()
    # Only when the set started a new version.
    replaced = PricedOnSerializer(allow_null=True)


class LookupVersionsView(APIView):
    """Every set of rates the tool has had, newest first (#137)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=LookupVersionSerializer(many=True))
    def get(self, request: Request) -> Response:
        return Response(
            LookupVersionSerializer(lookup_update.list_versions(), many=True).data
        )


class LookupVersionBudgetsView(APIView):
    """Every costing priced on one version, newest submission first (#142)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=VersionBudgetSerializer(many=True))
    def get(self, request: Request, version_id: int) -> Response:
        return Response(
            VersionBudgetSerializer(
                lookup_update.budgets_on(version_id), many=True
            ).data
        )


class LookupVersionRestoreView(APIView):
    """Make an older set of rates current again, as a new version (#137)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(request=None, responses=RestoredSerializer)
    def post(self, request: Request, version_id: int) -> Response:
        restored = lookup_update.restore_version(version_id, request.user)
        return Response(RestoredSerializer(restored).data)


class LookupChangesView(APIView):
    """
    Save a reviewed set of rate changes, all at once or not at all (#138).

    The only way the rate tables change. A refused change refuses the whole
    set, and the error names the change by its index (`changes.<index>`).
    """

    permission_classes = [IsSuperadmin]

    @extend_schema(
        request=LookupChangesSerializer,
        responses={201: ChangesAppliedSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = LookupChangesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict, serializer.validated_data)

        applied = lookup_changes.apply_changes(
            changes=data["changes"],
            note=data["note"].strip(),
            actor=request.user,
        )
        return Response(
            ChangesAppliedSerializer(applied).data, status=status.HTTP_201_CREATED
        )


class LookupTableView(APIView):
    """
    Create or update a row of a table that does not price costings: the
    faculties, departments and reference lists. The rate tables are changed
    only as a set, through LookupChangesView.

    Moved into the admin namespace from api/lookups/..
    """

    # Only superadmins are allowed to create/update lookup tables
    permission_classes = [IsSuperadmin]

    @extend_schema(request=LookupCreateSerializer, responses={201: None})
    def post(self, request: Request, table: str) -> Response:
        serializer = LookupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        definition = lookup_update.get_definition(table)
        validated_data = cast(dict, serializer.validated_data)

        row_serializer = definition.serializer(data=validated_data["values"])
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

        # Model serializers cannot be used in lookup field validation.
        # Field validation is operated in service level.
        # Lookup dict does not require full model information.
        # 0 or >1 lookup matches raise ValidationError in the service.
        lookup_update.update(
            table=table,
            lookup=cast(dict, validated_data["lookup"]),
            data=cast(dict, validated_data["values"]),
            actor=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
