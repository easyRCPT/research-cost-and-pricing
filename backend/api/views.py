from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .serializers import ProjectDetailSerializer
from .services import budget_details, budget_update


class BudgetDetailView(APIView):
    def get(self, request, budget_id):
        budget = get_object_or_404(Budget, id=budget_id)

        result = budget_details.get_budget_details(budget)

        serializer = ProjectDetailSerializer(result)

        return Response(serializer.data)


    def patch(self, request, budget_id):
        budget = get_object_or_404(Budget, id=budget_id)

        result = budget_update.update_budget(budget, request.data)

        if result is not None:
            serializer = ProjectDetailSerializer(result)
            return Response(serializer.data)

        return Response(status=status.HTTP_204_NO_CONTENT)
