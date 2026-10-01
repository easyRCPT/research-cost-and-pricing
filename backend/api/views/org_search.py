from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView

from api.models import Department, Faculty
from api.pagination import ByName
from api.serializers.lookup_model_serializer import (
    DepartmentSerializer,
    FacultySerializer,
)

SEARCH = extend_schema(parameters=[OpenApiParameter("q", str, required=False)])


def matching(request, queryset):
    q = request.query_params.get("q", "").strip()
    return queryset.filter(Q(name__icontains=q) | Q(code__icontains=q))


@SEARCH
class DepartmentSearchView(ListAPIView):
    """Departments whose name or code contains `q`, a page at a time by name."""

    serializer_class = DepartmentSerializer
    pagination_class = ByName

    def get_queryset(self):
        return matching(self.request, Department.objects.select_related("faculty"))


@SEARCH
class FacultySearchView(ListAPIView):
    serializer_class = FacultySerializer
    pagination_class = ByName

    def get_queryset(self):
        return matching(self.request, Faculty.objects.all())
