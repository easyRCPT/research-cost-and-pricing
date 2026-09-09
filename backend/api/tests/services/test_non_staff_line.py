from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from api.models import (
    Budget,
    Department,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    YearAmount,
)
from api.services.non_staff_line import create, delete


class NonStaffLineTestMixin:
    @staticmethod
    def create_department() -> Department:
        return Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty="Science Faculty",
            faculty_code="SCI",
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
            cash_co_contribution=Decimal("0"),
        )

    @staticmethod
    def create_category() -> NonStaffCostCategory:
        return NonStaffCostCategory.objects.create(
            ledger_id=1000,
            cost_category="Equipment",
            cost_subcategory="Equipment",
        )

    def create_non_staff_line(
        self,
        budget: Budget | None = None,
        **kwargs,
    ) -> NonStaffCostLine:
        if budget is None:
            budget = self.create_budget()

        data = {
            "category": self.create_category(),
            "description": "Test non-staff cost",
            "in_kind": False,
            "add_ten_percent": False,
            "indirect_rate_multiplier": None,
        }
        data.update(kwargs)

        return NonStaffCostLine.objects.create(
            budget=budget,
            **data,
        )


class TestCreate(NonStaffLineTestMixin, TestCase):
    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_creates_non_staff_line(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        category = self.create_category()

        data = {
            "category": category,
            "description": "Test equipment",
            "in_kind": False,
            "add_ten_percent": True,
            "indirect_rate_multiplier": Decimal("1.20"),
            "amounts": [
                {
                    "year": 2025,
                    "amount": Decimal("1000.00"),
                },
                {
                    "year": 2026,
                    "amount": Decimal("2000.00"),
                },
            ],
        }

        result = create(budget, data)

        line = NonStaffCostLine.objects.get(
            budget=budget,
            description="Test equipment",
        )

        self.assertEqual(line.category, category)
        self.assertFalse(line.in_kind)
        self.assertTrue(line.add_ten_percent)
        self.assertEqual(
            line.indirect_rate_multiplier,
            Decimal("1.20"),
        )

        amounts = YearAmount.objects.filter(
            non_staff_line=line,
        ).order_by("year")

        self.assertEqual(amounts.count(), 2)

        self.assertEqual(amounts[0].year, 2025)
        self.assertEqual(amounts[0].amount, Decimal("1000.00"))

        self.assertEqual(amounts[1].year, 2026)
        self.assertEqual(amounts[1].amount, Decimal("2000.00"))

        self.assertEqual(result, {})

        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_creates_non_staff_line_without_amounts(
        self,
        mock_get_budget_details,
    ):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        category = self.create_category()

        data = {
            "category": category,
            "description": "Test cost",
            "amounts": [],
        }

        create(budget, data)

        line = NonStaffCostLine.objects.get(
            budget=budget,
            description="Test cost",
        )

        self.assertEqual(
            YearAmount.objects.filter(
                non_staff_line=line,
            ).count(),
            0,
        )

        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_uses_default_values(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        category = self.create_category()

        data = {
            "category": category,
            "description": "Test cost",
            "amounts": [],
        }

        create(budget, data)

        line = NonStaffCostLine.objects.get(
            budget=budget,
            description="Test cost",
        )

        self.assertFalse(line.in_kind)
        self.assertFalse(line.add_ten_percent)
        self.assertIsNone(line.indirect_rate_multiplier)

    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_validates_non_staff_line_before_saving(
        self,
        mock_get_budget_details,
    ):
        budget = self.create_budget()

        data = {
            "category": None,
            "description": "Invalid cost",
            "amounts": [],
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        self.assertFalse(
            NonStaffCostLine.objects.filter(
                budget=budget,
            ).exists()
        )

        mock_get_budget_details.assert_not_called()

    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_validates_year_amount_before_saving(
        self,
        mock_get_budget_details,
    ):
        budget = self.create_budget()
        category = self.create_category()

        data = {
            "category": category,
            "description": "Test cost",
            "amounts": [
                {
                    "year": 2025,
                    "amount": Decimal("-100.00"),
                },
            ],
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        self.assertFalse(
            NonStaffCostLine.objects.filter(
                budget=budget,
            ).exists()
        )

        self.assertEqual(
            YearAmount.objects.count(),
            0,
        )

        mock_get_budget_details.assert_not_called()


class TestDelete(NonStaffLineTestMixin, TestCase):
    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_deletes_non_staff_line(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        line = self.create_non_staff_line(budget=budget)
        line_id = line.id

        result = delete(budget, line)

        self.assertFalse(
            NonStaffCostLine.objects.filter(
                id=line_id,
            ).exists()
        )

        self.assertEqual(result, {})
        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.non_staff_line.budget_details.get_budget_details"
    )
    def test_deletes_year_amounts_with_non_staff_line(
        self,
        mock_get_budget_details,
    ):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        line = self.create_non_staff_line(budget=budget)
        line_id = line.id

        YearAmount.objects.create(
            non_staff_line=line,
            year=2025,
            amount=Decimal("1000.00"),
        )
        YearAmount.objects.create(
            non_staff_line=line,
            year=2026,
            amount=Decimal("2000.00"),
        )

        delete(budget, line)

        self.assertFalse(
            NonStaffCostLine.objects.filter(
                id=line_id,
            ).exists()
        )

        self.assertEqual(
            YearAmount.objects.filter(
                non_staff_line_id=line_id,
            ).count(),
            0,
        )

        mock_get_budget_details.assert_called_once_with(budget)
