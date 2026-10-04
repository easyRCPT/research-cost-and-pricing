"""
The EBA increase and the non-staff totals against the workbook (#148).

The workbook's tEBA (Lookup Tables H4:J22) compounds 3% a year from 2026 at
full precision. The seed holds one row, 3% from 2026, and the engine carries
the latest rate forward, so every year's multiplier has to come out the same.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase

from api.calculation.staff import _find_eba_multiplier
from api.models import (
    Budget,
    Department,
    LookupConfiguration,
    NonStaffCostCategory,
    NonStaffCostLine,
    User,
    YearAmount,
)
from api.services import project, staff_line
from api.services.budget_details import get_budget_details
from api.services.lookup_loader import build_constants

# tEBA's EBA Multiplier column (J4:J22), as the workbook holds it.
WORKBOOK_EBA = {
    2025: 1,
    2026: 1.03,
    2027: 1.0609,
    2028: 1.092727,
    2029: 1.12550881,
    2030: 1.1592740743,
    2031: 1.194052296529,
    2032: 1.2298738654248702,
    2033: 1.2667700813876164,
    2034: 1.304773183829245,
    2035: 1.3439163793441222,
    2036: 1.384233870724446,
    2037: 1.4257608868461793,
    2038: 1.4685337134515648,
    2039: 1.512589724855112,
    2040: 1.5579674166007653,
    2041: 1.6047064390987884,
    2042: 1.652847632271752,
    2043: 1.7024330612399046,
}


def seed():
    cache.clear()
    call_command(
        "loaddata",
        str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
        verbosity=0,
    )


class TestEbaMatchesTheWorkbook(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed()
        constants = build_constants(
            LookupConfiguration.objects.get().current_version_id
        )
        cls.eba = constants["eba"]
        cls.salary_rate_year = int(constants["constants"]["salary_rate_year"])

    def test_every_year_of_the_workbooks_table_matches(self):
        for year, multiplier in WORKBOOK_EBA.items():
            with self.subTest(year=year):
                ours = _find_eba_multiplier(self.eba, self.salary_rate_year, year)
                # Held at full precision: to twelve places, where the
                # workbook's float stops being exact.
                self.assertAlmostEqual(float(ours), multiplier, places=12)

    def test_a_year_past_the_table_carries_the_last_rate_on(self):
        ours = _find_eba_multiplier(self.eba, self.salary_rate_year, 2045)

        self.assertEqual(ours, Decimal("1.03") ** 20)


class TestYearsOutsideTheTable(TestCase):
    """Time in a year the EBA table doesn't reach is priced, not a server error."""

    @classmethod
    def setUpTestData(cls):
        seed()

    def test_a_costing_after_the_table_ends_is_priced(self):
        row = project.create(
            {
                "title": "Far future",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2044,
                "start_month": 1,
                "end_year": 2046,
                "end_month": 12,
            },
            User.objects.create_user("owner@unimelb.edu.au"),
        )
        budget = Budget.objects.get(project_id=row["id"])
        staff_line.create(
            budget,
            {
                "name_role": "Continuing academic",
                "employment_type": "Continuing",
                "category": "Academic",
                "classification": "Level B.1",
                "time_basis": "FTE",
                "allocations": [{"year": 2046, "time": Decimal(1)}],
            },
        )

        details = get_budget_details(budget)

        self.assertGreater(details["budget_summary"]["price_summary"]["staff_cost"], 0)


class TestNonStaffTotalsAgree(TestCase):
    """The Non-Staff screen's total is the Price Summary's Non-Staff Costs."""

    @classmethod
    def setUpTestData(cls):
        seed()

    def test_the_screen_total_is_the_price_summarys_non_staff_cost(self):
        row = project.create(
            {
                "title": "Non-staff",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2027,
                "start_month": 1,
                "end_year": 2028,
                "end_month": 12,
            },
            User.objects.create_user("owner@unimelb.edu.au"),
        )
        budget = Budget.objects.get(project_id=row["id"])
        version = LookupConfiguration.objects.get().current_version_id
        categories = NonStaffCostCategory.objects.filter(version_id=version)
        for category, ten_percent, in_kind in (
            (categories.filter(excludes_additional_rate=False).first(), True, False),
            (categories.filter(excludes_additional_rate=False).last(), False, False),
            (categories.filter(excludes_additional_rate=True).first(), True, False),
            (categories.filter(excludes_additional_rate=False).first(), True, True),
        ):
            line = NonStaffCostLine.objects.create(
                budget=budget,
                category=category,
                add_ten_percent=ten_percent,
                in_kind=in_kind,
            )
            YearAmount.objects.create(
                non_staff_line=line, year=2027, amount=Decimal("1234.56")
            )

        details = get_budget_details(budget)

        screen = details["non_staff_table"]["cost_results"]["column_total"]["total"]
        summary = details["budget_summary"]["price_summary"]["non_staff_cost"]
        self.assertEqual(screen, summary)
        # Two ordinary lines, one with the 10%, and an excluded line that
        # takes none: the in-kind line is counted apart.
        self.assertEqual(summary, Decimal("1234.56") * Decimal("3.1"))
