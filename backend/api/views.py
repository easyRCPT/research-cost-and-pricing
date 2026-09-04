from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .serializers import ProjectDetailSerializer
from .services import budget_details


class BudgetDetailView(APIView):
    def get(self, request, budget_id):
        budget = get_object_or_404(Budget, id=budget_id)

        result = budget_details.get_project_details(budget)

        serializer = ProjectDetailSerializer(result)

        return Response(serializer.data)
