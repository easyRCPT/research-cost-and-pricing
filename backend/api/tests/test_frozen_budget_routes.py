"""
A budget that is not a draft refuses every write (#77).

The point is an approver reading a costing that cannot change while they read
it, and a rejected attempt staying exactly as it was turned down. 409 rather
than 403: nobody may edit it in this state, which is a different thing from
this caller not being allowed to.
"""

from django.test import TestCase
from django.urls import reverse

from api.models import (
    Budget,
    Deliverable,
    DeliverableType,
    NonStaffCostCategory,
    NonStaffCostLine,
    StaffCostLine,
)
from api.tests.factories import make_budget, make_project, make_user, seed_lookups

FROZEN = [
    Budget.Status.SUBMITTED,
    Budget.Status.HOD_REVIEW,
    Budget.Status.DEAN_REVIEW,
    Budget.Status.APPROVED,
    Budget.Status.REJECTED,
    Budget.Status.WITHDRAWN,
]


class FrozenBudgetTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()

    def setUp(self):
        owner = make_user()
        self.client.force_login(owner)
        project = make_project(owner, title="Frozen", end_year=2026)
        # The same defaults a real budget is created with.
        self.budget = make_budget(project)
        self.staff_line = StaffCostLine.objects.create(
            budget=self.budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level A.1",
            time_basis="FTE",
        )
        self.category = NonStaffCostCategory.objects.order_by("ledger_id")[0]
        self.non_staff_line = NonStaffCostLine.objects.create(
            budget=self.budget, category=self.category
        )
        self.deliverable_type = DeliverableType.objects.create(
            code="REP", name="Report"
        )
        self.deliverable = Deliverable.objects.create(
            budget=self.budget,
            number=1,
            description="A report",
            deliverable_type=self.deliverable_type,
        )

    def freeze(self, status: str) -> None:
        self.budget.status = status
        self.budget.save(update_fields=["status"])

    def writes(self) -> list[tuple[str, str, str, dict]]:
        """Every way in, as (label, method, url, body)."""
        budget_id = self.budget.id
        return [
            (
                "patch budget",
                "patch",
                reverse("budget-detail", args=[budget_id]),
                {"section": "budget", "field": "comments", "value": "edited"},
            ),
            (
                "add staff line",
                "post",
                reverse("staff-line", args=[budget_id]),
                {
                    "name_role": "Dr B",
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level A.1",
                    "time_basis": "FTE",
                },
            ),
            (
                "delete staff line",
                "delete",
                reverse("staff-line-detail", args=[budget_id, self.staff_line.id]),
                {},
            ),
            (
                "add non-staff line",
                "post",
                reverse("non-staff-line", args=[budget_id]),
                {
                    "cost_group": self.category.cost_category,
                    "expense_type": self.category.cost_subcategory,
                },
            ),
            (
                "delete non-staff line",
                "delete",
                reverse(
                    "non-staff-line-detail", args=[budget_id, self.non_staff_line.id]
                ),
                {},
            ),
            (
                "add deliverable",
                "post",
                reverse("deliverable", args=[budget_id]),
                {
                    "number": 2,
                    "description": "Another",
                    "deliverable_type": self.deliverable_type.code,
                },
            ),
            (
                "delete deliverable",
                "delete",
                reverse("deliverable-detail", args=[budget_id, self.deliverable.id]),
                {},
            ),
        ]

    def send(self, method: str, url: str, body: dict):
        call = getattr(self.client, method)
        if method == "delete":
            return call(url)
        return call(url, body, content_type="application/json")

    def test_every_write_is_refused_once_it_leaves_draft(self):
        for status in FROZEN:
            self.freeze(status)
            for label, method, url, body in self.writes():
                with self.subTest(status=status, write=label):
                    response = self.send(method, url, body)

                    self.assertEqual(response.status_code, 409, response.content)

    def test_the_refusal_names_the_status_it_is_in(self):
        self.freeze(Budget.Status.HOD_REVIEW)

        response = self.send(*self.writes()[0][1:])

        detail = response.json()["errors"][0]["detail"]
        self.assertIn("head of department review", detail.lower())

    def test_a_draft_still_accepts_all_of_them(self):
        self.assertEqual(self.budget.status, Budget.Status.DRAFT)

        for label, method, url, body in self.writes():
            with self.subTest(write=label):
                response = self.send(method, url, body)

                self.assertLess(response.status_code, 300, response.content)

    def test_a_refused_write_leaves_nothing_behind(self):
        self.freeze(Budget.Status.APPROVED)
        before = StaffCostLine.objects.filter(budget=self.budget).count()

        self.send(
            "post", reverse("staff-line", args=[self.budget.id]), {"name_role": "Dr C"}
        )

        self.assertEqual(
            StaffCostLine.objects.filter(budget=self.budget).count(), before
        )

    def test_status_is_not_a_field_the_browser_can_write(self):
        # Draft, so the 409 is not what refuses it: the field itself is gone
        # from the writable set, or a budget could be PATCHed past review.
        response = self.client.patch(
            reverse("budget-detail", args=[self.budget.id]),
            {"field": "status", "value": Budget.Status.APPROVED},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.status, Budget.Status.DRAFT)
