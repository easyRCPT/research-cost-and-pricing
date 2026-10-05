"""
A costing's Lookups tab shows the tables it is priced on (#198).

A submitted or approved costing is priced on the version stamped when it was
submitted, so after a rate change its tables are not today's. Read through the
costing, the API returns its own; a draft's are today's.
"""

from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from api.models import Budget, LookupConfiguration, SalaryRate
from api.services.lookup_changes import apply_changes
from api.tests.factories import make_budget, make_project, make_user, seed_lookups

LEVEL_B1 = {
    "payroll_type": "Fortnight",
    "category": "Academic",
    "classification": "Level B.1",
}


class CostingLookupsTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.owner = make_user(groups=["researcher"])
        cls.admin = make_user("admin@unimelb.edu.au", groups=["superadmin"])
        cls.version = LookupConfiguration.objects.get().current_version_id
        cls.priced_at = SalaryRate.objects.get(version_id=cls.version, **LEVEL_B1).rate

    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client.force_login(self.owner)

    def costing(self, status: str) -> Budget:
        submitted = status != Budget.Status.DRAFT
        return make_budget(
            make_project(self.owner),
            status=status,
            lookup_version_id=self.version if submitted else None,
            margin=Decimal("0.30"),
        )

    def raise_the_rate(self) -> None:
        """An administrator's rate change, after the costing was submitted."""
        LookupConfiguration.objects.update(referenced=True)
        apply_changes(
            [
                {
                    "table": "salary_rates",
                    "op": "update",
                    "lookup": LEVEL_B1,
                    "values": {"rate": str(self.priced_at + 1000)},
                }
            ],
            note="",
            actor=self.admin,
        )

    def rate(self, response) -> Decimal:
        [row] = [
            row
            for row in response.json()["salary_rates"]
            if all(row[key] == value for key, value in LEVEL_B1.items())
        ]
        return Decimal(str(row["rate"]))

    def lookups(self, budget: Budget | None = None):
        query = {} if budget is None else {"budget": budget.id}
        return self.client.get(reverse("lookups"), query)

    def test_a_submitted_costing_shows_the_rates_it_was_priced_on(self):
        budget = self.costing(Budget.Status.SUBMITTED)

        self.raise_the_rate()

        self.assertEqual(self.rate(self.lookups(budget)), self.priced_at)
        self.assertEqual(self.rate(self.lookups()), self.priced_at + 1000)

    def test_an_approved_costing_shows_them_too(self):
        budget = self.costing(Budget.Status.APPROVED)

        self.raise_the_rate()

        self.assertEqual(self.rate(self.lookups(budget)), self.priced_at)

    def test_a_draft_shows_todays_rates(self):
        budget = self.costing(Budget.Status.DRAFT)

        self.raise_the_rate()

        self.assertEqual(self.rate(self.lookups(budget)), self.priced_at + 1000)

    def test_someone_who_cannot_open_the_costing_gets_nothing(self):
        budget = self.costing(Budget.Status.SUBMITTED)
        self.client.force_login(
            make_user("other@unimelb.edu.au", groups=["researcher"])
        )

        self.assertEqual(self.lookups(budget).status_code, 404)

    def test_a_budget_that_is_not_a_number_is_refused(self):
        self.assertEqual(
            self.client.get(reverse("lookups"), {"budget": "x"}).status_code, 400
        )
