"""
An approved costing keeps the figures it was approved at (#192).

Its rates were already frozen by the version stamped at submit (#52), but
opening it priced it again, so a change to the engine's code moved an approved
price. Now the figures are kept at approval and shown from then on.
"""

from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse

from api.models import Budget, StaffCostLine, UserOrgAssignment, YearAllocation
from api.services import budget_details
from api.services.approval_decide import decide
from api.services.approval_queue import get_approval_steps
from api.services.budget_details import get_budget_details
from api.services.submission import submit_budget
from api.tests.factories import (
    make_budget,
    make_department,
    make_project,
    make_user,
    seed_lookups,
)


def doubled(build):
    """An engine that prices everything twice as high: a code change."""

    def build_doubled(constants, budget_data):
        details = build(constants, budget_data)
        summary = details["budget_summary"]["in_aud"]["price_summary"]
        summary["total_price_inc_gst"] *= 2
        return details

    return build_doubled


class ApprovedFiguresTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.department = make_department(code="ZZZ")
        cls.owner = make_user(groups=["researcher"])
        cls.hod = make_user("hod@unimelb.edu.au", groups=["staff"])
        UserOrgAssignment.objects.create(
            user=cls.hod, role="hod", department=cls.department
        )

    def setUp(self):
        project = make_project(
            self.owner,
            self.department,
            title="Approved",
            chief_investigator="Dr A",
            funder="ARC",
            end_year=2026,
        )
        self.budget = make_budget(project, margin=Decimal("0.30"))
        line = StaffCostLine.objects.create(
            budget=self.budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level B.1",
            time_basis="FTE",
        )
        YearAllocation.objects.create(staff_line=line, year=2026, time=Decimal("0.5"))

    def approve(self) -> None:
        submit_budget(self.owner, self.budget)
        decide(self.hod, get_approval_steps(self.hod)[0].id, "approve", "")
        self.budget.refresh_from_db()

    def price(self) -> float:
        self.client.force_login(self.owner)
        response = self.client.get(
            reverse("budget-detail", args=[self.budget.id])
        ).json()
        return response["budget_summary"]["in_aud"]["price_summary"][
            "total_price_inc_gst"
        ]

    def test_approval_keeps_the_figures(self):
        before = self.price()

        self.approve()

        self.assertEqual(self.budget.status, Budget.Status.APPROVED)
        assert self.budget.approved_figures is not None
        self.assertEqual(
            self.budget.approved_figures["budget_summary"]["in_aud"]["price_summary"][
                "total_price_inc_gst"
            ],
            before,
        )

    def test_an_engine_change_does_not_move_an_approved_price(self):
        self.approve()
        approved = self.price()

        with patch(
            "api.services.budget_details.build_budget_details",
            doubled(budget_details.build_budget_details),
        ):
            self.assertEqual(self.price(), approved)
            self.budget.refresh_from_db()
            self.assertEqual(float(self.budget.total_price_inc_gst), round(approved, 2))

    def test_a_draft_is_still_priced_by_the_engine(self):
        before = self.price()

        with patch(
            "api.services.budget_details.build_budget_details",
            doubled(budget_details.build_budget_details),
        ):
            self.assertAlmostEqual(self.price(), before * 2, places=2)

    def test_the_approval_trail_is_read_fresh(self):
        self.approve()
        self.client.force_login(self.owner)

        steps = self.client.get(reverse("budget-detail", args=[self.budget.id])).json()[
            "approval"
        ]["steps"]

        self.assertIn("approved", [step["status"] for step in steps])

    def test_a_costing_approved_before_figures_were_kept_keeps_them_on_first_read(
        self,
    ):
        self.approve()
        Budget.objects.filter(id=self.budget.id).update(approved_figures=None)
        self.budget.refresh_from_db()

        details = get_budget_details(self.budget)

        self.budget.refresh_from_db()
        self.assertIsNotNone(self.budget.approved_figures)
        self.assertEqual(details["approved_figures"], self.budget.approved_figures)
