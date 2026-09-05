from typing import cast

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget, Deliverable, NonStaffCostLine, StaffCostLine
from .serializers.budget_detail_serializer import BudgetDetailSerializer
from .serializers.budget_update_serializer import BudgetUpdateSerializer
from .serializers.deliverable_serializer import DeliverableSerializer
from .serializers.non_staff_line_serializer import NonStaffLineSerializer
from .serializers.staff_line_serializer import StaffLineSerializer
from .services import (
    budget_details,
    budget_update,
    deliverable,
    non_staff_line,
    staff_line,
)


class BudgetDetailView(APIView):
    def get(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(Budget, id=budget_id)

        result = budget_details.get_budget_details(budget)

        serializer = BudgetDetailSerializer(result)

        return Response(serializer.data)

    def patch(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(Budget, id=budget_id)

        serializer = BudgetUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = budget_update.update_field(
            budget, cast(dict, serializer.validated_data)
        )

        if result is not None:
            result_serializer = BudgetDetailSerializer(result)
            return Response(
                result_serializer.data,
                status=status.HTTP_200_OK,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffLineView(APIView):
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
    def post(self, request: Request, budget_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)

        serializer = DeliverableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        deliverable.create(budget, cast(dict, serializer.validated_data))

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request: Request, budget_id: int, deliverable_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(Budget, id=budget_id)
        # Check that the deliverable belongs to the budget
        item = get_object_or_404(Deliverable, id=deliverable_id, budget=budget)

        deliverable.delete(item)

        return Response(status=status.HTTP_204_NO_CONTENT)
