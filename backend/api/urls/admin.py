"""
The /api/admin/ namespace (#63).

One include, so there is one place a superadmin route can live, and every view
reached through it declares IsSuperadmin -- which test_admin_namespace checks
by walking these patterns rather than trusting each view to remember.
"""

from django.urls import path

from api.views.admin import (
    audit,
    lookups,
    overview,
    projects,
    users,
)

urlpatterns = [
    # Admin
    path("overview/", overview.OverviewView.as_view(), name="admin-overview"),
    path(
        "approver-gaps/",
        overview.ApproverGapsView.as_view(),
        name="admin-approver-gaps",
    ),
    path(
        "lookups/versions/",
        lookups.LookupVersionsView.as_view(),
        name="admin-lookup-versions",
    ),
    path(
        "lookups/versions/filters/",
        lookups.LookupVersionFiltersView.as_view(),
        name="admin-lookup-version-filters",
    ),
    path(
        "lookups/versions/current/",
        lookups.LookupVersionView.as_view(),
        name="admin-lookup-version-current",
    ),
    path(
        "lookups/versions/<int:version_id>/",
        lookups.LookupVersionView.as_view(),
        name="admin-lookup-version",
    ),
    path(
        "lookups/versions/<int:version_id>/restore/",
        lookups.LookupVersionRestoreView.as_view(),
        name="admin-lookup-version-restore",
    ),
    path(
        "lookups/versions/<int:version_id>/changes/",
        lookups.LookupVersionChangesView.as_view(),
        name="admin-lookup-version-changes",
    ),
    path(
        "lookups/versions/<int:version_id>/budgets/",
        lookups.LookupVersionBudgetsView.as_view(),
        name="admin-lookup-version-budgets",
    ),
    # Before the table route, which would otherwise take "changes" for a table.
    path(
        "lookups/changes/",
        lookups.LookupChangesView.as_view(),
        name="admin-lookup-changes",
    ),
    path(
        "lookups/<str:table>/",
        lookups.LookupTableView.as_view(http_method_names=["post", "patch", "delete"]),
        name="lookup-table",
    ),
    path(
        "lookups/<str:table>/<str:key>/",
        lookups.LookupRowView.as_view(),
        name="lookup-row",
    ),
    # No route deletes a user: owners are PROTECTed, so deactivating is the
    # operation (#64).
    path("users/", users.UsersView.as_view(), name="admin-users"),
    path("users/<int:user_id>/", users.UserDetailView.as_view(), name="admin-user"),
    path(
        "users/<int:user_id>/assignments/",
        users.AssignmentsView.as_view(),
        name="admin-user-assignments",
    ),
    path(
        "users/<int:user_id>/assignments/<int:assignment_id>/",
        users.AssignmentDetailView.as_view(),
        name="admin-user-assignment",
    ),
    path("groups/", users.GroupsView.as_view(), name="admin-groups"),
    # Read-only, both: no route edits or deletes an audit entry (#67), and the
    # register does not approve or withdraw anything (#66).
    path("audit/", audit.AuditView.as_view(), name="admin-audit"),
    path(
        "audit/filters/", audit.AuditFiltersView.as_view(), name="admin-audit-filters"
    ),
    path("projects/", projects.AdminProjectsView.as_view(), name="admin-projects"),
    path(
        "projects/filters/",
        projects.AdminProjectFiltersView.as_view(),
        name="admin-project-filters",
    ),
]
