"""
A costing's margin bounds (#192).

No negative margin: a discount comes from a cash co-contribution or in-kind
costs, never a margin below zero, so the floor stays at 0% (#96 not needed).
"""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from api.models import Budget
from api.tests.factories import make_budget, make_project, make_user, seed_lookups


class MarginBoundsTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.owner = make_user(groups=["researcher"])

    def setUp(self):
        self.budget = make_budget(make_project(self.owner), margin=Decimal("0.30"))
        self.client.force_login(self.owner)

    def set_margin(self, value: float):
        return self.client.patch(
            reverse("budget-detail", args=[self.budget.id]),
            {"section": "budget", "field": "margin", "value": value},
            "application/json",
        )

    def margin(self) -> Decimal:
        return Budget.objects.get(id=self.budget.id).margin

    def test_a_negative_margin_is_refused(self):
        response = self.set_margin(-0.1)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.margin(), Decimal("0.30"))

    def test_a_margin_of_zero_is_allowed(self):
        response = self.set_margin(0)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.margin(), Decimal(0))
