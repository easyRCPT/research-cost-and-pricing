from decimal import Decimal

from django.db import transaction
from django.test import TestCase

from api.models import (
    ApprovalStep,
    AuditLog,
    Budget,
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    LookupVersion,
    Project,
    User,
)
from api.services.submission import submit_budget


class ForceRollbackError(Exception):
    pass


class SubmitBudgetTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.lookup_version = LookupVersion.objects.create()

        LookupConfiguration.objects.update(current_version=cls.lookup_version)

        cls.user = User.objects.create(
            email="owner@unimelb.edu.au",
        )

        CalculationConstant.objects.create(
            name="minimum_margin",
            description="Minimum margin requiring Dean approval",
            value=Decimal("0.20"),
            version=cls.lookup_version,
        )

        faculty = Faculty.objects.create(
            code="SCI",
            name="Science Faculty",
        )

        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=faculty,
        )

        project = Project.objects.create(
            title="Test Project",
            department=department,
            chief_investigator="Test Investigator",
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=cls.user,
        )

        cls.budget = Budget.objects.create(
            project=project,
            cost_multiplier=Decimal("1.0"),
            in_kind_multiplier=Decimal("1.0"),
            margin=Decimal("0.30"),
            gst_applicable=True,
            cash_co_contribution=Decimal(0),
        )

    def test_submit_budget_creates_pending_faculty_step(self) -> None:
        submit_budget(self.user, self.budget)

        step = self.budget.approval_steps.get(
            level=ApprovalStep.Level.FACULTY,
        )

        self.assertEqual(
            step.status,
            ApprovalStep.Status.PENDING,
        )

    def test_submit_budget_marks_department_not_required_when_dean_not_required(
        self,
    ) -> None:
        self.budget.margin = Decimal("0.30")
        self.budget.save(update_fields=["margin"])

        submit_budget(self.user, self.budget)

        step = self.budget.approval_steps.get(
            level=ApprovalStep.Level.DEPARTMENT,
        )

        self.assertEqual(
            step.status,
            ApprovalStep.Status.NOT_REQUIRED,
        )

    def test_submit_budget_creates_pending_department_step_when_margin_below_minimum(
        self,
    ) -> None:
        self.budget.margin = Decimal("0.10")
        self.budget.save(update_fields=["margin"])

        submit_budget(self.user, self.budget)

        step = self.budget.approval_steps.get(
            level=ApprovalStep.Level.DEPARTMENT,
        )

        self.assertEqual(
            step.status,
            ApprovalStep.Status.PENDING,
        )

    def test_submit_budget_changes_budget_status_to_hod_review(self) -> None:
        submit_budget(self.user, self.budget)

        self.budget.refresh_from_db()

        self.assertEqual(
            self.budget.status,
            Budget.Status.HOD_REVIEW,
        )

    def test_submit_budget_records_dean_triggers(self) -> None:
        self.budget.margin = Decimal("0.10")
        self.budget.save(update_fields=["margin"])

        submit_budget(self.user, self.budget)

        self.budget.refresh_from_db()

        self.assertEqual(
            self.budget.dean_triggers,
            ["margin_below_minimum"],
        )

    def test_submit_budget_records_submitted_at(self) -> None:
        self.assertIsNone(self.budget.submitted_at)

        submit_budget(self.user, self.budget)

        self.budget.refresh_from_db()

        self.assertIsNotNone(self.budget.submitted_at)

    def test_submit_budget_creates_audit_log(self) -> None:
        submit_budget(self.user, self.budget)

        audit = AuditLog.objects.get(
            action="budget.submit",
            object_type="budget",
            object_id=str(self.budget.id),
        )

        self.assertEqual(
            audit.actor,
            self.user,
        )

        self.assertEqual(
            audit.detail["after"]["status"],
            Budget.Status.HOD_REVIEW,
        )

        self.assertEqual(
            audit.detail["triggers"],
            [],
        )

    def test_failed_submission_does_not_create_audit_log(self) -> None:
        with self.assertRaises(ForceRollbackError), transaction.atomic():
            submit_budget(self.user, self.budget)
            raise ForceRollbackError("force rollback")

        self.assertFalse(
            AuditLog.objects.filter(
                action="budget.submit",
            ).exists()
        )
