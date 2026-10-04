"""
The chief investigator's staff line is marked, not read off row one (#166).

Naming a CI on Project Details used to take over the first row whatever it
held, so another person's costing read as the CI's.
"""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from api.models import Budget, StaffCostLine
from api.services.budget_clone import clone_budget
from api.tests.factories import make_budget, make_project, make_user, seed_lookups

LINE = {
    "employment_type": "Continuing",
    "category": "Academic",
    "classification": "Level B.1",
    "time_basis": "FTE",
}


class CiLineTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.owner = make_user(groups=["researcher"])

    def setUp(self):
        self.budget = make_budget(make_project(self.owner), margin=Decimal("0.30"))
        self.client.force_login(self.owner)

    def add(self, name: str, **extra) -> str:
        response = self.client.post(
            reverse("staff-line", args=[self.budget.id]),
            {"name_role": name, **LINE, **extra},
            "application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        return str(StaffCostLine.objects.get(budget=self.budget, name_role=name).id)

    def patch(self, section: str, field: str, value, row_id: str | None = None):
        body = {"section": section, "field": field, "value": value}
        if row_id is not None:
            body["row_id"] = row_id
        return self.client.patch(
            reverse("budget-detail", args=[self.budget.id]), body, "application/json"
        )

    def marked(self) -> list[str]:
        return list(
            StaffCostLine.objects.filter(budget=self.budget, is_ci=True).values_list(
                "name_role", flat=True
            )
        )

    def test_naming_a_ci_changes_no_line(self):
        self.add("Dr Someone Else")

        response = self.patch("project", "chief_investigator", "Prof Ada Lovelace")

        self.assertIn(response.status_code, (200, 204))
        line = StaffCostLine.objects.get(budget=self.budget)
        self.assertEqual(line.name_role, "Dr Someone Else")
        self.assertFalse(line.is_ci)

    def test_any_row_can_be_marked_and_the_mark_survives_a_reload(self):
        self.add("First")
        second = self.add("Second")

        # Not priced, so nothing to send back.
        self.assertEqual(self.patch("staff", "is_ci", True, second).status_code, 204)

        lines = self.client.get(reverse("budget-detail", args=[self.budget.id])).json()[
            "staff_cost"
        ]["lines"]
        self.assertEqual(
            {line["name_role"]: line["is_ci"] for line in lines},
            {"First": False, "Second": True},
        )

    def test_marking_a_line_takes_the_mark_from_any_other(self):
        first = self.add("First")
        second = self.add("Second")
        self.patch("staff", "is_ci", True, first)

        self.patch("staff", "is_ci", True, second)

        self.assertEqual(self.marked(), ["Second"])

    def test_a_new_line_marked_ci_takes_the_mark(self):
        self.add("First", is_ci=True)

        self.add("Second", is_ci=True)

        self.assertEqual(self.marked(), ["Second"])

    def test_a_mark_can_be_taken_off(self):
        first = self.add("First", is_ci=True)

        self.patch("staff", "is_ci", False, first)

        self.assertEqual(self.marked(), [])

    def test_the_mark_is_true_or_false(self):
        first = self.add("First")

        response = self.patch("staff", "is_ci", "yes", first)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.marked(), [])

    def test_a_clone_keeps_the_mark(self):
        self.add("First")
        self.add("Second", is_ci=True)
        Budget.objects.filter(id=self.budget.id).update(status=Budget.Status.REJECTED)
        self.budget.refresh_from_db()

        clone = clone_budget(self.owner, self.budget)

        self.assertEqual(
            list(
                clone.staff_lines.filter(is_ci=True).values_list("name_role", flat=True)
            ),
            ["Second"],
        )
