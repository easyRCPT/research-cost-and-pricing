from typing import cast

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .serializers.budget_detail_serializer import BudgetDetailSerializer
from .serializers.budget_update_serializer import BudgetUpdateSerializer
from .services import budget_details, budget_update


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

        result = budget_update.update(budget, cast(dict, serializer.validated_data))

        if result is not None:
            result_serializer = BudgetDetailSerializer(result)
            return Response(
                result_serializer.data,
                status=status.HTTP_200_OK,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
