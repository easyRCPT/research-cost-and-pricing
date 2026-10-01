from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command
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
        # A whole set of rates: a set of changes is refused if it would leave
        # rates that cannot price a costing.
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        self.fixed = CalculationConstant.objects.get(
            version=LookupConfiguration.objects.get().current_version,
            name="full_cost_recovery_multiplier",
        )
        self.admin = User.objects.create_user("admin@unimelb.edu.au")
        self.admin.groups.add(Group.objects.get(name="superadmin"))

    def patch(self, table: str, body: dict):
        return self.client.patch(
            reverse("lookup-table", args=[table]), body, "application/json"
        )

    def set_multiplier(self, value: str):
        return self.client.post(
            reverse("admin-lookup-changes"),
            {
                "changes": [
                    {
                        "table": "calculation_constants",
                        "op": "update",
                        "lookup": {"name": "full_cost_recovery_multiplier"},
                        "values": {"value": value},
                    }
                ]
            },
            "application/json",
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

    def test_the_superadmin_can_change_the_multiplier(self):
        self.client.force_login(self.admin)

        response = self.set_multiplier("1.80")

        self.assertEqual(response.status_code, 201, response.content)
        current = LookupConfiguration.objects.get().current_version
        self.assertEqual(
            CalculationConstant.objects.get(
                version=current, name="full_cost_recovery_multiplier"
            ).value,
            Decimal("1.80"),
        )
        # The seeded rates are the baseline, kept as loaded.
        self.fixed.refresh_from_db()
        self.assertEqual(self.fixed.value, Decimal("1.700000"))

    def test_a_researcher_cannot_change_the_multiplier(self):
        researcher = User.objects.create_user("researcher@unimelb.edu.au")
        researcher.groups.add(Group.objects.get(name="researcher"))
        self.client.force_login(researcher)

        response = self.set_multiplier("1.80")

        self.assertEqual(response.status_code, 403)
        self.fixed.refresh_from_db()
        self.assertEqual(self.fixed.value, Decimal("1.700000"))

    def test_a_multiplier_below_one_is_refused(self):
        self.client.force_login(self.admin)

        response = self.set_multiplier("0.90")

        self.assertEqual(response.status_code, 400)
        self.fixed.refresh_from_db()
        self.assertEqual(self.fixed.value, Decimal("1.700000"))

    def test_a_rate_cannot_be_changed_a_row_at_a_time(self):
        # The one way to change a rate is a reviewed set (#138).
        self.client.force_login(self.admin)

        response = self.patch(
            "calculation_constants",
            {
                "lookup": {"name": "full_cost_recovery_multiplier"},
                "values": {"value": "1.80"},
            },
        )

        self.assertEqual(response.status_code, 400)
        self.fixed.refresh_from_db()
        self.assertEqual(self.fixed.value, Decimal("1.700000"))
