from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from django.utils import timezone

from api.models import (
    ApprovalStep,
    Budget,
    UserOrgAssignment,
)
from api.services.notification import (
    notify_budget_decision,
    notify_dean_review,
    notify_hod_review,
    notify_withdrawn,
)
from api.tests.factories import make_budget, make_department, make_project, make_user


class NotificationTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = make_user("owner@example.com")
        cls.hod = make_user("hod@example.com")
        cls.dean = make_user("dean@example.com")

        cls.department = make_department()
        cls.faculty = cls.department.faculty
        cls.project = make_project(cls.owner, cls.department, end_year=2027)

        UserOrgAssignment.objects.create(
            user=cls.hod,
            role=UserOrgAssignment.Role.HOD,
            department=cls.department,
        )

        UserOrgAssignment.objects.create(
            user=cls.dean,
            role=UserOrgAssignment.Role.DEAN,
            faculty=cls.faculty,
        )

    @patch("api.services.notification.sender.EmailMultiAlternatives")
    def test_notify_hod_review_sends_to_hod(
        self,
        mock_email,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.HOD_REVIEW)

        notify_hod_review(budget)

        mock_email.assert_called_once()

        kwargs = mock_email.call_args.kwargs

        self.assertEqual(
            kwargs["to"],
            ["hod@example.com"],
        )

        self.assertEqual(
            kwargs["subject"],
            "Approval needed: Test Project",
        )

    @patch("api.services.notification.sender.EmailMultiAlternatives")
    def test_notify_dean_review_sends_to_dean(
        self,
        mock_email,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.DEAN_REVIEW)

        budget.dean_triggers = [
            "High value",
            "External sponsor",
        ]
        budget.save(
            update_fields=["dean_triggers"],
        )

        notify_dean_review(budget)

        mock_email.assert_called_once()

        kwargs = mock_email.call_args.kwargs

        self.assertEqual(
            kwargs["to"],
            ["dean@example.com"],
        )

        self.assertEqual(
            kwargs["subject"],
            "Dean approval needed: Test Project",
        )

    @patch("api.services.notification.sender.EmailMultiAlternatives")
    def test_notify_budget_owner_after_rejection(
        self,
        mock_email,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.REJECTED)

        notify_budget_decision(
            budget,
            decision="reject",
            comment="Budget is not suitable.",
            approver=self.hod,
        )

        mock_email.assert_called_once()

        kwargs = mock_email.call_args.kwargs

        self.assertEqual(
            kwargs["to"],
            ["owner@example.com"],
        )

        self.assertEqual(
            kwargs["subject"],
            "Rejected: Test Project",
        )

    @patch("api.services.notification.sender.render_to_string")
    def test_notify_budget_owner_passes_context(
        self,
        mock_render,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.DEAN_REVIEW)

        notify_budget_decision(
            budget,
            decision="approve",
            approver=self.hod,
        )

        self.assertEqual(
            mock_render.call_count,
            2,
        )

        html_call = mock_render.call_args_list[1]

        context = html_call.args[1]

        self.assertEqual(
            context["budget"],
            budget,
        )

        self.assertEqual(
            context["decision"],
            "approve",
        )

        self.assertEqual(
            context["approver"],
            self.hod,
        )

        self.assertTrue(
            context["requires_dean_review"],
        )

    @patch("api.services.notification.sender.render_to_string")
    def test_links_to_the_costings_approvals_screen(self, mock_render) -> None:
        budget = make_budget(self.project, status=Budget.Status.HOD_REVIEW)

        with self.settings(FRONTEND_URL="https://easyrcpt.example"):
            notify_hod_review(budget)

        context = mock_render.call_args.args[1]
        self.assertEqual(
            context["url"],
            f"https://easyrcpt.example/projects/{self.project.id}/approvals",
        )

    def test_dean_email_says_why_in_words(self) -> None:
        budget = make_budget(self.project, status=Budget.Status.DEAN_REVIEW)
        budget.dean_triggers = ["margin_below_minimum", "something_new"]

        notify_dean_review(budget)

        [email] = mail.outbox
        self.assertIn("The margin is below the University's minimum.", email.body)
        self.assertIn("something_new", email.body)
        self.assertNotIn("margin_below_minimum", email.body)

    @patch("api.services.notification.sender.EmailMultiAlternatives")
    def test_email_failure_does_not_raise(
        self,
        mock_email,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.HOD_REVIEW)

        mock_email.return_value.send.side_effect = Exception(
            "SMTP failed",
        )

        notify_hod_review(budget)

    def test_withdrawn_goes_to_every_level_it_was_waiting_on(self) -> None:
        budget = make_budget(self.project, status=Budget.Status.DEAN_REVIEW)

        notify_withdrawn(budget, levels=["department", "faculty"])

        [email] = mail.outbox
        self.assertEqual(email.to, ["dean@example.com", "hod@example.com"])
        self.assertEqual(email.subject, "Withdrawn: Test Project")

    def test_timeline_shows_each_step_that_applies(self) -> None:
        budget = make_budget(
            self.project, status=Budget.Status.REJECTED, submitted_at=timezone.now()
        )
        ApprovalStep.objects.create(
            budget=budget,
            level=ApprovalStep.Level.DEPARTMENT,
            status=ApprovalStep.Status.REJECTED,
            decided_by=self.hod,
            decided_at=timezone.now(),
            comment="No.",
        )
        ApprovalStep.objects.create(
            budget=budget,
            level=ApprovalStep.Level.FACULTY,
            status=ApprovalStep.Status.NOT_REQUIRED,
        )

        notify_budget_decision(
            budget, decision="reject", comment="No.", approver=self.hod
        )

        [email] = mail.outbox
        self.assertIn("Submitted for approval:", email.body)
        self.assertIn("Head of Department approval: rejected", email.body)
        self.assertIn("  > No.", email.body)
        self.assertEqual(email.body.count("No."), 1)
        self.assertNotIn("Dean approval", email.body)

    def test_timeline_shows_a_waiting_step_as_pending(self) -> None:
        budget = make_budget(
            self.project, status=Budget.Status.HOD_REVIEW, submitted_at=timezone.now()
        )
        ApprovalStep.objects.create(budget=budget, level=ApprovalStep.Level.DEPARTMENT)

        notify_hod_review(budget)

        [email] = mail.outbox
        self.assertIn("Head of Department approval: pending", email.body)

    def test_withdrawn_timeline_ends_with_the_withdrawal(self) -> None:
        budget = make_budget(
            self.project, status=Budget.Status.WITHDRAWN, submitted_at=timezone.now()
        )

        notify_withdrawn(budget, levels=["department"])

        [email] = mail.outbox
        self.assertIn("Withdrawn:", email.body.split("Progress:")[1])

    def test_approver_emails_copy_in_the_researcher(self) -> None:
        budget = make_budget(self.project, status=Budget.Status.DEAN_REVIEW)

        notify_hod_review(budget)
        notify_dean_review(budget)
        notify_withdrawn(budget, levels=["faculty"])

        self.assertEqual(
            [email.cc for email in mail.outbox], [["owner@example.com"]] * 3
        )

    def test_decision_email_copies_no_one(self) -> None:
        budget = make_budget(self.project, status=Budget.Status.REJECTED)

        notify_budget_decision(budget, decision="reject", approver=self.hod)

        [email] = mail.outbox
        self.assertEqual(email.cc, [])

    def test_researcher_who_is_also_the_hod_is_not_copied_twice(self) -> None:
        UserOrgAssignment.objects.create(
            user=self.owner,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )
        budget = make_budget(self.project, status=Budget.Status.HOD_REVIEW)

        notify_hod_review(budget)

        [email] = mail.outbox
        self.assertIn("owner@example.com", email.to)
        self.assertEqual(email.cc, [])
