from decimal import Decimal

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.test import TestCase

from api.exceptions import Conflict, UnprocessableEntity
from api.models import (
    ApprovalStep,
    AuditLog,
    Budget,
    Department,
    Faculty,
    LookupConfiguration,
    LookupVersion,
    Project,
    User,
    UserOrgAssignment,
)
from api.services.approval_decide import decide

from .test_submission import ForceRollbackError


class ApprovalDecideTest(TestCase):
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

        cls.other_user = User.objects.create_user(
            email="other@example.com",
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

        cls.lookup_version = LookupVersion.objects.create()

        config, _ = LookupConfiguration.objects.get_or_create(
            id=1,
            defaults={
                "current_version": cls.lookup_version,
            },
        )

        config.current_version = cls.lookup_version
        config.referenced = False
        config.save(
            update_fields=[
                "current_version",
                "referenced",
            ],
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
        dean_required: bool = True,
    ) -> Budget:
        budget = Budget.objects.create(
            project=self.project,
            status=Budget.Status.HOD_REVIEW,
            cost_multiplier=Decimal("1.00"),
            in_kind_multiplier=Decimal("1.00"),
            margin=Decimal("0.3000"),
        )

        ApprovalStep.objects.create(
            budget=budget,
            level=ApprovalStep.Level.DEPARTMENT,
            status=ApprovalStep.Status.PENDING,
        )

        ApprovalStep.objects.create(
            budget=budget,
            level=ApprovalStep.Level.FACULTY,
            status=(
                ApprovalStep.Status.PENDING
                if dean_required
                else ApprovalStep.Status.NOT_REQUIRED
            ),
        )

        return budget

    def get_step(
        self,
        budget: Budget,
        level: str,
    ) -> ApprovalStep:
        return ApprovalStep.objects.get(
            budget=budget,
            level=level,
        )

    def test_hod_can_approve_department_step(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=step.id,
            decision="approve",
            comment="Approved by HOD",
        )

        step.refresh_from_db()
        budget.refresh_from_db()

        config = LookupConfiguration.objects.get()

        self.assertEqual(
            step.status,
            ApprovalStep.Status.APPROVED,
        )

        self.assertEqual(
            step.decided_by,
            self.hod,
        )

        self.assertEqual(
            budget.status,
            Budget.Status.DEAN_REVIEW,
        )

        self.assertEqual(
            budget.lookup_version_id,
            self.lookup_version.id,
        )

        self.assertTrue(config.referenced)

    def test_hod_can_reject_department_step(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=step.id,
            decision="reject",
            comment="Budget is not suitable.",
        )

        step.refresh_from_db()
        budget.refresh_from_db()

        faculty_step = self.get_step(
            budget,
            ApprovalStep.Level.FACULTY,
        )

        config = LookupConfiguration.objects.get()

        self.assertEqual(
            step.status,
            ApprovalStep.Status.REJECTED,
        )

        self.assertEqual(
            budget.status,
            Budget.Status.REJECTED,
        )

        self.assertEqual(
            faculty_step.status,
            ApprovalStep.Status.NOT_REQUIRED,
        )

        self.assertEqual(
            budget.lookup_version_id,
            self.lookup_version.id,
        )

        self.assertTrue(config.referenced)

    def test_dean_can_approve_faculty_step(self) -> None:
        budget = self.create_budget()

        # Simulate HOD approval first
        department_step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=department_step.id,
            decision="approve",
            comment="Approved by HOD",
        )

        faculty_step = self.get_step(
            budget,
            ApprovalStep.Level.FACULTY,
        )

        decide(
            user=self.dean,
            step_id=faculty_step.id,
            decision="approve",
            comment="Approved by Dean",
        )

        faculty_step.refresh_from_db()
        budget.refresh_from_db()

        self.assertEqual(
            faculty_step.status,
            ApprovalStep.Status.APPROVED,
        )

        self.assertEqual(
            budget.status,
            Budget.Status.APPROVED,
        )

    def test_hod_approval_without_dean_requirement_approves_budget(
        self,
    ) -> None:
        budget = self.create_budget(
            dean_required=False,
        )

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=step.id,
            decision="approve",
            comment="Approved by HOD",
        )

        budget.refresh_from_db()

        self.assertEqual(
            budget.status,
            Budget.Status.APPROVED,
        )

    def test_user_without_role_cannot_approve(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        with self.assertRaises(PermissionDenied):
            decide(
                user=self.other_user,
                step_id=step.id,
                decision="approve",
                comment="Should fail",
            )

    def test_project_owner_cannot_approve(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        with self.assertRaises(PermissionDenied):
            decide(
                user=self.owner,
                step_id=step.id,
                decision="approve",
                comment="Should fail",
            )

    def test_cannot_decide_completed_step(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=step.id,
            decision="approve",
            comment="First approval",
        )

        with self.assertRaises(Conflict):
            decide(
                user=self.hod,
                step_id=step.id,
                decision="approve",
                comment="Second approval",
            )

    def test_reject_requires_comment(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        with self.assertRaises(UnprocessableEntity):
            decide(
                user=self.hod,
                step_id=step.id,
                decision="reject",
                comment="",
            )

    def test_decide_creates_audit_log(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        decide(
            user=self.hod,
            step_id=step.id,
            decision="approve",
            comment="Approved by HOD",
        )

        audit = AuditLog.objects.get(
            action="approval.decide",
            object_type="budget",
            object_id=str(budget.id),
        )

        self.assertEqual(
            audit.actor,
            self.hod,
        )

        self.assertEqual(
            audit.detail["before"]["status"],
            Budget.Status.HOD_REVIEW,
        )

        self.assertEqual(
            audit.detail["after"]["status"],
            Budget.Status.DEAN_REVIEW,
        )

        self.assertEqual(
            audit.detail["step"],
            step.id,
        )

        self.assertEqual(
            audit.detail["level"],
            ApprovalStep.Level.DEPARTMENT,
        )

        self.assertEqual(
            audit.detail["decision"],
            "approve",
        )

        self.assertEqual(
            audit.detail["lookup_version_id"],
            self.lookup_version.id,
        )

    def test_failed_decision_does_not_create_audit_log(self) -> None:
        budget = self.create_budget()

        step = self.get_step(
            budget,
            ApprovalStep.Level.DEPARTMENT,
        )

        with self.assertRaises(ForceRollbackError), transaction.atomic():
            decide(
                user=self.hod,
                step_id=step.id,
                decision="approve",
                comment="Approved",
            )
            raise ForceRollbackError("force rollback")

        self.assertFalse(
            AuditLog.objects.filter(
                action="approval.decide",
            ).exists()
        )
