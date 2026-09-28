"""
The /api/admin/ namespace (#63).

One include, so there is one place a superadmin route can live, and every view
reached through it declares IsSuperadmin -- which test_admin_namespace checks
by walking these patterns rather than trusting each view to remember.
"""

from django.urls import path

from .views_admin import audit, lookups, overview, projects, users

urlpatterns = [
    path("overview/", overview.OverviewView.as_view(), name="admin-overview"),
    path(
        "lookups/versions/",
        lookups.LookupVersionsView.as_view(),
        name="admin-lookup-versions",
    ),
    path(
        "lookups/versions/<int:version_id>/restore/",
        lookups.LookupVersionRestoreView.as_view(),
        name="admin-lookup-version-restore",
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
        "audit/actions/", audit.AuditActionsView.as_view(), name="admin-audit-actions"
    ),
    path("projects/", projects.AdminProjectsView.as_view(), name="admin-projects"),
]
