from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from api.models import Budget, Department, Faculty, Project, User, UserOrgAssignment
from api.services.project import budget_defaults

DRAFT = Budget.Status.DRAFT
SUBMITTED = Budget.Status.SUBMITTED


class ReviewAccessTestCase(TestCase):
    """
    One faculty with two departments, and a second faculty. The HoD heads the
    first department and the Dean runs the first faculty.
    """

    @classmethod
    def setUpTestData(cls):
        # Opening a budget prices it, which needs rates.
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )

    def setUp(self):
        engineering = Faculty.objects.create(code="ENG", name="Engineering")
        arts = Faculty.objects.create(code="ART", name="Arts")
        self.computing = self.department("CIS", engineering)
        self.civil = self.department("CIV", engineering)
        self.history = self.department("HIS", arts)

        self.owner = User.objects.create_user("owner@unimelb.edu.au")
        self.hod = User.objects.create_user("hod@unimelb.edu.au")
        UserOrgAssignment.objects.create(
            user=self.hod, role="hod", department=self.computing
        )
        self.dean = User.objects.create_user("dean@unimelb.edu.au")
        UserOrgAssignment.objects.create(
            user=self.dean, role="dean", faculty=engineering
        )
        self.admin = User.objects.create_user("admin@unimelb.edu.au")
        self.admin.groups.add(Group.objects.get(name="superadmin"))

    @staticmethod
    def department(code: str, faculty: Faculty) -> Department:
        return Department.objects.create(
            code=code, name=code, school=code, school_code=code, faculty=faculty
        )

    def budget(self, department: Department, status: str) -> Budget:
        project = Project.objects.create(
            title=f"{department.code} {status}",
            department=department,
            start_year=2026,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=self.owner,
        )
        return Budget.objects.create(
            project=project, status=status, **budget_defaults()
        )

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
        Budget.objects.create(project=submitted.project, **budget_defaults())
        self.budget(self.computing, DRAFT)

        self.client.force_login(self.hod)
        rows = self.client.get(reverse("projects")).json()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["budget_id"], submitted.id)
        self.assertEqual(rows[0]["budget_count"], 1)
