from decimal import Decimal
from typing import Any

from django.test import TestCase

from api.models import Budget, Department, Project, StaffCostLine
from api.serializers.staff_line_serializer import StaffLineSerializer

from .serializer_utils import get_errors, get_validated_data


class StaffLineSerializerTestCase(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty="Science Faculty",
            faculty_code="SCI",
        )

        self.project = Project.objects.create(
            title="Test Project",
            department=self.department,
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2027,
            end_month=12,
        )

        self.budget = Budget.objects.create(
            project=self.project,
            cost_multiplier=Decimal("1.00"),
            in_kind_multiplier=Decimal("1.00"),
        )

    @staticmethod
    def valid_data() -> dict[str, Any]:
        return {
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A",
            "time_basis": "FTE",
            "in_kind": False,
            "allocations": [
                {"year": 2025, "time": "0.5000"},
                {"year": 2026, "time": "0.2500"},
            ],
        }

    def serializer(self, data: dict[str, Any] | None = None):
        if data is None:
            data = self.valid_data()

        return StaffLineSerializer(
            data=data,
            context={"budget": self.budget},
        )

    def test_valid_data(self):
        serializer = self.serializer()

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(
            validated_data["name_role"],
            "Research Assistant",
        )
        self.assertEqual(
            validated_data["employment_type"],
            "Continuing",
        )
        self.assertEqual(
            validated_data["category"],
            "Academic",
        )
        self.assertEqual(
            validated_data["classification"],
            "Level A",
        )
        self.assertEqual(
            validated_data["time_basis"],
            StaffCostLine.TimeBasis.FTE,
        )
        self.assertFalse(validated_data["in_kind"])

    def test_allocations_are_validated(self):
        serializer = self.serializer()

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(
            validated_data["allocations"][0]["year"],
            2025,
        )
        self.assertEqual(
            validated_data["allocations"][0]["time"],
            Decimal("0.5000"),
        )

    def test_optional_in_kind_defaults_to_false(self):
        data = self.valid_data()
        del data["in_kind"]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        validated_data = get_validated_data(serializer)
        self.assertFalse(validated_data["in_kind"])

    def test_allocations_can_be_omitted(self):
        data = self.valid_data()
        del data["allocations"]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        validated_data = get_validated_data(serializer)
        self.assertNotIn("allocations", validated_data)

    def test_allocation_year_must_be_within_project_period(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2024, "time": "0.5000"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("allocations", get_errors(serializer))
        self.assertEqual(
            str(get_errors(serializer)["allocations"][0]),
            "Year must be between 2025 and 2027.",
        )

    def test_allocation_year_can_be_start_year(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2025, "time": "0.5000"},
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_allocation_year_can_be_end_year(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2027, "time": "0.5000"},
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_duplicate_allocation_year_is_rejected(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2025, "time": "0.5000"},
            {"year": 2025, "time": "0.2500"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("allocations", get_errors(serializer))
        self.assertEqual(
            str(get_errors(serializer)["allocations"][0]),
            "Each year can only have one allocation.",
        )

    def test_time_must_not_exceed_fte_limit(self):
        data = self.valid_data()
        data["time_basis"] = "FTE"
        data["allocations"] = [
            {"year": 2025, "time": "1.0001"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", get_errors(serializer))
        self.assertIn(
            "Time for 2025 cannot exceed 1 for time basis 'FTE'.",
            str(get_errors(serializer)["non_field_errors"]),
        )

    def test_time_at_fte_limit_is_valid(self):
        data = self.valid_data()
        data["time_basis"] = "FTE"
        data["allocations"] = [
            {"year": 2025, "time": "1.0000"},
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_daily_time_must_not_exceed_limit(self):
        data = self.valid_data()
        data["time_basis"] = "Daily"
        data["allocations"] = [
            {"year": 2025, "time": "220.0001"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", get_errors(serializer))
        self.assertIn(
            "Time for 2025 cannot exceed 220 for time basis 'Daily'.",
            str(get_errors(serializer)["non_field_errors"]),
        )

    def test_hourly_time_must_not_exceed_limit(self):
        data = self.valid_data()
        data["time_basis"] = "Hourly"
        data["allocations"] = [
            {"year": 2025, "time": str(366 * 24 + 0.0001)},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", get_errors(serializer))

    def test_year_allocation_time_has_at_most_four_decimal_places(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2025, "time": "0.12345"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("allocations", get_errors(serializer))

    def test_year_allocation_time_cannot_exceed_max_digits(self):
        data = self.valid_data()
        data["allocations"] = [
            {"year": 2025, "time": "12345.6789"},
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("allocations", get_errors(serializer))

    def test_name_role_is_required(self):
        data = self.valid_data()
        del data["name_role"]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("name_role", get_errors(serializer))

    def test_employment_type_is_required(self):
        data = self.valid_data()
        del data["employment_type"]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("employment_type", get_errors(serializer))

    def test_category_is_required(self):
        data = self.valid_data()
        del data["category"]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("category", get_errors(serializer))

    def test_classification_is_required(self):
        data = self.valid_data()
        del data["classification"]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("classification", get_errors(serializer))

    def test_time_basis_is_required(self):
        data = self.valid_data()
        del data["time_basis"]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("time_basis", get_errors(serializer))

    def test_invalid_employment_type(self):
        data = self.valid_data()
        data["employment_type"] = "Invalid"

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("employment_type", get_errors(serializer))

    def test_invalid_category(self):
        data = self.valid_data()
        data["category"] = "Invalid"

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("category", get_errors(serializer))

    def test_invalid_time_basis(self):
        data = self.valid_data()
        data["time_basis"] = "Invalid"

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("time_basis", get_errors(serializer))

    def test_classification_cannot_exceed_max_length(self):
        data = self.valid_data()
        data["classification"] = "x" * 21

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("classification", get_errors(serializer))

    def test_name_role_cannot_exceed_max_length(self):
        data = self.valid_data()
        data["name_role"] = "x" * 101

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("name_role", get_errors(serializer))
