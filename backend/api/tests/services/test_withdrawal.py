"""
The owner pulls a costing back out of review (#95), and starts again from a
clone of it.
"""

from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse

from api.exceptions import Conflict
from api.models import ApprovalStep, AuditLog, Budget, User
from api.services.approval_decide import decide
from api.services.approval_queue import get_approval_steps
from api.services.budget_clone import clone_budget
from api.services.submission import submit_budget
from api.services.withdrawal import withdraw_budget

from .test_approval_flow import FlowFixture

SEED = str(Path(settings.BASE_DIR) / "seeds" / "lookups.json")
BELOW_THE_FLOOR = "0.10"  # needs the dean as well as the head of department


class WithdrawTest(FlowFixture):
    def setUp(self):
        super().setUp()
        # The full seeded rates, since the route answers with the priced
        # costing. Its minimum margin still sends BELOW_THE_FLOOR to the dean.
        call_command("loaddata", SEED, verbosity=0)
        cache.clear()
        self.addCleanup(cache.clear)

    def in_review(self, margin: str = "0.30") -> Budget:
        budget = self.a_budget(margin)
        submit_budget(self.owner, budget)
        budget.refresh_from_db()
        return budget

    def with_the_dean(self) -> Budget:
        budget = self.in_review(BELOW_THE_FLOOR)
        step = self.step(budget, ApprovalStep.Level.DEPARTMENT)
        decide(self.hod, step.id, "approve", "")
        budget.refresh_from_db()
        return budget

    def withdraw(self, budget: Budget, user: User | None = None):
        return self.client_as(user or self.owner).post(
            reverse("withdrawal", args=[budget.id])
        )

    def client_as(self, user: User):
        self.client.force_login(user)
        return self.client

    def test_the_owner_withdraws_a_costing_with_the_head_of_department(self):
        budget = self.in_review()

        response = self.withdraw(budget)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["budget_info"]["status"], "withdrawn")
        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.WITHDRAWN)
        self.assertFalse(
            budget.approval_steps.filter(status=ApprovalStep.Status.PENDING).exists()
        )

    def test_an_approval_already_given_keeps_its_decision(self):
        budget = self.with_the_dean()
        department = self.step(budget, ApprovalStep.Level.DEPARTMENT)

        withdraw_budget(self.owner, budget)

        kept = self.step(budget, ApprovalStep.Level.DEPARTMENT)
        self.assertEqual(kept.status, ApprovalStep.Status.APPROVED)
        self.assertEqual(kept.decided_by, self.hod)
        self.assertEqual(kept.decided_at, department.decided_at)
        self.assertEqual(
            self.step(budget, ApprovalStep.Level.FACULTY).status,
            ApprovalStep.Status.NOT_REQUIRED,
        )

    def test_only_a_costing_in_review_can_be_withdrawn(self):
        draft = self.a_budget("0.30")
        approved = self.in_review()
        decide(
            self.hod,
            self.step(approved, ApprovalStep.Level.DEPARTMENT).id,
            "approve",
            "",
        )
        rejected = self.in_review()
        decide(
            self.hod,
            self.step(rejected, ApprovalStep.Level.DEPARTMENT).id,
            "reject",
            "No",
        )
        withdrawn = self.in_review()
        withdraw_budget(self.owner, withdrawn)

        for budget, status in (
            (draft, "draft"),
            (approved, "approved"),
            (rejected, "rejected"),
            (withdrawn, "withdrawn"),
        ):
            with self.subTest(status=status):
                response = self.withdraw(budget)
                self.assertEqual(response.status_code, 409)
                self.assertIn(status, response.json()["errors"][0]["detail"])

    def test_someone_else_is_refused(self):
        budget = self.in_review()

        # The head of department can see it, but it isn't theirs to withdraw.
        self.assertEqual(self.withdraw(budget, self.hod).status_code, 403)
        # A stranger can't see it at all.
        stranger = User.objects.create(email="stranger@unimelb.edu.au")
        self.assertEqual(self.withdraw(budget, stranger).status_code, 404)
        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.HOD_REVIEW)

    def test_it_leaves_every_queue(self):
        at_hod = self.in_review()
        at_dean = self.with_the_dean()

        withdraw_budget(self.owner, at_hod)
        withdraw_budget(self.owner, at_dean)

        self.assertEqual(get_approval_steps(self.hod), [])
        self.assertEqual(get_approval_steps(self.dean), [])

    def test_an_approver_who_had_it_open_is_told_it_was_withdrawn(self):
        budget = self.in_review()
        step = self.step(budget, ApprovalStep.Level.DEPARTMENT)
        withdraw_budget(self.owner, budget)

        with self.assertRaisesRegex(Conflict, "withdrawn by its owner"):
            decide(self.hod, step.id, "approve", "")

    def test_it_stays_read_only(self):
        budget = self.in_review()
        withdraw_budget(self.owner, budget)

        response = self.client_as(self.owner).patch(
            reverse("budget-detail", args=[budget.id]),
            {"section": "budget", "field": "margin", "value": "0.40"},
            "application/json",
        )

        self.assertEqual(response.status_code, 409)

    def test_it_is_logged_once_with_the_steps_it_cancelled(self):
        budget = self.with_the_dean()
        faculty = self.step(budget, ApprovalStep.Level.FACULTY)

        withdraw_budget(self.owner, budget)

        [entry] = AuditLog.objects.filter(action="budget.withdraw")
        self.assertEqual(entry.actor, self.owner)
        self.assertEqual(
            entry.detail,
            {
                "before": {"status": "dean_review"},
                "after": {"status": "withdrawn"},
                "steps_cancelled": [faculty.id],
            },
        )

    def test_a_failure_leaves_everything_as_it_was(self):
        budget = self.in_review()

        with (
            patch("api.services.withdrawal.write_audit", side_effect=RuntimeError),
            self.assertRaises(RuntimeError),
        ):
            withdraw_budget(self.owner, budget)

        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.HOD_REVIEW)
        self.assertEqual(
            self.step(budget, ApprovalStep.Level.DEPARTMENT).status,
            ApprovalStep.Status.PENDING,
        )
        self.assertFalse(AuditLog.objects.filter(action="budget.withdraw").exists())

    def test_the_approvers_it_was_waiting_on_are_told(self):
        budget = self.with_the_dean()
        mail.outbox.clear()

        with self.captureOnCommitCallbacks(execute=True):
            withdraw_budget(self.owner, budget)

        [email] = mail.outbox
        self.assertEqual(email.to, [self.dean.email])
        self.assertIn("withdrawn", email.subject.lower())

    def test_a_new_draft_can_be_made_from_it(self):
        budget = self.in_review()
        withdraw_budget(self.owner, budget)

        draft = clone_budget(self.owner, budget)

        self.assertEqual(draft.status, Budget.Status.DRAFT)
        self.assertEqual(draft.cloned_from, budget)
        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.WITHDRAWN)
