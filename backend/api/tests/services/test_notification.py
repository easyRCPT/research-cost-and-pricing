from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from api.models import (
    Budget,
    Department,
    Faculty,
    Project,
    User,
    UserOrgAssignment,
)
from api.services.notification import (
    notify_budget_decision,
    notify_dean_review,
    notify_hod_review,
)


class NotificationTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create_user(
            email="owner@example.com",
            password="password",
        )

        cls.hod = User.objects.create_user(
            email="hod@example.com",
            password="password",
        )

        cls.dean = User.objects.create_user(
            email="dean@example.com",
            password="password",
        )

        cls.faculty = Faculty.objects.create(
            code="SCI",
            name="Science Faculty",
        )

        cls.department = Department.objects.create(
            code="SCI-01",
            name="Science Department",
            school="Science School",
            school_code="SCI",
            faculty=cls.faculty,
        )

        cls.project = Project.objects.create(
            title="Test Project",
            department=cls.department,
            start_year=2026,
            start_month=1,
            end_year=2027,
            end_month=12,
            created_by=cls.owner,
        )

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

    def create_budget(
        self,
        *,
        status: str,
    ) -> Budget:
        return Budget.objects.create(
            project=self.project,
            status=status,
            cost_multiplier=Decimal("1.00"),
            in_kind_multiplier=Decimal("1.00"),
            margin=Decimal("0.3000"),
        )

    @patch("api.services.notification.EmailMultiAlternatives")
    def test_notify_hod_review_sends_to_hod(
        self,
        mock_email,
    ) -> None:
        budget = self.create_budget(
            status=Budget.Status.HOD_REVIEW,
        )

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
        budget = self.create_budget(
            status=Budget.Status.DEAN_REVIEW,
        )

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
        budget = self.create_budget(
            status=Budget.Status.REJECTED,
        )

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
        budget = self.create_budget(
            status=Budget.Status.DEAN_REVIEW,
        )

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
        budget = self.create_budget(
            status=Budget.Status.HOD_REVIEW,
        )

        mock_email.return_value.send.side_effect = Exception(
            "SMTP failed",
        )

        notify_hod_review(budget)
