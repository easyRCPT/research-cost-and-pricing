from rest_framework.permissions import BasePermission

from .services.auth import SUPERADMIN, groups_of


class IsSuperadmin(BasePermission):
    """Members of the superadmin group. Django's is_superuser flag doesn't count."""

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        return request.user.is_authenticated and SUPERADMIN in groups_of(request.user)
