"""
The interim admin surface.

Registering these two is the whole of "how does anyone become a head of
department" until the admin console (#69, #70) ships. Django's own admin is
behind staff login and needs no work of ours, so it carries the org structure
until there is a screen for it.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Department, Faculty, User, UserOrgAssignment


@admin.register(User)
class RcptUserAdmin(UserAdmin):
    # Django's own, plus the search autocomplete needs and the department the
    # user model already carries.
    search_fields = ["username", "email", "first_name", "last_name"]
    fieldsets = (
        *(UserAdmin.fieldsets or ()),
        ("RCPT", {"fields": ("department",)}),
    )


@admin.register(Faculty)
class FacultyAdmin(admin.ModelAdmin):
    list_display = ["code", "name"]
    search_fields = ["code", "name"]
    ordering = ["name"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "school", "faculty"]
    list_filter = ["faculty"]
    search_fields = ["code", "name", "school"]
    ordering = ["name"]
    list_select_related = ["faculty"]


@admin.register(UserOrgAssignment)
class UserOrgAssignmentAdmin(admin.ModelAdmin):
    # Department for a member or a head, faculty for a dean: the check
    # constraint refuses the other way round, so both are offered and the
    # database has the final say.
    list_display = ["user", "role", "department", "faculty", "created_at"]
    list_filter = ["role", "faculty"]
    search_fields = ["user__email", "user__username", "department__name"]
    autocomplete_fields = ["user", "department", "faculty"]
    ordering = ["user__username", "role"]
    list_select_related = ["user", "department", "faculty"]
