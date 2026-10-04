from django.test import TestCase

from api.models import (
    LookupConfiguration,
    NonStaffCostCategory,
)
from api.serializers.non_staff_line_serializer import NonStaffLineSerializer
from api.tests.factories import make_budget, make_project

from .serializer_utils import get_errors, get_validated_data


class NonStaffLineSerializerTestCase(TestCase):
    def setUp(self):
        self.lookup_version = LookupConfiguration.objects.get().current_version

        self.budget = make_budget(
            make_project(funder="Test Funder", start_year=2025, end_year=2027)
        )

        self.category = NonStaffCostCategory.objects.create(
            ledger_id=1001,
            cost_category="Travel",
            cost_subcategory="Domestic",
            version=self.lookup_version,
        )

    @staticmethod
    def valid_data() -> dict:
        return {
            "cost_group": "Travel",
            "expense_type": "Domestic",
            "description": "Travel expenses",
            "in_kind": False,
            "add_ten_percent": False,
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

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(
            validated_data["category"],
            self.category,
        )
        self.assertEqual(
            validated_data["description"],
            "Travel expenses",
        )
        self.assertFalse(
            validated_data["in_kind"],
        )
        self.assertFalse(
            validated_data["add_ten_percent"],
        )

    def test_cost_group_and_expense_type_are_replaced_by_category(self):
        serializer = self.serializer()

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertNotIn(
            "cost_group",
            validated_data,
        )
        self.assertNotIn(
            "expense_type",
            validated_data,
        )
        self.assertEqual(
            validated_data["category"],
            self.category,
        )

    def test_invalid_cost_group_or_expense_type(self):
        data = self.valid_data()
        data["cost_group"] = "Invalid"

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", get_errors(serializer))
        self.assertEqual(
            str(get_errors(serializer)["non_field_errors"][0]),
            "Invalid cost group or expense type.",
        )

    def test_optional_fields_can_be_omitted(self):
        data = {
            "cost_group": "Travel",
            "expense_type": "Domestic",
        }

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(
            validated_data["category"],
            self.category,
        )
        self.assertEqual(
            validated_data["in_kind"],
            False,
        )
        self.assertEqual(
            validated_data["add_ten_percent"],
            False,
        )

    def test_description_can_be_blank(self):
        data = self.valid_data()
        data["description"] = ""

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        validated_data = get_validated_data(serializer)
        self.assertEqual(
            validated_data["description"],
            "",
        )

    def test_amounts_can_be_omitted(self):
        data = self.valid_data()
        del data["amounts"]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        validated_data = get_validated_data(serializer)
        self.assertNotIn(
            "amounts",
            validated_data,
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
        self.assertIn("amounts", get_errors(serializer))
        self.assertEqual(
            str(get_errors(serializer)["amounts"][0]),
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

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_amount_year_can_be_end_year(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2027,
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

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
        self.assertIn("amounts", get_errors(serializer))
        self.assertEqual(
            str(get_errors(serializer)["amounts"][0]),
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

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

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
        self.assertIn("amounts", get_errors(serializer))

    def test_year_is_required(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "amount": "1000.00",
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", get_errors(serializer))

    def test_amount_is_required(self):
        data = self.valid_data()
        data["amounts"] = [
            {
                "year": 2025,
            }
        ]

        serializer = self.serializer(data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("amounts", get_errors(serializer))
