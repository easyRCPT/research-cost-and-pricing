from typing import cast

from django.test import SimpleTestCase, TestCase

from api.models import Department, Faculty
from api.serializers.lookup_serializer import (
    LOOKUP_SERIALIZERS,
    DepartmentSerializer,
    LookupCreateSerializer,
    LookupTablesSerializer,
    LookupUpdateSerializer,
)

from .serializer_utils import get_data, get_errors, get_validated_data


class LookupSerializersTestCase(SimpleTestCase):
    def test_all_lookup_serializers_are_registered(self):
        expected = {
            "faculties",
            "departments",
            "salary_rates",
            "salary_rate_multipliers",
            "increment_caps",
            "eba_increases",
            "on_cost_rates",
            "non_staff_cost_categories",
            "calculation_constants",
            "activities",
            "regions",
            "deliverable_types",
            "revenue_categories",
        }

        self.assertEqual(set(LOOKUP_SERIALIZERS), expected)

    def test_lookup_tables_serializer_contains_all_tables(self):
        serializer = cast(LookupTablesSerializer, LookupTablesSerializer())

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
        data = {name: [] for name in LOOKUP_SERIALIZERS}

        serializer = LookupTablesSerializer(data=data)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))


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

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_values_is_required(self):
        serializer = LookupCreateSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertIn("values", get_errors(serializer))

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

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

    def test_values_is_required(self):
        serializer = LookupUpdateSerializer(data={"lookup": {"code": "SCI"}})

        self.assertFalse(serializer.is_valid())
        self.assertIn("values", get_errors(serializer))

    def test_values_cannot_be_empty(self):
        serializer = LookupUpdateSerializer(
            data={"lookup": {"code": "SCI"}, "values": {}}
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("values", get_errors(serializer))

    def test_lookup_is_required(self):
        serializer = LookupUpdateSerializer(
            data={
                "values": {"name": "Updated Science"},
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("lookup", get_errors(serializer))

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


class DepartmentSerializerTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.faculty = Faculty.objects.create(
            code="SCI",
            name="Science",
        )

        cls.department = Department.objects.create(
            code="D001",
            name="Computer Science",
            school="School of Computing",
            school_code="COMP",
            faculty=cls.faculty,
            budget_unit="BU001",
        )

    def test_serializes_faculty_name_and_code(self):
        serializer = DepartmentSerializer(self.department)
        data = get_data(serializer)

        self.assertEqual(data["faculty"], "Science")
        self.assertEqual(data["faculty_code"], "SCI")

    def test_faculty_code_sets_faculty(self):
        serializer = DepartmentSerializer(
            data={
                "code": "D002",
                "name": "Physics",
                "school": "School of Physics",
                "school_code": "PHYS",
                "faculty_code": "SCI",
                "budget_unit": "BU002",
            }
        )
        validated_data = get_validated_data(serializer)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        self.assertEqual(
            validated_data["faculty"].pk,
            self.faculty.pk,
        )

    def test_faculty_is_read_only(self):
        serializer = DepartmentSerializer(
            data={
                "code": "D002",
                "name": "Physics",
                "school": "School of Physics",
                "school_code": "PHYS",
                "faculty": "Other Faculty",
                "faculty_code": "SCI",
                "budget_unit": "BU002",
            }
        )
        validated_data = get_validated_data(serializer)

        self.assertTrue(serializer.is_valid(), get_errors(serializer))
        self.assertEqual(
            validated_data["faculty"].pk,
            self.faculty.pk,
        )

    def test_invalid_faculty_code(self):
        serializer = DepartmentSerializer(
            data={
                "code": "D002",
                "name": "Physics",
                "school": "School of Physics",
                "school_code": "PHYS",
                "faculty_code": "UNKNOWN",
                "budget_unit": "BU002",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("faculty_code", get_errors(serializer))
