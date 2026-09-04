from django.urls import path

from .views import BudgetDetailView

urlpatterns = [
    path("budgets/<int:budget_id>/", BudgetDetailView.as_view(), name="budget_detail"),
]
