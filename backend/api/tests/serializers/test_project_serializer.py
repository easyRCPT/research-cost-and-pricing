from decimal import Decimal

from django.test import TestCase

from api.models import Budget, Department, Faculty
from api.serializers.project_serializer import (
    ProjectCreateSerializer,
    ProjectRowSerializer,
)

from .serializer_utils import get_data, get_errors, get_validated_data


class ProjectCreateSerializerTestCase(TestCase):
    def setUp(self):
        self.department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=Faculty.objects.get_or_create(
                code="SCI", defaults={"name": "Science Faculty"}
            )[0],
        )

    def valid_data(self, **overrides) -> dict:
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

    def test_valid_data(self):
        serializer = ProjectCreateSerializer(data=self.valid_data())

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(validated_data["title"], "Test Project")
        self.assertEqual(validated_data["department"], self.department)

    def test_optional_fields_default_to_blank(self):
        serializer = ProjectCreateSerializer(data=self.valid_data())

        self.assertTrue(serializer.is_valid(), get_errors(serializer))

        validated_data = get_validated_data(serializer)

        self.assertEqual(validated_data["chief_investigator"], "")
        self.assertEqual(validated_data["scheme"], "")

    def test_unknown_department(self):
        serializer = ProjectCreateSerializer(
            data=self.valid_data(department="NOPE"),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("department", get_errors(serializer))

    def test_month_outside_the_year(self):
        serializer = ProjectCreateSerializer(data=self.valid_data(start_month=13))

        self.assertFalse(serializer.is_valid())
        self.assertIn("start_month", get_errors(serializer))

    def test_ending_before_it_starts(self):
        serializer = ProjectCreateSerializer(
            data=self.valid_data(end_year=2025, end_month=12),
        )

        self.assertFalse(serializer.is_valid())

    def test_ending_in_an_earlier_month_of_the_starting_year(self):
        serializer = ProjectCreateSerializer(
            data=self.valid_data(start_month=6, end_year=2026, end_month=3),
        )

        self.assertFalse(serializer.is_valid())

    def test_a_project_lasting_one_month(self):
        serializer = ProjectCreateSerializer(
            data=self.valid_data(start_month=6, end_year=2026, end_month=6),
        )

        self.assertTrue(serializer.is_valid(), get_errors(serializer))


class ProjectRowSerializerTestCase(TestCase):
    def row(self, **overrides) -> dict:
        return {
            "id": 1,
            "reference": "RCP-2026-0001",
            "title": "Test Project",
            "chief_investigator": "",
            "funder": "Test Funder",
            "department": "Science",
            "faculty": "Science Faculty",
            "start_year": 2026,
            "end_year": 2028,
            "budget_id": 4,
            "status": Budget.Status.DRAFT,
            "budget_count": 1,
            "total_price_exc_gst": Decimal("1234.5678"),
            "updated_at": "2026-09-17T00:00:00Z",
            **overrides,
        }

    def test_rounds_the_price_to_cents(self):
        data = get_data(ProjectRowSerializer(self.row()))

        self.assertEqual(data["total_price_exc_gst"], Decimal("1234.57"))

    def test_a_project_with_no_budget(self):
        data = get_data(
            ProjectRowSerializer(
                self.row(budget_id=None, status=None, budget_count=0),
            )
        )

        self.assertIsNone(data["budget_id"])
        self.assertIsNone(data["status"])
