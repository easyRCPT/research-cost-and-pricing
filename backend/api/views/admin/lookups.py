from typing import cast

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget, LookupConfiguration
from api.pagination import Sorted
from api.permissions import IsSuperadmin
from api.serializers.filter_serializer import FilterOptionSerializer
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
    # Their name, or their email when they have none.
    saved_by_name = serializers.CharField(allow_null=True)
    saved_at = serializers.DateTimeField()
    change_count = serializers.IntegerField()


class VersionChangeSerializer(serializers.Serializer):
    """One change in a set: the row it named, and the values before and after."""

    table = serializers.CharField()
    op = serializers.CharField()
    key = serializers.DictField()
    before = serializers.DictField(allow_null=True)
    after = serializers.DictField(allow_null=True)


class VersionChangeSetSerializer(ChangeSetSerializer):
    changes = VersionChangeSerializer(many=True)


class LookupVersionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_by = serializers.CharField(allow_null=True)
    updated_by_name = serializers.CharField(allow_null=True)
    budgets_priced = serializers.IntegerField()
    current = serializers.BooleanField()
    accepts_changes = serializers.BooleanField()
    baseline = serializers.BooleanField()
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
    # The row's natural key, for an update or a delete. A key field can be
    # blank: an on-cost's rate for every year has no year, and some have no
    # employment type. Typed and checked against the table in the service.
    lookup = serializers.DictField(
        child=serializers.JSONField(allow_null=True), required=False
    )
    # The new values, for a create or an update.
    values = serializers.DictField(
        child=serializers.JSONField(allow_null=True), required=False
    )


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


class VersionsQuerySerializer(serializers.Serializer):
    by = serializers.ListField(child=serializers.CharField(), required=False)
    since = serializers.DateField(required=False)
    until = serializers.DateField(required=False)
    q = serializers.CharField(required=False, allow_blank=True, default="")
    ordering = serializers.CharField(required=False)


class VersionFiltersSerializer(serializers.Serializer):
    # Versions made by nobody are `system`.
    by = FilterOptionSerializer(many=True)


def versions_query(request: Request) -> dict:
    """The history's search and filters, without its sort."""
    query = VersionsQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    data = cast(dict, query.validated_data)
    return {
        "by": data.get("by"),
        "since": data.get("since"),
        "until": data.get("until"),
        "q": data["q"].strip(),
    }


@extend_schema(parameters=[VersionsQuerySerializer])
class LookupVersionsView(ListAPIView):
    """Every set of rates the tool has had, a cursor page at a time (#137)."""

    permission_classes = [IsSuperadmin]
    serializer_class = LookupVersionSerializer
    pagination_class = Sorted
    ordering = "-id"
    orderings = {
        "id": "id",
        "created_at": "created_at",
        "updated_by": "by",
        "changes": "changes",
        "budgets_priced": "budgets_priced",
    }

    def get_queryset(self):  # type: ignore[override]
        return lookup_update.versions(**versions_query(cast(Request, self.request)))

    def list(self, request: Request, *args, **kwargs) -> Response:
        page = cast(list, self.paginate_queryset(self.get_queryset()))
        return self.get_paginated_response(
            LookupVersionSerializer(lookup_update.version_rows(page), many=True).data
        )


class LookupVersionView(APIView):
    """One version, by id or the current one, for a dialog its page may not hold."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=LookupVersionSerializer)
    def get(self, request: Request, version_id: int | None = None) -> Response:
        if version_id is None:
            version_id = LookupConfiguration.objects.get().current_version_id
        version = get_object_or_404(lookup_update.versions(), id=version_id)
        return Response(
            LookupVersionSerializer(lookup_update.version_rows([version])[0]).data
        )


class LookupVersionFiltersView(APIView):
    """Every value the history's filters can take."""

    permission_classes = [IsSuperadmin]

    @extend_schema(
        parameters=[VersionsQuerySerializer], responses=VersionFiltersSerializer
    )
    def get(self, request: Request) -> Response:
        return Response(lookup_update.version_filters(versions_query(request)))


class LookupVersionChangesView(APIView):
    """The sets saved into one version, with what each change did (#138)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=VersionChangeSetSerializer(many=True))
    def get(self, request: Request, version_id: int) -> Response:
        return Response(
            VersionChangeSetSerializer(
                lookup_update.changes_in(version_id), many=True
            ).data
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
    faculties, departments and reference lists, changed in place (#70, #144). The rate tables are changed only as a set, through
    LookupChangesView.

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


class LookupRowView(APIView):
    """
    Remove a reference row nothing uses (#144), named by its key: a code, or
    a revenue category's ledger ID. Refused, saying what uses it, otherwise.
    """

    permission_classes = [IsSuperadmin]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request: Request, table: str, key: str) -> Response:
        lookup_update.delete(table=table, key=key, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
