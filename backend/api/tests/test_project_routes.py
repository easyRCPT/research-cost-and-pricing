from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from api.models import Budget, Department, Project


class ProjectRoutesTestCase(TestCase):
    def setUp(self):
        self.url = reverse("projects")
        self.department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty="Science Faculty",
            faculty_code="SCI",
        )

    def valid_body(self, **overrides) -> dict:
        return {
            "title": "Test Project",
            "department": self.department.code,
            "funder": "Test Funder",
            "start_year": 2026,
            "start_month": 1,
            "end_year": 2028,
            "end_month": 12,
            **overrides,
        }

    def test_list_is_empty_to_begin_with(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_create_returns_the_row_the_list_screen_needs(self):
        response = self.client.post(
            self.url,
            self.valid_body(),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        budget = Project.objects.get(pk=body["id"]).budgets.get()

        self.assertEqual(body["title"], "Test Project")
        self.assertEqual(body["department"], "Science")
        self.assertEqual(body["status"], Budget.Status.DRAFT)
        self.assertEqual(body["budget_id"], budget.id)
        self.assertEqual(body["reference"], f"RCP-2026-{body['id']:04d}")

    def test_a_created_project_turns_up_in_the_list(self):
        self.client.post(
            self.url,
            self.valid_body(),
            content_type="application/json",
        )

        body = self.client.get(self.url).json()

        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["title"], "Test Project")

    def test_the_list_carries_the_stored_price(self):
        created = self.client.post(
            self.url,
            self.valid_body(),
            content_type="application/json",
        ).json()
        Budget.objects.filter(pk=created["budget_id"]).update(
            total_price_exc_gst=Decimal("98765.43")
        )

        body = self.client.get(self.url).json()

        self.assertEqual(body[0]["total_price_exc_gst"], 98765.43)

    def test_rejects_a_project_that_ends_before_it_starts(self):
        response = self.client.post(
            self.url,
            self.valid_body(end_year=2025),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Project.objects.count(), 0)


class ModelValidationTestCase(TestCase):
    """full_clean() failures are bad requests, not server errors."""

    def setUp(self):
        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty="Science Faculty",
            faculty_code="SCI",
        )
        project = Project.objects.create(
            title="Test Project",
            department=department,
            funder="Test Funder",
            start_year=2026,
            start_month=1,
            end_year=2028,
            end_month=12,
        )
        self.budget = Budget.objects.create(
            project=project,
            cost_multiplier=Decimal("1.70"),
            in_kind_multiplier=Decimal("1.70"),
            margin=Decimal("0.30"),
        )
        self.url = reverse("budget-detail", args=[self.budget.id])

    def patch(self, body):
        return self.client.patch(self.url, body, content_type="application/json")

    def test_a_value_too_long_for_its_field_is_a_bad_request(self):
        response = self.patch(
            {
                "section": "project",
                "field": "chief_investigator",
                "value": "x" * 500,
            }
        )

        self.assertEqual(response.status_code, 400, response.content)

    def test_the_rejected_field_is_named(self):
        response = self.patch(
            {
                "section": "project",
                "field": "chief_investigator",
                "value": "x" * 500,
            }
        )

        attrs = [error["attr"] for error in response.json()["errors"]]
        self.assertIn("chief_investigator", attrs)

    def test_clearing_the_title_while_retyping_it_is_allowed(self):
        response = self.patch({"section": "project", "field": "title", "value": ""})

        self.assertEqual(response.status_code, 204, response.content)
