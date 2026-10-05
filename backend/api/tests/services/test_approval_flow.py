"""
Submit, then decide, across the services together.

Each service had tests that passed, and between them a budget needing no dean
could never be approved: submit created the head of department's step as
`not_required` and the dean's as `pending`, the reverse of what queue and
decide expect. The unit tests each pinned their own half, so only a test that
walks the whole chain can see the join.
"""

from decimal import Decimal

from django.test import TestCase

from api.models import (
    ApprovalStep,
    Budget,
    CalculationConstant,
    LookupConfiguration,
    LookupVersion,
    UserOrgAssignment,
)
from api.services.approval_decide import decide
from api.services.approval_queue import get_approval_steps
from api.services.lookup_update import create_lookup_version
from api.services.submission import submit_budget
from api.tests.factories import (
    make_budget,
    make_department,
    make_project,
    make_user,
    seed_lookups,
)


class FlowFixture(TestCase):
    """A department with a head, its faculty with a dean, and a researcher."""

    def setUp(self):
        # Every rate, because approving a costing keeps its priced figures
        # (#192), with the minimum margin these tests price either side of.
        seed_lookups()
        CalculationConstant.objects.filter(name="minimum_margin").update(
            value=Decimal("0.20")
        )

        self.department = make_department(name="Science")
        self.faculty = self.department.faculty

        self.owner = make_user(groups=["researcher"])
        self.hod = make_user("hod@unimelb.edu.au", groups=["staff"])
        self.dean = make_user("dean@unimelb.edu.au", groups=["staff"])

        UserOrgAssignment.objects.create(
            user=self.hod, role="hod", department=self.department
        )
        UserOrgAssignment.objects.create(
            user=self.dean, role="dean", faculty=self.faculty
        )

    def a_budget(self, margin: str) -> Budget:
        project = make_project(
            self.owner,
            self.department,
            title="Flow",
            chief_investigator="Dr A",
            funder="ARC",
            end_year=2026,
        )
        return make_budget(project, margin=Decimal(margin))

    def step(self, budget: Budget, level: str) -> ApprovalStep:
        return budget.approval_steps.get(level=level)


class ApprovalFlowTest(FlowFixture):
    def test_the_head_of_department_always_signs(self):
        budget = self.a_budget("0.30")  # above the floor: no dean needed

        submit_budget(self.owner, budget)

        self.assertEqual(
            self.step(budget, ApprovalStep.Level.DEPARTMENT).status,
            ApprovalStep.Status.PENDING,
        )
        self.assertEqual(
            self.step(budget, ApprovalStep.Level.FACULTY).status,
            ApprovalStep.Status.NOT_REQUIRED,
        )

    def test_a_budget_needing_no_dean_reaches_the_hod_and_is_approved(self):
        budget = self.a_budget("0.30")
        submit_budget(self.owner, budget)

        queue = get_approval_steps(self.hod)
        self.assertEqual([s.budget_id for s in queue], [budget.id])

        decide(self.hod, queue[0].id, "approve", "")

        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.APPROVED)
        self.assertEqual(get_approval_steps(self.dean), [])

    def test_a_budget_below_the_floor_goes_hod_then_dean(self):
        budget = self.a_budget("0.10")  # below the floor: dean needed
        submit_budget(self.owner, budget)

        self.assertEqual(
            self.step(budget, ApprovalStep.Level.FACULTY).status,
            ApprovalStep.Status.PENDING,
        )
        # Not the dean's yet: the head of department signs first.
        self.assertEqual(get_approval_steps(self.dean), [])

        decide(self.hod, get_approval_steps(self.hod)[0].id, "approve", "")
        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.DEAN_REVIEW)

        decide(self.dean, get_approval_steps(self.dean)[0].id, "approve", "")
        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.APPROVED)


class ApprovalRecordTest(FlowFixture):
    """What the budget's own Approvals screen is told (#83)."""

    def record(self, budget: Budget) -> dict:
        from api.services.approval_record import approval_record

        return approval_record(budget)

    def test_a_draft_has_no_steps_yet(self):
        record = self.record(self.a_budget("0.30"))

        self.assertIsNone(record["submitted_at"])
        self.assertIsNone(record["lookup_version"])
        self.assertEqual(record["steps"], [])

    def test_an_open_step_says_who_it_is_waiting_on(self):
        budget = self.a_budget("0.30")
        submit_budget(self.owner, budget)

        department, faculty = self.record(budget)["steps"]

        # Department reads first, because it is decided first.
        self.assertEqual(department["level"], "department")
        self.assertEqual(department["status"], "pending")
        self.assertEqual(department["waiting_on"], ["hod@unimelb.edu.au"])
        self.assertEqual(faculty["status"], "not_required")
        self.assertEqual(faculty["waiting_on"], [])

    def test_a_decided_step_says_who_decided_and_why(self):
        budget = self.a_budget("0.10")
        submit_budget(self.owner, budget)
        decide(self.hod, get_approval_steps(self.hod)[0].id, "reject", "Too thin.")

        department = self.record(budget)["steps"][0]

        self.assertEqual(department["status"], "rejected")
        self.assertEqual(department["decided_by"], "hod@unimelb.edu.au")
        self.assertEqual(department["comment"], "Too thin.")
        self.assertIsNotNone(department["decided_at"])
        self.assertEqual(department["waiting_on"], [])

    def test_the_triggers_are_the_ones_frozen_at_submit(self):
        budget = self.a_budget("0.10")
        submit_budget(self.owner, budget)

        self.assertEqual(self.record(budget)["dean_triggers"], ["margin_below_minimum"])

    def test_nobody_holding_the_role_is_an_empty_list_not_an_error(self):
        UserOrgAssignment.objects.filter(role="hod").delete()
        budget = self.a_budget("0.30")
        submit_budget(self.owner, budget)

        self.assertEqual(self.record(budget)["steps"][0]["waiting_on"], [])


class ApprovalRoutesTest(FlowFixture):
    """The queue and decide endpoints the approvals screen calls (#84)."""

    def test_the_queue_row_names_the_project_and_who_submitted_it(self):
        budget = self.a_budget("0.30")
        submit_budget(self.owner, budget)
        self.client.force_login(self.hod)

        (row,) = self.client.get("/api/approvals/queue/").json()

        self.assertEqual(row["budget"]["project_id"], budget.project_id)
        self.assertEqual(row["budget"]["submitted_by"], "owner@unimelb.edu.au")
        self.assertEqual(row["level"], "department")

    def test_the_queue_costs_the_same_whatever_its_length(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        self.client.force_login(self.hod)

        def queries_for_the_queue() -> int:
            with CaptureQueriesContext(connection) as captured:
                self.client.get("/api/approvals/queue/")
            return len(captured.captured_queries)

        submit_budget(self.owner, self.a_budget("0.30"))
        one_row = queries_for_the_queue()
        for _ in range(4):
            submit_budget(self.owner, self.a_budget("0.30"))
        five_rows = queries_for_the_queue()

        self.assertEqual(one_row, five_rows)

    def test_deciding_says_where_the_budget_went(self):
        needs_dean = self.a_budget("0.10")
        submit_budget(self.owner, needs_dean)
        self.client.force_login(self.hod)
        step = get_approval_steps(self.hod)[0]

        response = self.client.post(
            f"/api/approvals/{step.id}/decide/",
            {"decision": "approve", "comment": ""},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {"budget_status": "dean_review"})


class RatesFrozenAtSubmitTest(FlowFixture):
    """
    What the approvers sign is what was submitted (#57).

    The rates used to be stamped at each decision instead, so an edit between
    the head of department's approval and the dean's re-stamped the budget
    onto the new rates: the dean signed a different price from the one the
    head of department had.
    """

    def new_rates(self) -> LookupVersion:
        """A later set of rates becoming current, as an admin edit or restore does."""
        return LookupVersion.objects.get(
            id=create_lookup_version(LookupConfiguration.objects.get(), None)
        )

    def test_submitting_stamps_the_rates_it_was_priced_with(self):
        budget = self.a_budget("0.30")
        at_submit = LookupConfiguration.objects.get().current_version_id

        submit_budget(self.owner, budget)

        budget.refresh_from_db()
        self.assertEqual(budget.lookup_version_id, at_submit)
        # And in use now, so the next edit copies the version, not writes into it.
        self.assertTrue(LookupConfiguration.objects.get().referenced)

    def test_an_edit_between_the_two_decisions_does_not_move_it(self):
        budget = self.a_budget("0.10")  # needs the dean
        at_submit = LookupConfiguration.objects.get().current_version_id
        submit_budget(self.owner, budget)
        decide(self.hod, get_approval_steps(self.hod)[0].id, "approve", "")

        self.new_rates()
        decide(self.dean, get_approval_steps(self.dean)[0].id, "approve", "")

        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.APPROVED)
        self.assertEqual(budget.lookup_version_id, at_submit)
