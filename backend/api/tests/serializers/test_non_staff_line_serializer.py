from decimal import Decimal

from django.test import TestCase

from api.models import (
    Budget,
    Department,
    NonStaffCostCategory,
    Project,
)
from api.serializers.non_staff_line_serializer import NonStaffLineSerializer


class NonStaffLineSerializerTestCase(TestCase):
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

        self.category = NonStaffCostCategory.objects.create(
            ledger_id=1001,
            cost_category="Travel",
            cost_subcategory="Domestic",
        )

    @staticmethod
    def valid_data() -> dict:
        return {
            "cost_group": "Travel",
            "expense_type": "Domestic",
            "description": "Travel expenses",
            "in_kind": False,
            "add_ten_percent": False,
            "indirect_rate_multiplier": "1.00",
            "amounts": [
                {
                    "year": 2025,
                    "amount": "1000.00",
                },
                {
                    "year": 2026,
                    "amount": "1500.00",
                },
            ],
        }

    def serializer(self, data=None):
        if data is None:
            data = self.valid_data()

        return NonStaffLineSerializer(
            data=data,
            context={"budget": self.budget},
        )

    def test_valid_data(self):
        serializer = self.serializer()

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(
            serializer.validated_data["category"],
            self.category,
        )
        self.assertEqual(
            serializer.validated_data["description"],
            "Travel expenses",
        )
        self.assertFalse(
            serializer.validated_data["in_kind"],
        )
        self.assertFalse(
            serializer.validated_data["add_ten_percent"],
        )
        self.assertEqual(
            serializer.validated_data["indirect_rate_multiplier"],
            Decimal("1.00"),
        )

    def test_cost_group_and_expense_type_are_replaced_by_category(self):
        serializer = self.serializer()

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertNotIn(
            "cost_group",
            serializer.validated_data,
        )
        self.assertNotIn(
            "expense_type",
            serializer.validated_data,
        )
        self.assertEqual(
            serializer.validated_data["category"],
            self.category,
        )

    def test_invalid_cost_group_or_expense_type(self):
        data = self.valid_data()
        data["cost_group"] = "Invalid"

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)
        self.assertEqual(
            str(serializer.errors["non_field_errors"][0]),
            "Invalid cost group or expense type.",
        )

    def test_optional_fields_can_be_omitted(self):
        data = {
            "cost_group": "Travel",
            "expense_type": "Domestic",
        }

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(
            serializer.validated_data["category"],
            self.category,
        )
        self.assertEqual(
            serializer.validated_data["in_kind"],
            False,
        )
        self.assertEqual(
            serializer.validated_data["add_ten_percent"],
            False,
        )

    def test_description_can_be_blank(self):
        data = self.valid_data()
        data["description"] = ""

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["description"],
            "",
        )

    def test_indirect_rate_multiplier_can_be_null(self):
        data = self.valid_data()
        data["indirect_rate_multiplier"] = None

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["indirect_rate_multiplier"],
        )

    def test_amounts_can_be_omitted(self):
        data = self.valid_data()
        del data["amounts"]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn(
            "amounts",
            serializer.validated_data,
        )

    def test_amount_year_must_be_within_project_period(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2024,
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", serializer.errors)
        self.assertEqual(
            str(serializer.errors["amounts"][0]),
            "Year must be between 2025 and 2027.",
        )

    def test_amount_year_can_be_start_year(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_amount_year_can_be_end_year(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2027,
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_duplicate_amount_year_is_rejected(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
                "amount": "1000.00",
            },
            {
                "year": 2025,
                "amount": "2000.00",
            },
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", serializer.errors)
        self.assertEqual(
            str(serializer.errors["amounts"][0]),
            "Each year can only have one amount.",
        )

    def test_amounts_for_multiple_years_are_valid(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
                "amount": "1000.00",
            },
            {
                "year": 2026,
                "amount": "2000.00",
            },
            {
                "year": 2027,
                "amount": "3000.00",
            },
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_year_amount_decimal_places(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
                "amount": "1000.123",
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", serializer.errors)

    def test_year_is_required(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", serializer.errors)

    def test_amount_is_required(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", serializer.errors)
