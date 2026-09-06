from django.urls import path

from .views import (
    BudgetDetailView,
    DeliverableView,
    LookupView,
    NonStaffLineView,
    StaffLineView,
)

urlpatterns = [
    # Lookups
    path(
        "lookups/",
        LookupView.as_view(http_method_names=["get"]),
        name="lookups",
    ),
    # Budget
    path(
        "budgets/<int:budget_id>/",
        BudgetDetailView.as_view(http_method_names=["get", "patch"]),
        name="budget-detail"
    ),
    # Staff lines
    path(
        "budgets/<int:budget_id>/staff-lines/",
        StaffLineView.as_view(http_method_names=["post"]),
        name="staff-line",
    ),
    path(
        "budgets/<int:budget_id>/staff-lines/<int:line_id>/",
        StaffLineView.as_view(http_method_names=["delete"]),
        name="staff-line-detail",
    ),
    # Non-staff lines
    path(
        "budgets/<int:budget_id>/non-staff-lines/",
        NonStaffLineView.as_view(http_method_names=["post"]),
        name="non-staff-line",
    ),
    path(
        "budgets/<int:budget_id>/non-staff-lines/<int:line_id>/",
        NonStaffLineView.as_view(http_method_names=["delete"]),
        name="non-staff-line-detail",
    ),
    # Deliverables
    path(
        "budgets/<int:budget_id>/deliverables/",
        DeliverableView.as_view(http_method_names=["post"]),
        name="deliverable",
    ),
    path(
        "budgets/<int:budget_id>/deliverables/<int:deliverable_id>/",
        DeliverableView.as_view(http_method_names=["delete"]),
        name="deliverable-detail",
    ),
]
