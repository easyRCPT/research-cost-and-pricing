"""
A rejected costing can be cloned, and the rejected attempt stays readable
(#51): the clone is a new draft beside it, never a replacement.
"""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from api.models import Budget, StaffCostLine
from api.tests.factories import make_budget, make_project, make_user, seed_lookups


class RejectedAttemptTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.owner = make_user(groups=["researcher"])

    def test_the_rejected_attempt_stays_readable_beside_its_clone(self):
        rejected = make_budget(
            make_project(self.owner),
            status=Budget.Status.REJECTED,
            margin=Decimal("0.30"),
        )
        StaffCostLine.objects.create(
            budget=rejected,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level B.1",
            time_basis="FTE",
        )
        self.client.force_login(self.owner)

        cloned = self.client.post(reverse("clone", args=[rejected.id]))
        self.assertEqual(cloned.status_code, 201)

        response = self.client.get(reverse("budget-detail", args=[rejected.id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["staff_cost"]["lines"][0]["name_role"], "Dr A")
        rejected.refresh_from_db()
        self.assertEqual(rejected.status, Budget.Status.REJECTED)
        self.assertEqual(rejected.staff_lines.count(), 1)
