"""
A workbook import is the other way rates change, so it follows the same rule as
the HTTP write path: never edit a version a budget is pinned to.
"""

from decimal import Decimal
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from api.models import (
    CalculationConstant,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
)

SENTINEL = Decimal("1.00")


def import_lookups():
    call_command("import_lookups", stdout=StringIO())


class TestImportLookups(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )

    def setUp(self):
        self.config = LookupConfiguration.objects.get()
        self.pinned_id = self.config.current_version_id

        # A value the workbook will never hold, so an import that touches this
        # version shows up.
        self.rate = SalaryRate.objects.filter(version_id=self.pinned_id)[0]
        self.rate.rate = SENTINEL
        self.rate.save()

    def set_referenced(self, referenced: bool):
        self.config.referenced = referenced
        self.config.save(update_fields=["referenced"])

    def test_imports_in_place_when_unreferenced(self):
        self.set_referenced(False)

        import_lookups()

        self.config.refresh_from_db()
        self.rate.refresh_from_db()
        self.assertEqual(self.config.current_version_id, self.pinned_id)
        self.assertNotEqual(self.rate.rate, SENTINEL)

    def test_imports_into_a_new_version_when_referenced(self):
        self.set_referenced(True)
        versions = LookupVersion.objects.count()

        import_lookups()

        self.config.refresh_from_db()
        self.rate.refresh_from_db()
        self.assertEqual(LookupVersion.objects.count(), versions + 1)
        self.assertNotEqual(self.config.current_version_id, self.pinned_id)
        self.assertFalse(self.config.referenced)
        self.assertEqual(self.rate.rate, SENTINEL)

        imported = SalaryRate.objects.get(
            version_id=self.config.current_version_id,
            payroll_type=self.rate.payroll_type,
            category=self.rate.category,
            classification=self.rate.classification,
        )
        self.assertNotEqual(imported.rate, SENTINEL)

    def test_importing_twice_mints_one_version(self):
        self.set_referenced(True)
        versions = LookupVersion.objects.count()

        import_lookups()
        import_lookups()

        self.assertEqual(LookupVersion.objects.count(), versions + 1)

    def test_new_version_keeps_constants_the_workbook_lacks(self):
        self.set_referenced(True)

        import_lookups()

        self.config.refresh_from_db()
        names = set(
            CalculationConstant.objects.filter(
                version_id=self.config.current_version_id
            ).values_list("name", flat=True)
        )
        self.assertLessEqual({"default_margin", "minimum_margin"}, names)
