from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from api.models import Budget, Project
from api.tests.factories import (
    make_budget,
    make_department,
    make_project,
    make_user,
    seed_lookups,
)


class ProjectRoutesTestCase(TestCase):
    def setUp(self):
        self.client.force_login(make_user())
        self.url = reverse("projects")
        self.department = make_department(name="Science")

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
        self.assertEqual(response.json()["results"], [])

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

    def test_an_empty_project_opens_and_prices_at_nothing(self):
        # Opening it prices it, which reads the rates: the seeded ones, rather
        # than whatever an earlier test left in the cache.
        seed_lookups()
        cache.clear()
        self.addCleanup(cache.clear)
        response = self.client.post(self.url, {}, content_type="application/json")

        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertEqual(body["title"], "")
        self.assertEqual(body["department"], "")
        self.assertIsNone(body["end_year"])

        detail = self.client.get(reverse("budget-detail", args=[body["budget_id"]]))

        self.assertEqual(detail.status_code, 200, detail.content)
        self.assertEqual(detail.json()["project_info"]["cost_centre"], "")

    def test_a_created_project_turns_up_in_the_list(self):
        self.client.post(
            self.url,
            self.valid_body(),
            content_type="application/json",
        )

        body = self.client.get(self.url).json()["results"]

        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["title"], "Test Project")

    def test_the_list_carries_the_stored_price(self):
        created = self.client.post(
            self.url,
            self.valid_body(),
            content_type="application/json",
        ).json()
        Budget.objects.filter(pk=created["budget_id"]).update(
            total_price_inc_gst=Decimal("98765.43")
        )

        body = self.client.get(self.url).json()["results"]

        self.assertEqual(body[0]["total_price_inc_gst"], 98765.43)

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
        owner = make_user()
        self.client.force_login(owner)
        project = make_project(owner, funder="Test Funder")
        self.budget = make_budget(project)
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
