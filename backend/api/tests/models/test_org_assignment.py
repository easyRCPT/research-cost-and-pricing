from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.test import TestCase

from api.models import Department, Faculty, User, UserOrgAssignment


class OrgTestMixin:
    def setUp(self):
        self.faculty = Faculty.objects.create(code="SCI", name="Science Faculty")
        self.other_faculty = Faculty.objects.create(code="ART", name="Arts Faculty")
        self.department = Department.objects.create(
            code="SOFT",
            name="Computing and Information Systems",
            school="Engineering School",
            school_code="ENG",
            faculty=self.faculty,
        )
        self.other_department = Department.objects.create(
            code="MECH",
            name="Mechanical Engineering",
            school="Engineering School",
            school_code="ENG",
            faculty=self.faculty,
        )
        self.user = User.objects.create_user(username="hana")


class TestTheScopeMatchesTheRole(OrgTestMixin, TestCase):
    def test_a_head_of_department_is_assigned_to_a_department(self):
        step = UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )

        self.assertEqual(step.faculty, None)

    def test_a_dean_is_assigned_to_a_faculty(self):
        step = UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.DEAN,
            faculty=self.faculty,
        )

        self.assertEqual(step.department, None)

    def test_a_head_of_department_with_a_faculty_is_refused(self):
        # A group cannot say which department; only this row can, so a row
        # scoped to the wrong side of the university decides nothing.
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserOrgAssignment.objects.create(
                user=self.user,
                role=UserOrgAssignment.Role.HOD,
                faculty=self.faculty,
            )

    def test_a_dean_with_a_department_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserOrgAssignment.objects.create(
                user=self.user,
                role=UserOrgAssignment.Role.DEAN,
                department=self.department,
            )

    def test_an_assignment_scoped_to_nothing_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserOrgAssignment.objects.create(
                user=self.user, role=UserOrgAssignment.Role.MEMBER
            )

    def test_an_assignment_scoped_to_both_is_refused(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            UserOrgAssignment.objects.create(
                user=self.user,
                role=UserOrgAssignment.Role.HOD,
                department=self.department,
                faculty=self.faculty,
            )


class TestHowManyOneUserCanHold(OrgTestMixin, TestCase):
    def test_one_user_heads_two_departments(self):
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.other_department,
        )

        self.assertEqual(self.user.org_assignments.count(), 2)

    def test_the_same_role_over_the_same_department_twice_is_refused(self):
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            UserOrgAssignment.objects.create(
                user=self.user,
                role=UserOrgAssignment.Role.HOD,
                department=self.department,
            )

    def test_a_head_of_one_department_can_be_a_member_of_it_too(self):
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.MEMBER,
            department=self.department,
        )

        self.assertEqual(self.user.org_assignments.count(), 2)

    def test_assignments_are_what_the_approval_rule_reads(self):
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.DEAN,
            faculty=self.faculty,
        )

        roles = {a.role for a in self.user.org_assignments.all()}

        self.assertEqual(roles, {"dean"})


class TestTheDoorsAreGroups(TestCase):
    def test_the_three_groups_are_seeded(self):
        # Seeded by a migration, so they are there before anyone signs up.
        self.assertEqual(
            sorted(Group.objects.values_list("name", flat=True)),
            ["researcher", "staff", "superadmin"],
        )

    def test_there_is_no_hod_or_dean_group(self):
        # Being a head of department is an assignment, not a door: a group
        # cannot carry the department, so it would be half a fact.
        self.assertFalse(Group.objects.filter(name__in=["hod", "dean"]).exists())


class TestWhatOutlivesWhat(OrgTestMixin, TestCase):
    def test_deleting_a_user_deletes_their_assignments(self):
        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )

        self.user.delete()

        self.assertEqual(UserOrgAssignment.objects.count(), 0)

    def test_a_department_cannot_be_deleted_out_from_under_an_assignment(self):
        from django.db.models import ProtectedError

        UserOrgAssignment.objects.create(
            user=self.user,
            role=UserOrgAssignment.Role.HOD,
            department=self.department,
        )

        with self.assertRaises(ProtectedError), transaction.atomic():
            self.department.delete()
