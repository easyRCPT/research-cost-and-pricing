from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from api.models import (
    ApprovalStep,
    Budget,
    Department,
    User,
)
from api.tests.factories import make_budget, make_department, make_project, make_user


class ApprovalStepTestMixin:
    def create_budget(self) -> Budget:
        project = make_project(
            User.objects.filter(email="owner@unimelb.edu.au").first() or make_user(),
            Department.objects.filter(code="SCI").first() or make_department(),
            funder="Test Funder",
            start_year=2025,
            end_year=2026,
        )
        return make_budget(project)

    @staticmethod
    def step(budget: Budget, **overrides) -> ApprovalStep:
        return ApprovalStep.objects.create(
            budget=budget,
            level=overrides.pop("level", ApprovalStep.Level.DEPARTMENT),
            **overrides,
        )


class TestOneStepPerLevel(ApprovalStepTestMixin, TestCase):
    def test_a_budget_carries_a_department_step_and_a_faculty_step(self):
        budget = self.create_budget()

        self.step(budget, level=ApprovalStep.Level.DEPARTMENT)
        self.step(
            budget,
            level=ApprovalStep.Level.FACULTY,
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
        self.approver = make_user(email="hod@unimelb.edu.au")

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
        self.approver = make_user(email="hod@unimelb.edu.au")

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
        approver = make_user(email="hod@unimelb.edu.au")
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
        approver = make_user(email="hod@unimelb.edu.au")
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
