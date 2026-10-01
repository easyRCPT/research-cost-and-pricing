"""
Contingency, Student Support and Shared Grant Payments never take the
additional 10% (#148), on the seeded categories, so the test fails if the
exclusion stops matching what the database holds.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from api.models import Budget, Department, NonStaffCostCategory, NonStaffCostLine, User
from api.services import project
from api.services.budget_details import get_budget_details


class TenPercentTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        cls.owner = User.objects.create_user("owner@unimelb.edu.au")
        row = project.create(
            {
                "title": "Ten percent",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2027,
                "start_month": 1,
                "end_year": 2027,
                "end_month": 12,
            },
            cls.owner,
        )
        cls.budget = Budget.objects.get(project_id=row["id"])

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client.force_login(self.owner)

    def add(self, group: str, expense: str, ten_percent: bool):
        return self.client.post(
            reverse("non-staff-line", args=[self.budget.id]),
            {
                "cost_group": group,
                "expense_type": expense,
                "add_ten_percent": ten_percent,
                "amounts": [{"year": 2027, "amount": "1000"}],
            },
            "application/json",
        )

    def patch(self, line: NonStaffCostLine, field: str, value):
        return self.client.patch(
            reverse("budget-detail", args=[self.budget.id]),
            {
                "section": "non_staff",
                "row_id": str(line.id),
                "field": field,
                "value": value,
            },
            "application/json",
        )

    def test_the_excluded_groups_are_flagged_in_the_seed(self):
        excluded = set(
            NonStaffCostCategory.objects.filter(excludes_additional_rate=True)
            .values_list("cost_category", flat=True)
            .distinct()
        )

        self.assertEqual(
            excluded, {"Contingency", "Student Support", "Shared Grant Payments"}
        )

    def test_a_line_in_an_excluded_group_is_refused_the_ten_percent(self):
        for group, expense in (
            ("Contingency", "Contingency"),
            ("Student Support", "Scholarships"),
            ("Shared Grant Payments", "Other Grants"),
        ):
            with self.subTest(group=group):
                response = self.add(group, expense, ten_percent=True)

                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(
                    response.json()["errors"][0]["attr"], "add_ten_percent"
                )
        self.assertFalse(self.budget.non_staff_lines.exists())

    def test_ticking_it_on_an_excluded_line_is_refused(self):
        self.assertEqual(self.add("Contingency", "Contingency", False).status_code, 201)
        line = self.budget.non_staff_lines.get()

        response = self.patch(line, "add_ten_percent", True)

        self.assertEqual(response.status_code, 400)
        line.refresh_from_db()
        self.assertFalse(line.add_ten_percent)

    def test_moving_a_line_to_an_excluded_category_clears_it(self):
        self.assertEqual(
            self.add(
                "Advertising and marketing",
                "Advertising, Marketing and Promotional Expenses",
                True,
            ).status_code,
            201,
        )
        line = self.budget.non_staff_lines.get()
        contingency = NonStaffCostCategory.objects.get(
            version=line.category.version, cost_category="Contingency"
        )

        response = self.patch(line, "category", str(contingency.pk))

        self.assertEqual(response.status_code, 200, response.content)
        line.refresh_from_db()
        self.assertEqual(line.category, contingency)
        self.assertFalse(line.add_ten_percent)

    def test_the_engine_charges_no_ten_percent_on_an_excluded_line(self):
        # Even a tick that reached the row some other way is not charged.
        self.add("Contingency", "Contingency", False)
        NonStaffCostLine.objects.update(add_ten_percent=True)

        summary = get_budget_details(self.budget)["budget_summary"]["price_summary"]

        self.assertEqual(Decimal(str(summary["non_staff_cost"])), Decimal(1000))

    def test_an_ordinary_line_still_takes_it(self):
        self.add(
            "Advertising and marketing",
            "Advertising, Marketing and Promotional Expenses",
            True,
        )

        summary = get_budget_details(self.budget)["budget_summary"]["price_summary"]

        self.assertEqual(Decimal(str(summary["non_staff_cost"])), Decimal(1100))
