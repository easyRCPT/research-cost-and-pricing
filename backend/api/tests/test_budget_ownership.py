from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from api.models import (
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    Faculty,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    StaffCostLine,
    User,
)
from api.services.project import budget_defaults


class BudgetOwnershipTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # The owner's control request prices the budget, which needs rates.
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )

    def setUp(self):
        self.owner = User.objects.create_user("owner@unimelb.edu.au")
        self.stranger = User.objects.create_user("stranger@unimelb.edu.au")
        faculty, _ = Faculty.objects.get_or_create(
            code="SCI", defaults={"name": "Science Faculty"}
        )
        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=faculty,
        )
        project = Project.objects.create(
            title="Owned",
            department=department,
            start_year=2026,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=self.owner,
        )
        self.budget = Budget.objects.create(project=project, **budget_defaults())
        self.staff_line = StaffCostLine.objects.create(
            budget=self.budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level A.1",
            time_basis="FTE",
        )
        self.non_staff_line = NonStaffCostLine.objects.create(
            budget=self.budget,
            category=NonStaffCostCategory.objects.order_by("ledger_id")[0],
        )
        self.deliverable = Deliverable.objects.create(
            budget=self.budget,
            number=1,
            description="A report",
            deliverable_type=DeliverableType.objects.create(code="REP", name="Report"),
        )

    def routes(self) -> list[tuple[str, str]]:
        # No bodies: the budget lookup has to refuse before anything is validated.
        budget_id = self.budget.id
        return [
            ("get", reverse("budget-detail", args=[budget_id])),
            ("patch", reverse("budget-detail", args=[budget_id])),
            ("post", reverse("staff-line", args=[budget_id])),
            (
                "delete",
                reverse("staff-line-detail", args=[budget_id, self.staff_line.id]),
            ),
            ("post", reverse("non-staff-line", args=[budget_id])),
            (
                "delete",
                reverse(
                    "non-staff-line-detail", args=[budget_id, self.non_staff_line.id]
                ),
            ),
            ("post", reverse("deliverable", args=[budget_id])),
            (
                "delete",
                reverse("deliverable-detail", args=[budget_id, self.deliverable.id]),
            ),
        ]

    def test_someone_elses_budget_is_404_on_every_route(self):
        self.client.force_login(self.stranger)

        for method, url in self.routes():
            with self.subTest(method=method, url=url):
                response = getattr(self.client, method)(
                    url, {}, content_type="application/json"
                )

                self.assertEqual(response.status_code, 404, response.content)

        self.assertTrue(StaffCostLine.objects.filter(pk=self.staff_line.pk).exists())
        self.assertTrue(
            NonStaffCostLine.objects.filter(pk=self.non_staff_line.pk).exists()
        )
        self.assertTrue(Deliverable.objects.filter(pk=self.deliverable.pk).exists())

    def test_the_owner_still_opens_it(self):
        self.client.force_login(self.owner)

        response = self.client.get(reverse("budget-detail", args=[self.budget.id]))

        self.assertEqual(response.status_code, 200, response.content)

    def test_the_list_only_shows_your_own_projects(self):
        self.client.force_login(self.stranger)
        self.assertEqual(self.client.get(reverse("projects")).json(), [])

        self.client.force_login(self.owner)
        titles = [row["title"] for row in self.client.get(reverse("projects")).json()]
        self.assertEqual(titles, ["Owned"])
