from django.test import TestCase

from api.models import (
    ApprovalStep,
    Budget,
    LookupVersion,
    UserOrgAssignment,
)
from api.services.approval_queue import get_approval_steps
from api.tests.factories import make_budget, make_department, make_project, make_user


class ApprovalQueueTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.lookup_version = LookupVersion.objects.create()

        cls.department = make_department(name="Science")
        cls.faculty = cls.department.faculty
        cls.other_department = make_department("ART", cls.faculty, name="Arts")

        cls.owner = make_user()
        cls.hod = make_user("hod@unimelb.edu.au")
        cls.dean = make_user("dean@unimelb.edu.au")
        cls.unassigned_user = make_user("member@unimelb.edu.au")

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

        cls.hod_budget = make_budget(
            make_project(
                cls.owner,
                cls.department,
                title="HOD Budget",
                start_year=2025,
                end_year=2026,
            ),
            lookup_version=cls.lookup_version,
            status=Budget.Status.HOD_REVIEW,
        )
        cls.dean_budget = make_budget(
            make_project(
                cls.owner,
                cls.department,
                title="Dean Budget",
                start_year=2025,
                end_year=2026,
            ),
            lookup_version=cls.lookup_version,
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

    def test_hod_does_not_see_dean_step(self) -> None:
        steps = get_approval_steps(self.hod)

        self.assertNotIn(self.dean_step, steps)

    def test_dean_does_not_see_hod_step(self) -> None:
        steps = get_approval_steps(self.dean)

        self.assertNotIn(self.hod_step, steps)
