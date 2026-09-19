from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from api.models import (
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    Faculty,
    Project,
)
from api.services.deliverable import create, delete


class DeliverableTestMixin:
    @staticmethod
    def create_department() -> Department:
        return Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=Faculty.objects.get_or_create(
                code="SCI", defaults={"name": "Science Faculty"}
            )[0],
        )

    def create_project(self) -> Project:
        return Project.objects.create(
            title="Test Project",
            department=self.create_department(),
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2026,
            end_month=12,
        )

    def create_budget(self) -> Budget:
        return Budget.objects.create(
            project=self.create_project(),
            cost_multiplier=Decimal("1.0"),
            in_kind_multiplier=Decimal("1.0"),
            margin=Decimal("0.30"),
            gst_applicable=True,
            cash_co_contribution=Decimal(0),
        )

    @staticmethod
    def create_deliverable_type() -> DeliverableType:
        return DeliverableType.objects.create(
            code="TEST",
            name="Test Type",
        )

    def create_deliverable(
        self,
        budget: Budget | None = None,
        **kwargs,
    ) -> Deliverable:
        if budget is None:
            budget = self.create_budget()

        data = {
            "number": 1,
            "description": "Test deliverable",
            "deliverable_type": self.create_deliverable_type(),
            "invoice_amount": Decimal("1000.00"),
            "due_date": "2026-12-31",
            "dependency": None,
            "sponsor": "",
        }
        data.update(kwargs)

        return Deliverable.objects.create(
            budget=budget,
            **data,
        )


class TestCreate(DeliverableTestMixin, TestCase):
    @patch("api.services.deliverable.budget_details.get_budget_details")
    def test_creates_deliverable(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        deliverable_type = self.create_deliverable_type()

        data = {
            "number": 1,
            "description": "Test deliverable",
            "deliverable_type": deliverable_type,
            "invoice_amount": Decimal("1000.00"),
            "due_date": "2026-12-31",
            "dependency": None,
            "sponsor": "Test Sponsor",
        }

        create(budget, data)

        deliverable = Deliverable.objects.get(
            budget=budget,
            number=1,
        )

        self.assertEqual(deliverable.description, "Test deliverable")
        self.assertEqual(deliverable.deliverable_type, deliverable_type)
        self.assertEqual(
            deliverable.invoice_amount,
            Decimal("1000.00"),
        )
        self.assertEqual(deliverable.due_date, "2026-12-31")
        self.assertIsNone(deliverable.dependency)
        self.assertEqual(deliverable.sponsor, "Test Sponsor")

    def test_validates_data_before_saving(self):
        budget = self.create_budget()
        deliverable_type = self.create_deliverable_type()

        data = {
            "number": 1,
            "description": "Test deliverable",
            "deliverable_type": deliverable_type,
            "invoice_amount": Decimal("-100.00"),
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        self.assertFalse(
            Deliverable.objects.filter(
                budget=budget,
                number=1,
            ).exists()
        )

    def test_raises_error_for_duplicate_number(self):
        budget = self.create_budget()
        deliverable_type = self.create_deliverable_type()

        Deliverable.objects.create(
            budget=budget,
            number=1,
            description="Existing deliverable",
            deliverable_type=deliverable_type,
        )

        data = {
            "number": 1,
            "description": "Duplicate deliverable",
            "deliverable_type": deliverable_type,
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        self.assertEqual(
            Deliverable.objects.filter(
                budget=budget,
                number=1,
            ).count(),
            1,
        )

    @patch("api.services.deliverable.budget_details.get_budget_details")
    def test_creates_deliverable_with_optional_fields_empty(
        self, mock_get_budget_details
    ):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        deliverable_type = self.create_deliverable_type()

        data = {
            "number": 1,
            "description": "Test deliverable",
            "deliverable_type": deliverable_type,
        }

        create(budget, data)

        deliverable = Deliverable.objects.get(
            budget=budget,
            number=1,
        )

        self.assertEqual(deliverable.description, "Test deliverable")
        self.assertIsNone(deliverable.invoice_amount)
        self.assertEqual(deliverable.due_date, "")
        self.assertIsNone(deliverable.dependency)
        self.assertEqual(deliverable.sponsor, "")


class TestReturnsTheRepricedBudget(DeliverableTestMixin, TestCase):
    """
    Both routes answer with the whole budget, as the staff and non-staff line
    routes do. The browser replaces its cache with the reply, so a create has
    to come back carrying the new row -- and its id, which is the only way the
    next edit can name it.
    """

    @patch("api.services.deliverable.budget_details.get_budget_details")
    def test_create_returns_the_budget(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {"budget_info": {}}

        budget = self.create_budget()
        deliverable_type = DeliverableType.objects.create(code="REP", name="Report")

        result = create(
            budget,
            {
                "number": 1,
                "description": "Final report",
                "deliverable_type": deliverable_type,
            },
        )

        self.assertEqual(result, {"budget_info": {}})
        mock_get_budget_details.assert_called_once_with(budget)

    @patch("api.services.deliverable.budget_details.get_budget_details")
    def test_delete_returns_the_budget(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {"budget_info": {}}

        deliverable = self.create_deliverable()

        result = delete(deliverable)

        self.assertEqual(result, {"budget_info": {}})


class TestDelete(DeliverableTestMixin, TestCase):
    @patch("api.services.deliverable.budget_details.get_budget_details")
    def test_deletes_deliverable(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        deliverable = self.create_deliverable()
        deliverable_id = deliverable.id

        delete(deliverable)

        self.assertFalse(Deliverable.objects.filter(id=deliverable_id).exists())
