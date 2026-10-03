from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Budget, Project
from api.pagination import Sorted
from api.permissions import IsSuperadmin
from api.serializers.project_serializer import (
    ProjectFiltersSerializer,
    ProjectListQuerySerializer,
    ProjectOwnerSerializer,
    list_query,
)
from api.services import admin_projects
from api.services.project import SORTS, filter_options, narrow


class AdminProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    reference = serializers.CharField(allow_null=True)
    title = serializers.CharField(allow_blank=True)
    owner = ProjectOwnerSerializer()
    department = serializers.CharField()
    # So a department's move can say how many of its costings wait on a dean (#70).
    department_code = serializers.CharField()
    faculty = serializers.CharField()
    budget_id = serializers.IntegerField(allow_null=True)
    status = serializers.ChoiceField(choices=Budget.Status.choices, allow_null=True)
    budget_count = serializers.IntegerField()
    total_price_inc_gst = serializers.DecimalField(max_digits=14, decimal_places=2)
    updated_at = serializers.DateTimeField()


class RegisterQuerySerializer(ProjectListQuerySerializer):
    # So a department's move can count its costings (#70).
    department_code = serializers.CharField(required=False)


@extend_schema(parameters=[RegisterQuerySerializer])
class AdminProjectsView(ListAPIView):
    """Every project, whoever owns it, a cursor page at a time. Read-only (#66)."""

    permission_classes = [IsSuperadmin]
    serializer_class = AdminProjectSerializer
    pagination_class = Sorted
    ordering = "-updated_at"
    orderings = SORTS

    def get_queryset(self):
        data = list_query(self.request, RegisterQuerySerializer)
        code = data.pop("department_code", None)
        projects = narrow(admin_projects.register(), **data)
        return projects.filter(department_id=code) if code else projects

    def paginate_queryset(self, queryset):
        page = super().paginate_queryset(queryset)
        return [admin_projects.row(project) for project in page or []]


class AdminProjectFiltersView(APIView):
    """Every value the register's filters can take."""

    permission_classes = [IsSuperadmin]

    @extend_schema(
        parameters=[ProjectListQuerySerializer], responses=ProjectFiltersSerializer
    )
    def get(self, request: Request) -> Response:
        return Response(
            filter_options(
                Project.objects.all(), Budget.objects.all(), list_query(request)
            )
        )
