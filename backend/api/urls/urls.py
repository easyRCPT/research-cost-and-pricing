from django.urls import path

from api.views.org_search import DepartmentSearchView, FacultySearchView
from api.views.views import (
    BudgetCloneView,
    BudgetDetailView,
    BudgetSubmitView,
    BudgetWithdrawView,
    DeliverableView,
    LookupView,
    NonStaffLineView,
    ProjectView,
    StaffLineView,
)

urlpatterns = [
    # Lookups
    path(
        "lookups/",
        LookupView.as_view(http_method_names=["get"]),
        name="lookups",
    ),
    # Pickers over the org tables, searched rather than scrolled
    path(
        "departments/",
        DepartmentSearchView.as_view(http_method_names=["get"]),
        name="department-search",
    ),
    path(
        "faculties/",
        FacultySearchView.as_view(http_method_names=["get"]),
        name="faculty-search",
    ),
    # Projects
    path(
        "projects/",
        ProjectView.as_view(http_method_names=["get", "post"]),
        name="projects",
    ),
    # Budget
    path(
        "budgets/<int:budget_id>/",
        BudgetDetailView.as_view(http_method_names=["get", "patch"]),
        name="budget-detail",
    ),
    path(
        "budgets/<int:budget_id>/submit/",
        BudgetSubmitView.as_view(http_method_names=["post"]),
        name="submission",
    ),
    path(
        "budgets/<int:budget_id>/withdraw/",
        BudgetWithdrawView.as_view(http_method_names=["post"]),
        name="withdrawal",
    ),
    path(
        "budgets/<int:budget_id>/clone/",
        BudgetCloneView.as_view(http_method_names=["post"]),
        name="clone",
    ),
    # Staff lines
    path(
        "budgets/<int:budget_id>/staff-lines/",
        StaffLineView.as_view(http_method_names=["post"]),
        name="staff-line",
    ),
    path(
        "budgets/<int:budget_id>/staff-lines/<uuid:line_id>/",
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
        "budgets/<int:budget_id>/non-staff-lines/<uuid:line_id>/",
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
