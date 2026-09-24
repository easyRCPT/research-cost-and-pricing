from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from api.models import (
    ApprovalStep,
    Budget,
    Department,
    Faculty,
    Project,
    User,
)


class ApprovalStepTestMixin:
    @staticmethod
    def create_department() -> Department:
        # get_or_create: some tests need two budgets, and they share a
        # department rather than inventing a second one.
        faculty, _ = Faculty.objects.get_or_create(
            code="SCI", defaults={"name": "Science Faculty"}
        )
        department, _ = Department.objects.get_or_create(
            code="SCI",
            defaults={
                "name": "Science",
                "school": "Science School",
                "school_code": "SCI",
                "faculty": faculty,
            },
        )
        return department

    def create_budget(self) -> Budget:
        project = Project.objects.create(
            title="Test Project",
            department=self.create_department(),
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=User.objects.get_or_create(email="owner@unimelb.edu.au")[0],
        )
        return Budget.objects.create(
            project=project,
            cost_multiplier=Decimal("1.0"),
            in_kind_multiplier=Decimal("1.0"),
            margin=Decimal("0.30"),
            gst_applicable=True,
            cash_co_contribution=Decimal(0),
        )

    @staticmethod
    def step(budget: Budget, **overrides) -> ApprovalStep:
        return ApprovalStep.objects.create(
            budget=budget,
            level=overrides.pop("level", ApprovalStep.Level.DEPARTMENT),
            required=overrides.pop("required", True),
            **overrides,
        )


class TestOneStepPerLevel(ApprovalStepTestMixin, TestCase):
    def test_a_budget_carries_a_department_step_and_a_faculty_step(self):
        budget = self.create_budget()

        self.step(budget, level=ApprovalStep.Level.DEPARTMENT)
        self.step(
            budget,
            level=ApprovalStep.Level.FACULTY,
            required=False,
            status=ApprovalStep.Status.NOT_REQUIRED,
        )

        self.assertEqual(budget.approval_steps.count(), 2)

    def test_a_second_step_at_the_same_level_is_refused(self):
        budget = self.create_budget()
        self.step(budget, level=ApprovalStep.Level.DEPARTMENT)

        # Two answers to one question, with nothing to say which counted.
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(budget, level=ApprovalStep.Level.DEPARTMENT)

    def test_the_same_level_on_another_budget_is_fine(self):
        first = self.create_budget()
        second = self.create_budget()

        self.step(first, level=ApprovalStep.Level.DEPARTMENT)
        self.step(second, level=ApprovalStep.Level.DEPARTMENT)

        self.assertEqual(ApprovalStep.objects.count(), 2)


class TestADecidedStepNamesItsDecider(ApprovalStepTestMixin, TestCase):
    def setUp(self):
        self.budget = self.create_budget()
        self.approver = User.objects.create_user(email="hod@unimelb.edu.au")

    def test_a_decision_with_a_decider_and_a_time_is_stored(self):
        step = self.step(
            self.budget,
            status=ApprovalStep.Status.APPROVED,
            decided_by=self.approver,
            decided_at=timezone.now(),
        )

        self.assertEqual(step.status, ApprovalStep.Status.APPROVED)

    def test_approved_without_a_decider_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(
                self.budget,
                status=ApprovalStep.Status.APPROVED,
                decided_at=timezone.now(),
            )

    def test_approved_without_a_time_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(
                self.budget,
                status=ApprovalStep.Status.APPROVED,
                decided_by=self.approver,
            )

    def test_rejected_without_a_decider_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(
                self.budget,
                status=ApprovalStep.Status.REJECTED,
                decided_at=timezone.now(),
            )


class TestAnUndecidedStepNamesNobody(ApprovalStepTestMixin, TestCase):
    def setUp(self):
        self.budget = self.create_budget()
        self.approver = User.objects.create_user(email="hod@unimelb.edu.au")

    def test_a_pending_step_stores_neither(self):
        step = self.step(self.budget)

        self.assertEqual(step.status, ApprovalStep.Status.PENDING)
        self.assertIsNone(step.decided_by)
        self.assertIsNone(step.decided_at)

    def test_a_time_on_a_pending_step_is_refused(self):
        # A timestamp that means nothing, and will be read as though it did.
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(self.budget, decided_at=timezone.now())

    def test_a_decider_on_a_not_required_step_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.step(
                self.budget,
                level=ApprovalStep.Level.FACULTY,
                required=False,
                status=ApprovalStep.Status.NOT_REQUIRED,
                decided_by=self.approver,
            )


class TestWhatOutlivesWhat(ApprovalStepTestMixin, TestCase):
    def test_deleting_a_budget_deletes_its_steps(self):
        budget = self.create_budget()
        self.step(budget)

        budget.delete()

        self.assertEqual(ApprovalStep.objects.count(), 0)

    def test_a_decider_cannot_be_deleted_out_from_under_a_decision(self):
        budget = self.create_budget()
        approver = User.objects.create_user(email="hod@unimelb.edu.au")
        self.step(
            budget,
            status=ApprovalStep.Status.APPROVED,
            decided_by=approver,
            decided_at=timezone.now(),
        )

        # PROTECT: accounts are deactivated, not deleted, and a decision that
        # loses its decider stops being evidence.
        from django.db.models import ProtectedError

        with self.assertRaises(ProtectedError), transaction.atomic():
            approver.delete()

    def test_deactivating_a_decider_leaves_the_decision_intact(self):
        budget = self.create_budget()
        approver = User.objects.create_user(email="hod@unimelb.edu.au")
        step = self.step(
            budget,
            status=ApprovalStep.Status.APPROVED,
            decided_by=approver,
            decided_at=timezone.now(),
        )

        approver.is_active = False
        approver.save(update_fields=["is_active"])

        step.refresh_from_db()
        self.assertEqual(step.decided_by, approver)
        self.assertEqual(step.status, ApprovalStep.Status.APPROVED)


class TestBudgetStatus(ApprovalStepTestMixin, TestCase):
    def test_rejected_is_a_status_a_budget_can_hold(self):
        budget = self.create_budget()

        budget.status = Budget.Status.REJECTED
        budget.full_clean()
        budget.save(update_fields=["status"])

        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.REJECTED)


class TestNoSignatureIsCollected(TestCase):
    def test_no_model_field_holds_a_signature(self):
        # The login, the decision and the timestamp are the evidence.
        from django.apps import apps

        offenders = [
            f"{model.__name__}.{field.name}"
            for model in apps.get_app_config("api").get_models()
            for field in model._meta.get_fields()
            if "signature" in field.name.lower()
        ]

        self.assertEqual(offenders, [])
