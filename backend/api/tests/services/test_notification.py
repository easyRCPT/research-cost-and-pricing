from unittest.mock import patch

from django.test import TestCase

from api.models import (
    Budget,
    UserOrgAssignment,
)
from api.services.notification import (
    notify_budget_decision,
    notify_dean_review,
    notify_hod_review,
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

    @patch("api.services.notification.EmailMultiAlternatives")
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
            "Budget requires HOD review",
        )

    @patch("api.services.notification.EmailMultiAlternatives")
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
            "Budget requires Dean review",
        )

    @patch("api.services.notification.EmailMultiAlternatives")
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
            "Budget approval updated",
        )

    @patch("api.services.notification.render_to_string")
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

    @patch("api.services.notification.EmailMultiAlternatives")
    def test_email_failure_does_not_raise(
        self,
        mock_email,
    ) -> None:
        budget = make_budget(self.project, status=Budget.Status.HOD_REVIEW)

        mock_email.return_value.send.side_effect = Exception(
            "SMTP failed",
        )

        notify_hod_review(budget)
