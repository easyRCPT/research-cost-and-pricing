from django.urls import path

from . import views_auth
from .views import (
    BudgetDetailView,
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
    path(
        "lookups/<table>/",
        LookupView.as_view(http_method_names=["post", "patch"]),
        name="lookup-table",
    ),
    # Projects
    path(
        "projects/",
        ProjectView.as_view(http_method_names=["get", "post"]),
        name="projects",
    ),
    # Auth
    path("auth/signup/", views_auth.SignupView.as_view(), name="signup"),
    path("auth/login/", views_auth.LoginView.as_view(), name="login"),
    path(
        "auth/admin-login/",
        views_auth.AdminLoginView.as_view(),
        name="admin-login",
    ),
    path("auth/logout/", views_auth.LogoutView.as_view(), name="logout"),
    path("auth/me/", views_auth.MeView.as_view(), name="me"),
    path("auth/csrf/", views_auth.CsrfView.as_view(), name="csrf"),
    # Budget
    path(
        "budgets/<int:budget_id>/",
        BudgetDetailView.as_view(http_method_names=["get", "patch"]),
        name="budget-detail",
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
