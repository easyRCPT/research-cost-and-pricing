from typing import cast

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget, Deliverable, NonStaffCostLine, StaffCostLine
from .serializers.budget_detail_serializer import BudgetDetailSerializer
from .serializers.budget_update_serializer import (
    UPDATE_SERIALIZERS,
    BudgetUpdateSchema,
    SectionSerializer,
)
from .serializers.deliverable_serializer import DeliverableSerializer
from .serializers.lookup_serializer import LookupTablesSerializer
from .serializers.non_staff_line_serializer import NonStaffLineSerializer
from .serializers.staff_line_serializer import StaffLineSerializer
from .services import (
    budget_details,
    budget_update,
    deliverable,
    lookups,
    non_staff_line,
    staff_line,
)


class BudgetDetailView(APIView):
    @extend_schema(responses=BudgetDetailSerializer)
    def get(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(Budget, id=budget_id)
        result = budget_details.get_budget_details(budget)
        serializer = BudgetDetailSerializer(result)
        return Response(serializer.data)

    @extend_schema(
        request=BudgetUpdateSchema,
        responses={200: BudgetDetailSerializer, 204: None},
    )
    def patch(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(Budget, id=budget_id)
        envelope = SectionSerializer(data=request.data)
        envelope.is_valid(raise_exception=True)
        section: str = cast(dict, envelope.validated_data)["section"]

        serializer = UPDATE_SERIALIZERS[section](data=request.data)
        serializer.is_valid(raise_exception=True)
        data = {"section": section, **cast(dict, serializer.validated_data)}

        result = budget_update.update_field(budget, data)
        if result is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(BudgetDetailSerializer(result).data, status=status.HTTP_200_OK)

class StaffLineView(APIView):
    @extend_schema(request=StaffLineSerializer, responses={201: BudgetDetailSerializer})
    def post(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(Budget, id=budget_id)
        serializer = StaffLineSerializer(
            data=request.data,
            context={"budget": budget},
        )
        serializer.is_valid(raise_exception=True)
        result = staff_line.create(budget, cast(dict, serializer.validated_data))
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses=BudgetDetailSerializer)
    def delete(self, request: Request, budget_id: int, line_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        # Check that the line belongs to the budget
        line = get_object_or_404(StaffCostLine, id=line_id, budget=budget)
        result = staff_line.delete(budget, line)
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK,
        )


class NonStaffLineView(APIView):
    @extend_schema(request=NonStaffLineSerializer, responses={201: BudgetDetailSerializer})
    def post(self, request: Request, budget_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        serializer = NonStaffLineSerializer(
            data=request.data,
            context={"budget": budget},
        )
        serializer.is_valid(raise_exception=True)
        result = non_staff_line.create(budget, cast(dict, serializer.validated_data))
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses={200: BudgetDetailSerializer})
    def delete(self, request: Request, budget_id: int, line_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        # Check that the line belongs to the budget
        line = get_object_or_404(NonStaffCostLine, id=line_id, budget=budget)
        result = non_staff_line.delete(budget, line)
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK,
        )


class DeliverableView(APIView):
    @extend_schema(request=DeliverableSerializer, responses={201: None})
    def post(self, request: Request, budget_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        serializer = DeliverableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deliverable.create(budget, cast(dict, serializer.validated_data))
        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    def delete(self, request: Request, budget_id: int, deliverable_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        # Check that the deliverable belongs to the budget
        item = get_object_or_404(Deliverable, id=deliverable_id, budget=budget)

        deliverable.delete(item)

        return Response(status=status.HTTP_204_NO_CONTENT)

class LookupView(APIView):
    @extend_schema(responses=LookupTablesSerializer)
    def get(self, request: Request) -> Response:
        tables = lookups.get_lookup_tables()
        return Response(LookupTablesSerializer(tables).data)
