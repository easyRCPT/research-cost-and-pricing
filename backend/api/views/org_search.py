from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Department, Faculty
from api.serializers.lookup_model_serializer import (
    DepartmentSerializer,
    FacultySerializer,
)

RESULT_LIMIT = 20


class DepartmentSearchView(APIView):
    """Departments whose name or code contains `q`, for a picker too long to scroll."""

    @extend_schema(
        parameters=[OpenApiParameter("q", str, required=False)],
        responses=DepartmentSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        q = request.query_params.get("q", "").strip()
        found = (
            Department.objects.select_related("faculty")
            .filter(Q(name__icontains=q) | Q(code__icontains=q))
            .order_by("name")[:RESULT_LIMIT]
        )
        return Response(DepartmentSerializer(found, many=True).data)


class FacultySearchView(APIView):
    @extend_schema(
        parameters=[OpenApiParameter("q", str, required=False)],
        responses=FacultySerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        q = request.query_params.get("q", "").strip()
        found = Faculty.objects.filter(
            Q(name__icontains=q) | Q(code__icontains=q)
        ).order_by("name")[:RESULT_LIMIT]
        return Response(FacultySerializer(found, many=True).data)
