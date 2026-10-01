from django.test import TestCase

from api.models import AuditLog, User, UserOrgAssignment
from api.tests.factories import make_department, make_faculty, make_user

BASE = "/api/admin/users/"


class AdminUsersTest(TestCase):
    def setUp(self):
        self.faculty = make_faculty("ENG", "Engineering")
        self.department = make_department("CIS", self.faculty, name="Computing")
        self.admin = self.account("admin@unimelb.edu.au", "superadmin")
        self.ruth = self.account(
            "ruth@unimelb.edu.au", "staff", first="Ruth", last="Okafor"
        )
        self.client.force_login(self.admin)

    @staticmethod
    def account(email, group, first="", last="") -> User:
        user = make_user(email, groups=[group], first_name=first, last_name=last)
        if group == "superadmin":
            user.is_superuser = user.is_staff = True
            user.save()
        return user

    def patch(self, user, body):
        return self.client.patch(
            f"{BASE}{user.id}/", body, content_type="application/json"
        )

    def assign(self, user, body):
        return self.client.post(
            f"{BASE}{user.id}/assignments/", body, content_type="application/json"
        )

    # ---------------------------------------------------------------- reads

    def test_the_list_filters_on_name_and_email_with_groups_and_assignments_inline(
        self,
    ):
        UserOrgAssignment.objects.create(
            user=self.ruth, role="hod", department=self.department
        )

        (row,) = self.client.get(BASE, {"q": "okaf"}).json()

        self.assertEqual(row["email"], "ruth@unimelb.edu.au")
        self.assertEqual(row["groups"], ["staff"])
        self.assertEqual(row["assignments"][0]["role"], "hod")
        self.assertEqual(row["assignments"][0]["department_name"], "Computing")

    def test_the_list_costs_the_same_whatever_its_length(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        def queries() -> int:
            with CaptureQueriesContext(connection) as captured:
                self.client.get(BASE)
            return len(captured.captured_queries)

        # One assignment already, so the nested prefetch runs in both counts:
        # it only fires when there is something to prefetch into.
        UserOrgAssignment.objects.create(
            user=self.ruth, role="hod", department=self.department
        )
        few = queries()
        for i in range(5):
            u = self.account(f"u{i}@unimelb.edu.au", "staff")
            UserOrgAssignment.objects.create(
                user=u, role="member", department=self.department
            )
        self.assertEqual(queries(), few)

    def test_the_groups_are_the_seeded_ones(self):
        self.assertEqual(
            self.client.get("/api/admin/groups/").json(),
            ["researcher", "staff", "superadmin"],
        )

    def test_a_non_superadmin_is_refused(self):
        self.client.force_login(self.ruth)
        self.assertEqual(self.client.get(BASE).status_code, 403)

    # ----------------------------------------------------------- the refusals

    def test_the_only_superadmin_cannot_lose_the_group(self):
        response = self.patch(self.admin, {"groups": ["staff"]})

        self.assertEqual(response.status_code, 422, response.content)
        self.assertIn("only active superadmin", response.json()["errors"][0]["detail"])
        self.assertTrue(self.admin.groups.filter(name="superadmin").exists())

    def test_the_only_superadmin_cannot_be_deactivated(self):
        self.assertEqual(self.patch(self.admin, {"is_active": False}).status_code, 422)

    def test_with_a_second_superadmin_it_can(self):
        self.account("second@unimelb.edu.au", "superadmin")

        response = self.patch(self.admin, {"groups": ["staff"]})

        self.assertEqual(response.status_code, 200, response.content)
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.is_superuser)

    def test_a_dean_with_a_department_is_refused(self):
        response = self.assign(self.ruth, {"role": "dean", "department": "CIS"})
        self.assertEqual(response.status_code, 422)

    def test_a_hod_with_a_faculty_is_refused(self):
        response = self.assign(self.ruth, {"role": "hod", "faculty": "ENG"})
        self.assertEqual(response.status_code, 422)

    def test_a_researcher_cannot_be_assigned_to_approve(self):
        sam = self.account("sam@unimelb.edu.au", "researcher")

        response = self.assign(sam, {"role": "hod", "department": "CIS"})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(sam.org_assignments.count(), 0)

    def test_a_duplicate_assignment_is_refused_not_stored(self):
        self.assertEqual(
            self.assign(self.ruth, {"role": "hod", "department": "CIS"}).status_code,
            201,
        )

        again = self.assign(self.ruth, {"role": "hod", "department": "CIS"})

        self.assertEqual(again.status_code, 422)
        self.assertEqual(self.ruth.org_assignments.count(), 1)

    # --------------------------------------------------------------- writes

    def test_granting_superadmin_sets_the_django_flags_and_clearing_clears_them(self):
        self.patch(self.ruth, {"groups": ["staff", "superadmin"]})
        self.ruth.refresh_from_db()
        self.assertTrue(self.ruth.is_superuser and self.ruth.is_staff)

        self.patch(self.ruth, {"groups": ["staff"]})
        self.ruth.refresh_from_db()
        self.assertFalse(self.ruth.is_superuser or self.ruth.is_staff)

    def test_an_unknown_group_is_refused(self):
        self.assertEqual(self.patch(self.ruth, {"groups": ["wizard"]}).status_code, 422)

    def test_a_deactivated_account_can_no_longer_sign_in(self):
        self.ruth.set_password("demo12345")
        self.ruth.save()
        self.patch(self.ruth, {"is_active": False})
        self.client.logout()

        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "ruth@unimelb.edu.au",
                "password": "demo12345",
                "account_type": "staff",
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_a_superadmin_creates_an_account_without_signing_it_in(self):
        response = self.client.post(
            BASE,
            {
                "email": "New.Person@unimelb.edu.au",
                "password": "a-long-password",
                "first_name": "New",
                "last_name": "Person",
                "groups": ["staff"],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["email"], "new.person@unimelb.edu.au")
        # Still the admin's session, not the new account's.
        self.assertEqual(
            self.client.get("/api/auth/me/").json()["user"]["email"],
            "admin@unimelb.edu.au",
        )

    def test_there_is_no_route_that_deletes_a_user(self):
        self.assertEqual(self.client.delete(f"{BASE}{self.ruth.id}/").status_code, 405)

    def test_every_write_leaves_an_audit_entry(self):
        self.patch(self.ruth, {"first_name": "Ruthie"})
        self.assign(self.ruth, {"role": "hod", "department": "CIS"})
        assignment = self.ruth.org_assignments.get()
        self.client.delete(f"{BASE}{self.ruth.id}/assignments/{assignment.id}/")

        actions = list(AuditLog.objects.order_by("id").values_list("action", flat=True))
        self.assertEqual(
            actions,
            ["admin.user.update", "admin.assignment.create", "admin.assignment.delete"],
        )

    def test_one_save_of_several_kinds_leaves_one_entry_per_kind(self):
        # #67: a permission change must be filterable apart from a name fix.
        self.patch(
            self.ruth,
            {
                "first_name": "Ruthie",
                "groups": ["staff", "researcher"],
                "is_active": False,
            },
        )

        entries = {e.action: e.detail for e in AuditLog.objects.all()}
        self.assertEqual(
            sorted(entries),
            ["admin.user.deactivate", "admin.user.groups", "admin.user.update"],
        )
        self.assertEqual(
            entries["admin.user.groups"],
            {"email": "ruth@unimelb.edu.au", "added": ["researcher"], "removed": []},
        )
        self.assertEqual(
            entries["admin.user.update"]["first_name"], {"old": "Ruth", "new": "Ruthie"}
        )

    def test_a_save_that_changes_nothing_records_nothing(self):
        self.patch(self.ruth, {"first_name": "Ruth", "groups": ["staff"]})
        self.assertFalse(AuditLog.objects.exists())

    def test_a_refused_change_leaves_no_entry(self):
        self.patch(self.admin, {"groups": []})  # the only superadmin
        self.assertFalse(AuditLog.objects.exists())
