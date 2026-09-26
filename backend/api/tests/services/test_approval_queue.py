from django.test import TestCase

from api.models import (
    ApprovalStep,
    Budget,
    Department,
    Faculty,
    LookupVersion,
    Project,
    User,
    UserOrgAssignment,
)
from api.services.approval_queue import get_approval_steps


class ApprovalQueueTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.lookup_version = LookupVersion.objects.create()

        cls.faculty = Faculty.objects.create(
            code="SCI",
            name="Science Faculty",
        )

        cls.department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=cls.faculty,
        )

        cls.other_department = Department.objects.create(
            code="ART",
            name="Arts",
            school="Arts School",
            school_code="ART",
            faculty=cls.faculty,
        )

        cls.owner = User.objects.create(
            email="owner@unimelb.edu.au",
        )

        cls.hod = User.objects.create(
            email="hod@unimelb.edu.au",
        )

        cls.dean = User.objects.create(
            email="dean@unimelb.edu.au",
        )

        cls.unassigned_user = User.objects.create(
            email="member@unimelb.edu.au",
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

        cls.hod_budget = Budget.objects.create(
            project=Project.objects.create(
                title="HOD Budget",
                department=cls.department,
                chief_investigator="Test Investigator",
                funder="Test Funder",
                start_year=2025,
                start_month=1,
                end_year=2026,
                end_month=12,
                created_by=cls.owner,
            ),
            lookup_version=cls.lookup_version,
            cost_multiplier=1,
            in_kind_multiplier=1,
            margin=0.30,
            gst_applicable=True,
            cash_co_contribution=0,
            status=Budget.Status.HOD_REVIEW,
        )

        cls.dean_budget = Budget.objects.create(
            project=Project.objects.create(
                title="Dean Budget",
                department=cls.department,
                chief_investigator="Test Investigator",
                funder="Test Funder",
                start_year=2025,
                start_month=1,
                end_year=2026,
                end_month=12,
                created_by=cls.owner,
            ),
            lookup_version=cls.lookup_version,
            cost_multiplier=1,
            in_kind_multiplier=1,
            margin=0.30,
            gst_applicable=True,
            cash_co_contribution=0,
            status=Budget.Status.DEAN_REVIEW,
        )

        cls.hod_step = ApprovalStep.objects.create(
            budget=cls.hod_budget,
            level=ApprovalStep.Level.DEPARTMENT,
            status=ApprovalStep.Status.PENDING,
        )

        cls.dean_step = ApprovalStep.objects.create(
            budget=cls.dean_budget,
            level=ApprovalStep.Level.FACULTY,
            status=ApprovalStep.Status.PENDING,
        )

    def test_hod_sees_department_step_for_assigned_department(self) -> None:
        steps = get_approval_steps(self.hod)

        self.assertEqual(steps, [self.hod_step])

    def test_dean_sees_faculty_step_for_assigned_faculty(self) -> None:
        steps = get_approval_steps(self.dean)

        self.assertEqual(steps, [self.dean_step])

    def test_pending_step_is_required(self) -> None:
        self.hod_step.status = ApprovalStep.Status.NOT_REQUIRED
        self.hod_step.save(update_fields=["status"])

        steps = get_approval_steps(self.hod)

        self.assertEqual(steps, [])

    def test_step_must_match_budget_status(self) -> None:
        self.hod_budget.status = Budget.Status.DRAFT
        self.hod_budget.save(update_fields=["status"])

        steps = get_approval_steps(self.hod)

        self.assertEqual(steps, [])

    def test_user_without_assignment_sees_no_steps(self) -> None:
        steps = get_approval_steps(self.unassigned_user)

        self.assertEqual(steps, [])

    def test_budget_owner_cannot_approve_own_budget(self) -> None:
        UserOrgAssignment.objects.create(
            user=self.owner,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )

        steps = get_approval_steps(self.owner)

        self.assertEqual(steps, [])

    def test_member_assignment_does_not_grant_approval_authority(self) -> None:
        UserOrgAssignment.objects.create(
            user=self.unassigned_user,
            role=UserOrgAssignment.Role.MEMBER,
            department=self.department,
        )

        steps = get_approval_steps(self.unassigned_user)

        self.assertEqual(steps, [])

    def test_hod_does_not_see_dean_step(self) -> None:
        steps = get_approval_steps(self.hod)

        self.assertNotIn(self.dean_step, steps)

    def test_dean_does_not_see_hod_step(self) -> None:
        steps = get_approval_steps(self.dean)

        self.assertNotIn(self.hod_step, steps)
