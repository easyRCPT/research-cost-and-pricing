from django.urls import path

from .views import BudgetDetailView, DeliverableView, NonStaffLineView, StaffLineView

urlpatterns = [
    # Budget
    path("budgets/<int:budget_id>/", BudgetDetailView.as_view(), name="budget-detail"),
    # Staff lines
    path(
        "budgets/<int:budget_id>/staff-lines/",
        StaffLineView.as_view(),
        name="staff-line",
    ),
    path(
        "budgets/<int:budget_id>/staff-lines/<int:line_id>/",
        StaffLineView.as_view(),
        name="staff-line-detail",
    ),
    # Non-staff lines
    path(
        "budgets/<int:budget_id>/non-staff-lines/",
        NonStaffLineView.as_view(),
        name="non-staff-line",
    ),
    path(
        "budgets/<int:budget_id>/non-staff-lines/<int:line_id>/",
        NonStaffLineView.as_view(),
        name="non-staff-line-detail",
    ),
    # Deliverables
    path(
        "budgets/<int:budget_id>/deliverables/",
        DeliverableView.as_view(),
        name="deliverable",
    ),
    path(
        "budgets/<int:budget_id>/deliverables/<int:deliverable_id>/",
        DeliverableView.as_view(),
        name="deliverable-detail",
    ),
]
