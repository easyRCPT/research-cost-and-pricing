from decimal import Decimal

from django.test import TestCase

from api.models import DeliverableType
from api.serializers.deliverable_serializer import DeliverableSerializer


class DeliverableSerializerTestCase(TestCase):
    def setUp(self):
        self.deliverable_type = DeliverableType.objects.create(
            code="TEST",
            name="Test Type",
        )

    def valid_data(self) -> dict:
        return {
            "number": 1,
            "description": "Test deliverable",
            "deliverable_type": self.deliverable_type.code,
            "invoice_amount": "1000.00",
            "due_date": "2026-12-31",
            "dependency": 1,
            "sponsor": "Test Sponsor",
        }

    def test_valid_data(self):
        serializer = DeliverableSerializer(data=self.valid_data())

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertEqual(
            serializer.validated_data["number"],
            1,
        )
        self.assertEqual(
            serializer.validated_data["description"],
            "Test deliverable",
        )
        self.assertEqual(
            serializer.validated_data["deliverable_type"],
            self.deliverable_type,
        )
        self.assertEqual(
            serializer.validated_data["invoice_amount"],
            Decimal("1000.00"),
        )
        self.assertEqual(
            serializer.validated_data["due_date"],
            "2026-12-31",
        )
        self.assertEqual(
            serializer.validated_data["dependency"],
            1,
        )
        self.assertEqual(
            serializer.validated_data["sponsor"],
            "Test Sponsor",
        )

    def test_optional_fields_can_be_omitted(self):
        serializer = DeliverableSerializer(
            data={
                "number": 1,
                "description": "Test deliverable",
                "deliverable_type": self.deliverable_type.code,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

        self.assertNotIn(
            "invoice_amount",
            serializer.validated_data,
        )
        self.assertNotIn(
            "due_date",
            serializer.validated_data,
        )
        self.assertNotIn(
            "dependency",
            serializer.validated_data,
        )
        self.assertNotIn(
            "sponsor",
            serializer.validated_data,
        )

    def test_invoice_amount_can_be_null(self):
        data = self.valid_data()
        data["invoice_amount"] = None

        serializer = DeliverableSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["invoice_amount"],
        )

    def test_dependency_can_be_null(self):
        data = self.valid_data()
        data["dependency"] = None

        serializer = DeliverableSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(
            serializer.validated_data["dependency"],
        )

    def test_due_date_can_be_blank(self):
        data = self.valid_data()
        data["due_date"] = ""

        serializer = DeliverableSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["due_date"],
            "",
        )

    def test_sponsor_can_be_blank(self):
        data = self.valid_data()
        data["sponsor"] = ""

        serializer = DeliverableSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["sponsor"],
            "",
        )

    def test_number_must_be_at_least_one(self):
        data = self.valid_data()
        data["number"] = 0

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("number", serializer.errors)

    def test_description_is_required(self):
        data = self.valid_data()
        del data["description"]

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("description", serializer.errors)

    def test_deliverable_type_is_required(self):
        data = self.valid_data()
        del data["deliverable_type"]

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("deliverable_type", serializer.errors)

    def test_invalid_deliverable_type(self):
        data = self.valid_data()
        data["deliverable_type"] = "INVALID"

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("deliverable_type", serializer.errors)

    def test_dependency_must_be_at_least_one(self):
        data = self.valid_data()
        data["dependency"] = 0

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("dependency", serializer.errors)

    def test_invoice_amount_must_have_at_most_two_decimal_places(self):
        data = self.valid_data()
        data["invoice_amount"] = "100.123"

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("invoice_amount", serializer.errors)

    def test_invoice_amount_cannot_exceed_max_digits(self):
        data = self.valid_data()
        data["invoice_amount"] = "12345678901.00"

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("invoice_amount", serializer.errors)

    def test_description_cannot_exceed_max_length(self):
        data = self.valid_data()
        data["description"] = "x" * 201

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("description", serializer.errors)

    def test_due_date_cannot_exceed_max_length(self):
        data = self.valid_data()
        data["due_date"] = "x" * 101

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("due_date", serializer.errors)

    def test_sponsor_cannot_exceed_max_length(self):
        data = self.valid_data()
        data["sponsor"] = "x" * 101

        serializer = DeliverableSerializer(data=data)

        self.assertFalse(serializer.is_valid())
        self.assertIn("sponsor", serializer.errors)
