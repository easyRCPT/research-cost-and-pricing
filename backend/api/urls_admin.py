"""
The /api/admin/ namespace (#63).

One include, so there is one place a superadmin route can live, and every view
reached through it declares IsSuperadmin -- which test_admin_namespace checks
by walking these patterns rather than trusting each view to remember.
"""

from django.urls import path

from .views_admin import lookups

urlpatterns = [
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
]
