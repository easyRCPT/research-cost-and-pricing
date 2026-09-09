from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.test import TestCase

from api.models import (
    Budget,
    Department,
    Project,
    StaffCostLine,
    YearAllocation,
)
from api.services.staff_line import create, delete


class StaffLineTestMixin:
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

    def create_staff_line(
        self,
        budget: Budget | None = None,
        **kwargs,
    ) -> StaffCostLine:
        if budget is None:
            budget = self.create_budget()

        data = {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "in_kind": False,
        }
        data.update(kwargs)

        return StaffCostLine.objects.create(
            budget=budget,
            **data,
        )


class TestCreate(StaffLineTestMixin, TestCase):
    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_creates_staff_line(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()

        data = {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "in_kind": False,
            "allocations": [
                {
                    "year": 2025,
                    "time": Decimal("0.5000"),
                },
                {
                    "year": 2026,
                    "time": Decimal("0.7500"),
                },
            ],
        }

        result = create(budget, data)

        line = StaffCostLine.objects.get(
            budget=budget,
            name_role="Research Assistant",
        )

        self.assertEqual(line.employment_type, "Continuing")
        self.assertEqual(line.category, "Academic")
        self.assertEqual(line.classification, "Level A")
        self.assertEqual(line.time_basis, StaffCostLine.TimeBasis.FTE)
        self.assertFalse(line.in_kind)

        allocations = YearAllocation.objects.filter(
            staff_line=line,
        ).order_by("year")

        self.assertEqual(allocations.count(), 2)

        self.assertEqual(allocations[0].year, 2025)
        self.assertEqual(allocations[0].time, Decimal("0.5000"))

        self.assertEqual(allocations[1].year, 2026)
        self.assertEqual(allocations[1].time, Decimal("0.7500"))

        self.assertEqual(result, {})

        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_creates_staff_line_without_allocations(
        self,
        mock_get_budget_details,
    ):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()

        data = {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "allocations": [],
        }

        create(budget, data)

        line = StaffCostLine.objects.get(
            budget=budget,
            name_role="Research Assistant",
        )

        self.assertEqual(
            YearAllocation.objects.filter(
                staff_line=line,
            ).count(),
            0,
        )

        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_uses_default_values(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()

        data = {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "allocations": [],
        }

        create(budget, data)

        line = StaffCostLine.objects.get(
            budget=budget,
            name_role="Research Assistant",
        )

        self.assertFalse(line.in_kind)

    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_validates_staff_line_before_saving(
        self,
        mock_get_budget_details,
    ):
        budget = self.create_budget()

        data = {
            "name_role": "Invalid Staff",
            "employment_type": "Invalid",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "allocations": [],
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        self.assertFalse(
            StaffCostLine.objects.filter(
                budget=budget,
            ).exists()
        )

        mock_get_budget_details.assert_not_called()

    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_validates_year_allocation_before_saving(
        self,
        mock_get_budget_details,
    ):
        budget = self.create_budget()

        data = {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "allocations": [
                {
                    "year": 2025,
                    "time": Decimal("-0.5000"),
                },
            ],
        }

        with self.assertRaises(ValidationError):
            create(budget, data)

        # The transaction should roll back the StaffCostLine as well.
        self.assertFalse(
            StaffCostLine.objects.filter(
                budget=budget,
            ).exists()
        )

        self.assertEqual(
            YearAllocation.objects.count(),
            0,
        )

        mock_get_budget_details.assert_not_called()


class TestDelete(StaffLineTestMixin, TestCase):
    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_deletes_staff_line(self, mock_get_budget_details):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        line = self.create_staff_line(budget=budget)
        line_id = line.id

        result = delete(budget, line)

        self.assertFalse(
            StaffCostLine.objects.filter(
                id=line_id,
            ).exists()
        )

        self.assertEqual(result, {})

        mock_get_budget_details.assert_called_once_with(budget)

    @patch(
        "api.services.staff_line.budget_details.get_budget_details"
    )
    def test_deletes_year_allocations_with_staff_line(
        self,
        mock_get_budget_details,
    ):
        mock_get_budget_details.return_value = {}

        budget = self.create_budget()
        line = self.create_staff_line(budget=budget)
        line_id = line.id

        YearAllocation.objects.create(
            staff_line=line,
            year=2025,
            time=Decimal("0.5000"),
        )
        YearAllocation.objects.create(
            staff_line=line,
            year=2026,
            time=Decimal("0.7500"),
        )

        delete(budget, line)

        self.assertFalse(
            StaffCostLine.objects.filter(
                id=line_id,
            ).exists()
        )

        self.assertEqual(
            YearAllocation.objects.filter(
                staff_line_id=line_id,
            ).count(),
            0,
        )

        mock_get_budget_details.assert_called_once_with(budget)
