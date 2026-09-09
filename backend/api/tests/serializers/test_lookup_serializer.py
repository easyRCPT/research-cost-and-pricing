from django.test import SimpleTestCase

from api.serializers.lookup_serializer import (
    LOOKUP_SERIALIZERS,
    LookupCreateSerializer,
    LookupTablesSerializer,
    LookupUpdateSerializer,
)


class LookupSerializersTestCase(SimpleTestCase):
    def test_all_lookup_serializers_are_registered(self):
        expected = {
            "departments",
            "salary_rates",
            "salary_rate_multipliers",
            "increment_caps",
            "eba_increases",
            "on_cost_rates",
            "non_staff_cost_categories",
            "minimum_cost_recovery_multipliers",
            "calculation_constants",
            "activities",
            "regions",
            "deliverable_types",
            "revenue_categories",
        }

        self.assertEqual(set(LOOKUP_SERIALIZERS), expected)

    def test_lookup_tables_serializer_contains_all_tables(self):
        serializer = LookupTablesSerializer()

        self.assertEqual(
            set(serializer.fields),
            set(LOOKUP_SERIALIZERS),
        )

        for name, field in serializer.fields.items():
            self.assertTrue(field.many)
            self.assertIs(
                field.child.__class__,
                LOOKUP_SERIALIZERS[name],
            )

    def test_lookup_tables_serializer_serializes_empty_tables(self):
        data = {
            name: []
            for name in LOOKUP_SERIALIZERS
        }

        serializer = LookupTablesSerializer(data=data)

        self.assertTrue(serializer.is_valid(), serializer.errors)


class LookupCreateSerializerTestCase(SimpleTestCase):
    def test_valid_values(self):
        serializer = LookupCreateSerializer(
            data={
                "values": {
                    "code": "SCI",
                    "name": "Science",
                    "active": True,
                    "rate": 1.25,
                }
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_values_is_required(self):
        serializer = LookupCreateSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn("values", serializer.errors)

    def test_values_must_be_a_dict(self):
        serializer = LookupCreateSerializer(
            data={
                "values": ["SCI", "Science"],
            }
        )

        self.assertFalse(serializer.is_valid())


class LookupUpdateSerializerTestCase(SimpleTestCase):
    def test_valid_lookup_and_values(self):
        serializer = LookupUpdateSerializer(
            data={
                "lookup": {"code": "SCI"},
                "values": {"name": "Updated Science"},
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_values_is_optional(self):
        serializer = LookupUpdateSerializer(
            data={
                "lookup": {"code": "SCI"},
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(
            serializer.validated_data["values"],
            {},
        )

    def test_lookup_is_required(self):
        serializer = LookupUpdateSerializer(
            data={
                "values": {"name": "Updated Science"},
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("lookup", serializer.errors)

    def test_lookup_must_be_a_dict(self):
        serializer = LookupUpdateSerializer(
            data={
                "lookup": "SCI",
            }
        )

        self.assertFalse(serializer.is_valid())

    def test_values_must_be_a_dict(self):
        serializer = LookupUpdateSerializer(
            data={
                "lookup": {"code": "SCI"},
                "values": "Updated Science",
            }
        )

        self.assertFalse(serializer.is_valid())
