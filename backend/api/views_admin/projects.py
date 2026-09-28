from typing import cast

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget
from api.permissions import IsSuperadmin
from api.services import admin_projects


class ProjectOwnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.CharField(allow_blank=True)


class AdminProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    reference = serializers.CharField(allow_null=True)
    title = serializers.CharField(allow_blank=True)
    owner = ProjectOwnerSerializer()
    department = serializers.CharField()
    faculty = serializers.CharField()
    budget_id = serializers.IntegerField(allow_null=True)
    status = serializers.ChoiceField(choices=Budget.Status.choices, allow_null=True)
    budget_count = serializers.IntegerField()
    total_price_inc_gst = serializers.DecimalField(max_digits=14, decimal_places=2)
    updated_at = serializers.DateTimeField()


class RegisterQuerySerializer(serializers.Serializer):
    # Checked against the model's own choices (#66), so a renamed status is a
    # 400 naming the allowed values, not a filter silently matching nothing.
    status = serializers.ChoiceField(
        choices=Budget.Status.choices, required=False, allow_blank=True, default=""
    )
    q = serializers.CharField(required=False, allow_blank=True, default="")


class AdminProjectsView(APIView):
    """Every project, whoever owns it. Read-only (#66)."""

    permission_classes = [IsSuperadmin]

    @extend_schema(
        parameters=[RegisterQuerySerializer],
        responses=AdminProjectSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        query = RegisterQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        data = cast(dict, query.validated_data)
        rows = admin_projects.register(data["status"], data["q"].strip())
        return Response(AdminProjectSerializer(rows, many=True).data)
