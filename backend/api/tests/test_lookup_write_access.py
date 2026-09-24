from decimal import Decimal

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse

from api.models import (
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    User,
)


class LookupWriteAccessTestCase(TestCase):
    def setUp(self):
        faculty = Faculty.objects.create(code="SCI", name="Science Faculty")
        Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=faculty,
        )
        self.fixed = CalculationConstant.objects.create(
            version=LookupConfiguration.objects.get().current_version,
            name="full_cost_recovery_multiplier",
            description="Full cost recovery multiplier",
            value=Decimal("1.700000"),
        )
        self.admin = User.objects.create_user("admin@unimelb.edu.au")
        self.admin.groups.add(Group.objects.get(name="superadmin"))

    def patch(self, table: str, body: dict):
        return self.client.patch(
            reverse("lookup-table", args=[table]), body, "application/json"
        )

    def rename(self):
        return self.patch(
            "departments", {"lookup": {"code": "SCI"}, "values": {"name": "Renamed"}}
        )

    def test_a_researcher_cannot_write(self):
        researcher = User.objects.create_user("researcher@unimelb.edu.au")
        researcher.groups.add(Group.objects.get(name="researcher"))
        self.client.force_login(researcher)

        self.assertEqual(self.rename().status_code, 403)
        self.assertEqual(Department.objects.get(code="SCI").name, "Science")

    def test_is_superuser_without_the_group_cannot_write(self):
        self.client.force_login(
            User.objects.create_superuser("root@unimelb.edu.au", "unused")
        )

        self.assertEqual(self.rename().status_code, 403)

    def test_a_researcher_can_still_read(self):
        self.client.force_login(User.objects.create_user("researcher@unimelb.edu.au"))

        self.assertEqual(self.client.get(reverse("lookups")).status_code, 200)

    def test_the_superadmin_can_write(self):
        self.client.force_login(self.admin)

        response = self.rename()

        self.assertEqual(response.status_code, 204, response.content)
        self.assertEqual(Department.objects.get(code="SCI").name, "Renamed")

    def test_an_edit_with_no_values_is_refused(self):
        self.client.force_login(self.admin)

        response = self.patch("departments", {"lookup": {"code": "SCI"}, "values": {}})

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Department.objects.filter(code="SCI").exists())

    def test_the_fixed_multiplier_cannot_be_changed_by_id(self):
        self.client.force_login(self.admin)

        response = self.patch(
            "calculation_constants",
            {"lookup": {"id": self.fixed.pk}, "values": {"value": "1.5"}},
        )

        self.assertEqual(response.status_code, 400)
        self.fixed.refresh_from_db()
        self.assertEqual(self.fixed.value, Decimal("1.700000"))
