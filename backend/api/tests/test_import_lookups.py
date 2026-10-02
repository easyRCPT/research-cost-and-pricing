"""
A workbook import is the other way rates change, so it follows the same rule as
the HTTP write path: never edit a version a budget is pinned to.
"""

from decimal import Decimal
from io import StringIO
from unittest.mock import MagicMock

from django.core.management import call_command
from django.test import TestCase

from api.management.commands.import_lookups import import_eba_increases
from api.models import (
    CalculationConstant,
    Currency,
    EbaIncrease,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
)
from api.tests.factories import seed_lookups

SENTINEL = Decimal("1.00")


def import_lookups():
    call_command("import_lookups", stdout=StringIO())


class TestImportLookups(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()

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

    def test_imports_the_workbooks_currencies(self):
        # dCurrencyRates: 21 currencies, each at "1 AUD =" (#152).
        Currency.objects.all().delete()
        self.set_referenced(False)

        import_lookups()

        currencies = Currency.objects.filter(version_id=self.pinned_id)
        self.assertEqual(currencies.count(), 21)
        usd = currencies.get(code="USD")
        self.assertEqual(
            (usd.name, usd.rate), ("United States Dollar", Decimal("0.70285"))
        )
        self.assertEqual(currencies.get(code="AUD").rate, Decimal(1))

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


class TestImportEbaIncreases(TestCase):
    def setUp(self):
        self.version = LookupVersion.objects.create()

    def test_only_stores_years_when_rate_changes(self):
        workbook = MagicMock()

        # Mock rows(workbook, "tEBA") output:
        # year, annual_rate, multiplier
        rows = [
            (2025, None, 1.00),  # header / invalid
            (2026, 0.03, 1.03),  # first rate, store
            (2027, 0.03, 1.0609),  # same rate, skip
            (2028, 0.03, 1.092727),  # same rate, skip
            (2029, 0.04, 1.136436),  # changed rate, store
            (2030, 0.04, 1.181893),  # same rate, skip
        ]

        # Patch rows function because importer uses module-level rows()
        from unittest.mock import patch

        with patch(
            "api.management.commands.import_lookups.rows",
            return_value=rows,
        ):
            count = import_eba_increases(workbook, self.version)

        self.assertEqual(count, 2)

        eba = list(
            EbaIncrease.objects.filter(version=self.version)
            .order_by("year")
            .values("year", "rate")
        )

        self.assertEqual(
            eba,
            [
                {"year": 2026, "rate": Decimal("0.03")},
                {"year": 2029, "rate": Decimal("0.04")},
            ],
        )
