from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .services import project


class BudgetDetailView(APIView):

    def get(self, request, budget_id):
        budget = get_object_or_404(Budget, id=budget_id)
        response = project.get_project_details(budget)

        return Response(response)