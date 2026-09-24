"""
One known costing, priced end to end against the seeded rates.

Every other test in this directory is a SimpleTestCase holding the engine to
numbers it was handed. That proves the arithmetic and says nothing about the
data: a corrupted salary rate, a missing on-cost component or an edited
multiplier passes all of them. This is the one that reads the rates the app
actually ships with, so an edit that changes what the University charges fails
the build rather than a funder's invoice.

The inputs are asserted separately from the total, and the relationships apart
from both. When this breaks, the first failure tells you whether a rate moved or
the engine did.

The relationships are also pinned by TestCalculateStaffBudget and
TestCalculatePriceSummary, on synthetic numbers. Kept here as well because this
is where they are checked against the rates the app ships with, and because a
costing reads as one chain rather than three unrelated assertions.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from api.models import (
    Budget,
    Department,
    NonStaffCostCategory,
    SalaryRate,
    User,
)
from api.services import non_staff_line, project, staff_line

CENTS = Decimal("0.01")


def cents(value) -> Decimal:
    return Decimal(value).quantize(CENTS)


class TestGoldenCosting(TestCase):
    """A one year project, one academic at full time, one non-staff line."""

    @classmethod
    def setUpTestData(cls):
        # The seeds are loaded by `manage.py seed`, not by a migration, so a
        # test database has none of them unless it asks.
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )

        row = project.create(
            {
                "title": "Golden costing",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2026,
                "start_month": 1,
                "end_year": 2026,
                "end_month": 12,
            },
            User.objects.create_user("owner@unimelb.edu.au"),
        )
        cls.budget = Budget.objects.get(project_id=row["id"])

        staff_line.create(
            cls.budget,
            {
                "name_role": "Dr A. Rahman",
                "employment_type": "Continuing",
                "category": "Academic",
                "classification": "Level A.1",
                "time_basis": "FTE",
                "allocations": [{"year": 2026, "time": Decimal(1)}],
            },
        )
        cls.details = non_staff_line.create(
            cls.budget,
            {
                "category": NonStaffCostCategory.objects.order_by("ledger_id").first(),
                "description": "Sequencing consumables",
                "amounts": [{"year": 2026, "amount": Decimal(10000)}],
            },
        )

    # ---------------------------------------------------------------- inputs

    def test_the_rate_this_costing_is_built_on(self):
        rate = SalaryRate.objects.get(
            classification="Level A.1",
            category="Academic",
            payroll_type="Fortnight",
        )

        self.assertEqual(cents(rate.rate), Decimal("87266.10"))

    def test_the_multiplier_and_margin_it_is_priced_with(self):
        # 1.70 is fixed by the University and is not an editable lookup (#60).
        self.assertEqual(self.budget.cost_multiplier, Decimal("1.70"))
        self.assertEqual(self.budget.margin, Decimal("0.3000"))

    # ----------------------------------------------------------------- total

    def test_the_costing_prices_to_the_cent(self):
        summary = self.details["budget_summary"]["price_summary"]
        staff = self.details["budget_summary"]["staff_budget"]

        # Salary plus on-costs, before any recovery.
        self.assertEqual(cents(staff["cost_before_recovery"]), Decimal("125257.60"))
        # The 0.70 the multiplier adds on top of that.
        self.assertEqual(cents(staff["cost_recovery"]), Decimal("87680.32"))
        self.assertEqual(cents(staff["total_staff_costs"]), Decimal("212937.91"))

        self.assertEqual(cents(summary["project_cost"]), Decimal("222937.91"))
        self.assertEqual(cents(summary["margin_amount"]), Decimal("66881.37"))
        self.assertEqual(cents(summary["total_price_exc_gst"]), Decimal("289819.29"))
        self.assertEqual(cents(summary["total_price_inc_gst"]), Decimal("318801.21"))

    # --------------------------------------------------- how it hangs together

    def test_recovery_is_the_multiplier_applied_to_the_salary_cost(self):
        staff = self.details["budget_summary"]["staff_budget"]
        before = staff["cost_before_recovery"]

        expected = before * (self.budget.cost_multiplier - 1)

        self.assertEqual(cents(staff["cost_recovery"]), cents(expected))
        self.assertEqual(
            cents(staff["total_staff_costs"]),
            cents(before * self.budget.cost_multiplier),
        )

    def test_margin_is_a_markup_on_cost_not_a_share_of_the_price(self):
        summary = self.details["budget_summary"]["price_summary"]
        cost = summary["project_cost"]

        # price = cost x (1 + margin). The settled reading of the workbook: a
        # 30% margin adds 30% to the cost, it does not take 30% of the price.
        self.assertEqual(
            cents(summary["total_price_exc_gst"]),
            cents(cost * (1 + self.budget.margin)),
        )
        self.assertNotEqual(
            cents(summary["total_price_exc_gst"]),
            cents(cost / (1 - self.budget.margin)),
        )

    def test_gst_is_ten_percent_of_the_price(self):
        summary = self.details["budget_summary"]["price_summary"]

        self.assertEqual(
            cents(summary["total_price_inc_gst"]),
            cents(summary["total_price_exc_gst"] * Decimal("1.1")),
        )
