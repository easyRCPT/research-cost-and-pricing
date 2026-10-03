"""
The v4.5 workbook's own demo costing, priced by the engine on the seeded rates
(#146, #148).

The figures are the workbook's: its demo project runs 2027 to 2029 at the 1.70
full cost recovery multiplier, with a continuing academic at full time and a
casual professional on hourly time. They are what the workbook charges, to the
cent, so a change to the engine or the rates that moves what the University
charges for the same inputs fails here.

The continuing line covers stepping up a salary step each project year with
time (B.6 to B.7 in 2028); the casual line covers staying on the starting step,
with only the EBA increase moving the rate (#146).
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase

from api.models import Budget, Department, User
from api.services import project, staff_line
from api.services.budget_details import get_budget_details

CENTS = Decimal("0.01")


def cents(value) -> Decimal:
    return Decimal(value).quantize(CENTS)


class TestWorkbookParity(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        row = project.create(
            {
                "title": "Workbook demo",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2027,
                "start_month": 1,
                "end_year": 2029,
                "end_month": 12,
            },
            User.objects.create_user("owner@unimelb.edu.au"),
        )
        cls.budget = Budget.objects.get(project_id=row["id"])
        for line in (
            {
                "name_role": "Continuing academic",
                "employment_type": "Continuing",
                "category": "Academic",
                "classification": "Level B.6",
                "time_basis": "FTE",
                "allocations": [
                    {"year": 2027, "time": Decimal(1)},
                    {"year": 2028, "time": Decimal(1)},
                ],
            },
            {
                "name_role": "Casual professional",
                "employment_type": "Casual",
                "category": "Professional",
                "classification": "UOM 7.1",
                "time_basis": "Hourly",
                "allocations": [
                    {"year": 2027, "time": Decimal(120)},
                    {"year": 2028, "time": Decimal(120)},
                ],
            },
        ):
            staff_line.create(cls.budget, line)

    def setUp(self):
        # Rates are cached per version, and the cache outlives each test's
        # rolled-back database.
        cache.clear()
        self.addCleanup(cache.clear)
        self.details = get_budget_details(self.budget)

    def years(self, name_role: str) -> dict[int, Decimal]:
        [line] = [
            line
            for key, line in self.details["staff_table"]["cost_results"].items()
            if key != "column_total" and line["info"]["name_role"] == name_role
        ]
        return {year: cents(cell["result"]) for year, cell in line["numeric"].items()}

    def test_a_continuing_line_steps_up_each_year_and_matches_to_the_cent(self):
        self.assertEqual(
            self.years("Continuing academic"),
            {2027: Decimal("371136.20"), 2028: Decimal("382182.89"), 2029: 0},
        )

    def test_a_casual_line_stays_on_its_step_and_matches_to_the_cent(self):
        # Year 2 is year 1 plus exactly the 3% EBA increase: no step up.
        self.assertEqual(
            self.years("Casual professional"),
            {2027: Decimal("18639.97"), 2028: Decimal("19199.17"), 2029: 0},
        )

    def test_the_staff_totals_match(self):
        staff = self.details["budget_summary"]["staff_budget"]

        self.assertEqual(cents(staff["total_staff_costs"]), Decimal("791158.23"))
        self.assertEqual(cents(staff["cost_recovery"]), Decimal("325771.04"))
