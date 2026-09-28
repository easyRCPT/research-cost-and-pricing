"""
Putting the rates back to an older version (#137).

Restores forward: a new version copied from the old one becomes current, and
nothing that already exists is rewritten.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    AuditLog,
    Budget,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
    User,
)
from api.services.lookup_update import (
    VERSIONED_MODELS,
    list_versions,
    restore_version,
    update,
)

LEVEL_A1 = {
    "classification": "Level A.1",
    "category": "Academic",
    "payroll_type": "Fortnight",
}


def rows(version_id: int) -> dict:
    """Every versioned row of one version, comparable across versions."""
    out = {}
    for model in VERSIONED_MODELS:
        out[model.__name__] = sorted(
            (
                tuple(
                    (f.name, getattr(row, f.name))
                    for f in model._meta.concrete_fields
                    if not f.primary_key and f.name != "version"
                )
                for row in model.objects.filter(version_id=version_id)
            ),
            # Some columns are nullable, and None does not sort against a number.
            key=repr,
        )
    return out


class RestoreVersionTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        cls.admin = User.objects.create(email="admin@unimelb.edu.au")
        cls.admin.groups.set(Group.objects.filter(name="superadmin"))

    def current(self) -> int:
        return LookupConfiguration.objects.get().current_version_id

    def rate(self) -> Decimal:
        return SalaryRate.objects.get(version_id=self.current(), **LEVEL_A1).rate

    def edit_rate(self, to: str) -> int:
        """An edit that has to mint a version, as one after an approval does."""
        LookupConfiguration.objects.update(referenced=True)
        update("salary_rates", LEVEL_A1, {"rate": Decimal(to)})
        return self.current()

    def test_restoring_mints_a_copy_and_leaves_the_original_alone(self):
        original = self.current()
        before = rows(original)
        self.edit_rate("99999.0000")

        restored = restore_version(original, self.admin)

        self.assertNotEqual(restored, original)
        self.assertEqual(self.current(), restored)
        self.assertEqual(rows(restored), before)
        self.assertEqual(rows(original), before)
        self.assertEqual(self.rate(), Decimal("87266.1000"))

    def test_the_version_in_between_is_kept(self):
        original = self.current()
        edited = self.edit_rate("99999.0000")

        restore_version(original, self.admin)

        self.assertTrue(LookupVersion.objects.filter(id=edited).exists())
        self.assertEqual(
            SalaryRate.objects.get(version_id=edited, **LEVEL_A1).rate,
            Decimal("99999.0000"),
        )

    def test_a_budget_stamped_with_the_edited_version_still_reads_it(self):
        from api.models import Department, Project

        original = self.current()
        edited = self.edit_rate("99999.0000")
        project = Project.objects.create(
            created_by=User.objects.create(email="owner@unimelb.edu.au"),
            title="Stamped",
            department=Department.objects.order_by("code").first(),
            start_year=2026,
            start_month=1,
            end_year=2026,
            end_month=12,
        )
        budget = Budget.objects.create(
            project=project,
            cost_multiplier=Decimal("1.70"),
            in_kind_multiplier=Decimal("1.70"),
            margin=Decimal("0.30"),
            lookup_version_id=edited,
        )

        restore_version(original, self.admin)

        budget.refresh_from_db()
        self.assertEqual(budget.lookup_version_id, edited)

    def test_restoring_the_current_version_is_refused(self):
        with self.assertRaises(ValidationError):
            restore_version(self.current(), self.admin)

    def test_an_unknown_version_is_refused(self):
        with self.assertRaises(ValidationError):
            restore_version(987654, self.admin)

    def test_it_is_recorded_as_who_did_it_and_from_what(self):
        original = self.current()
        self.edit_rate("99999.0000")

        restored = restore_version(original, self.admin)

        self.assertEqual(LookupVersion.objects.get(id=restored).updated_by, self.admin)
        entry = AuditLog.objects.get(action="lookups.restore")
        self.assertEqual(entry.detail, {"restored_from": original})

    def test_the_list_marks_the_current_one_newest_first(self):
        original = self.current()
        self.edit_rate("99999.0000")
        restored = restore_version(original, self.admin)

        listed = list_versions()

        self.assertEqual(listed[0]["id"], restored)
        self.assertTrue(listed[0]["current"])
        self.assertEqual(sum(v["current"] for v in listed), 1)


class RestoreRoutesTest(TestCase):
    """The endpoints sit behind the superadmin group."""

    def setUp(self):
        self.researcher = User.objects.create(email="r@unimelb.edu.au")
        self.researcher.groups.set(Group.objects.filter(name="researcher"))
        self.admin = User.objects.create(email="a@unimelb.edu.au")
        self.admin.groups.set(Group.objects.filter(name="superadmin"))

    def test_a_researcher_is_refused(self):
        self.client.force_login(self.researcher)
        self.assertEqual(
            self.client.get("/api/admin/lookups/versions/").status_code, 403
        )

    def test_a_superadmin_lists_the_versions(self):
        self.client.force_login(self.admin)
        response = self.client.get("/api/admin/lookups/versions/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(v["current"] for v in response.json()))
