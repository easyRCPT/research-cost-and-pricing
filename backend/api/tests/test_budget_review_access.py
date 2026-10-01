from django.test import TestCase
from django.urls import reverse

from api.models import Budget, Department, User, UserOrgAssignment
from api.tests.factories import (
    make_budget,
    make_department,
    make_faculty,
    make_project,
    make_user,
    seed_lookups,
)

DRAFT = Budget.Status.DRAFT
SUBMITTED = Budget.Status.SUBMITTED


class ReviewAccessTestCase(TestCase):
    """
    One faculty with two departments, and a second faculty. The HoD heads the
    first department and the Dean runs the first faculty.
    """

    @classmethod
    def setUpTestData(cls):
        seed_lookups()

    def setUp(self):
        engineering = make_faculty("ENG", "Engineering")
        arts = make_faculty("ART", "Arts")
        self.computing = make_department("CIS", engineering)
        self.civil = make_department("CIV", engineering)
        self.history = make_department("HIS", arts)

        self.owner = make_user("owner@unimelb.edu.au")
        self.hod = make_user("hod@unimelb.edu.au")
        UserOrgAssignment.objects.create(
            user=self.hod, role="hod", department=self.computing
        )
        self.dean = make_user("dean@unimelb.edu.au")
        UserOrgAssignment.objects.create(
            user=self.dean, role="dean", faculty=engineering
        )
        self.admin = make_user("admin@unimelb.edu.au", groups=["superadmin"])

    def budget(self, department: Department, status: str) -> Budget:
        project = make_project(
            self.owner, department, title=f"{department.code} {status}"
        )
        return make_budget(project, status=status)

    def get(self, user: User, budget: Budget) -> int:
        self.client.force_login(user)
        return self.client.get(reverse("budget-detail", args=[budget.id])).status_code

    def patch(self, user: User, budget: Budget) -> int:
        self.client.force_login(user)
        url = reverse("budget-detail", args=[budget.id])
        return self.client.patch(url, {}, content_type="application/json").status_code

    def test_who_can_read_what(self):
        cases = [
            ("hod", self.hod, self.computing, SUBMITTED, 200),
            ("hod", self.hod, self.computing, DRAFT, 404),
            ("hod", self.hod, self.civil, SUBMITTED, 404),
            ("dean", self.dean, self.civil, SUBMITTED, 200),
            ("dean", self.dean, self.computing, DRAFT, 404),
            ("dean", self.dean, self.history, SUBMITTED, 404),
            ("superadmin", self.admin, self.history, DRAFT, 200),
        ]
        for who, user, department, status, expected in cases:
            with self.subTest(who=who, department=department.code, status=status):
                budget = self.budget(department, status)

                self.assertEqual(self.get(user, budget), expected)

    def test_readers_who_are_not_the_owner_get_403_on_a_write(self):
        self.assertEqual(
            self.patch(self.hod, self.budget(self.computing, SUBMITTED)), 403
        )
        self.assertEqual(self.patch(self.admin, self.budget(self.history, DRAFT)), 403)

    def test_the_owner_of_a_submitted_budget_still_gets_409(self):
        self.assertEqual(
            self.patch(self.owner, self.budget(self.computing, SUBMITTED)), 409
        )

    def test_a_reviewers_list_shows_the_submitted_attempt_not_the_newer_draft(self):
        submitted = self.budget(self.computing, SUBMITTED)
        make_budget(submitted.project)
        self.budget(self.computing, DRAFT)

        self.client.force_login(self.hod)
        rows = self.client.get(reverse("projects")).json()["results"]

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["budget_id"], submitted.id)
        self.assertEqual(rows[0]["budget_count"], 1)
