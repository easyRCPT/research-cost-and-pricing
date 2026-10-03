from django.test import TestCase
from django.urls import reverse

from api.models import (
    Deliverable,
    DeliverableType,
    NonStaffCostCategory,
    NonStaffCostLine,
    StaffCostLine,
)
from api.tests.factories import make_budget, make_project, make_user, seed_lookups


class BudgetOwnershipTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()

    def setUp(self):
        self.owner = make_user()
        self.stranger = make_user("stranger@unimelb.edu.au")
        self.budget = make_budget(
            make_project(self.owner, title="Owned", end_year=2026)
        )
        self.staff_line = StaffCostLine.objects.create(
            budget=self.budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level A.1",
            time_basis="FTE",
        )
        self.non_staff_line = NonStaffCostLine.objects.create(
            budget=self.budget,
            category=NonStaffCostCategory.objects.order_by("ledger_id")[0],
        )
        self.deliverable = Deliverable.objects.create(
            budget=self.budget,
            number=1,
            description="A report",
            deliverable_type=DeliverableType.objects.create(code="REP", name="Report"),
        )

    def routes(self) -> list[tuple[str, str]]:
        # No bodies: the budget lookup has to refuse before anything is validated.
        budget_id = self.budget.id
        return [
            ("get", reverse("budget-detail", args=[budget_id])),
            ("patch", reverse("budget-detail", args=[budget_id])),
            ("post", reverse("staff-line", args=[budget_id])),
            (
                "delete",
                reverse("staff-line-detail", args=[budget_id, self.staff_line.id]),
            ),
            ("post", reverse("non-staff-line", args=[budget_id])),
            (
                "delete",
                reverse(
                    "non-staff-line-detail", args=[budget_id, self.non_staff_line.id]
                ),
            ),
            ("post", reverse("deliverable", args=[budget_id])),
            (
                "delete",
                reverse("deliverable-detail", args=[budget_id, self.deliverable.id]),
            ),
        ]

    def test_someone_elses_budget_is_404_on_every_route(self):
        self.client.force_login(self.stranger)

        for method, url in self.routes():
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(
                    url, {}, content_type="application/json"
                )

                self.assertEqual(response.status_code, 404, response.content)

        self.assertTrue(StaffCostLine.objects.filter(pk=self.staff_line.pk).exists())
        self.assertTrue(
            NonStaffCostLine.objects.filter(pk=self.non_staff_line.pk).exists()
        )
        self.assertTrue(Deliverable.objects.filter(pk=self.deliverable.pk).exists())

    def test_the_owner_still_opens_it(self):
        self.client.force_login(self.owner)

        response = self.client.get(reverse("budget-detail", args=[self.budget.id]))

        self.assertEqual(response.status_code, 200, response.content)

    def test_the_list_only_shows_your_own_projects(self):
        self.client.force_login(self.stranger)
        self.assertEqual(self.client.get(reverse("projects")).json()["results"], [])

        self.client.force_login(self.owner)
        rows = self.client.get(reverse("projects")).json()["results"]
        titles = [row["title"] for row in rows]
        self.assertEqual(titles, ["Owned"])
