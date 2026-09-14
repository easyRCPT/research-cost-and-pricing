from unittest.mock import patch

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import Department
from api.services.lookup_update import create, update


class LookupUpdateTestMixin:
    @staticmethod
    def create_department(
        code: str = "SCI",
        name: str = "Science",
        school: str = "Science School",
        school_code: str = "SCI",
        faculty: str = "Science Faculty",
        faculty_code: str = "SCI",
    ) -> Department:
        return Department.objects.create(
            code=code,
            name=name,
            school=school,
            school_code=school_code,
            faculty=faculty,
            faculty_code=faculty_code,
        )


class TestCreate(TestCase, LookupUpdateTestMixin):
    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_lookup_row(self, mock_invalidate_cache):
        data = {
            "code": "SCI",
            "name": "Science",
            "school": "Science School",
            "school_code": "SCI",
            "faculty": "Science Faculty",
            "faculty_code": "SCI",
        }

        create("departments", data)

        department = Department.objects.get(code="SCI")

        self.assertEqual(department.name, "Science")
        self.assertEqual(department.school, "Science School")
        self.assertEqual(department.school_code, "SCI")
        self.assertEqual(department.faculty, "Science Faculty")
        self.assertEqual(department.faculty_code, "SCI")

        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_validates_data_before_saving(self, mock_invalidate_cache):
        data = {
            "code": "SCI",
            "name": "",
            "school": "Science School",
            "school_code": "SCI",
            "faculty": "Science Faculty",
            "faculty_code": "SCI",
        }

        with self.assertRaises(DjangoValidationError):
            create("departments", data)

        self.assertFalse(Department.objects.filter(code="SCI").exists())
        mock_invalidate_cache.assert_not_called()

    def test_raises_error_for_invalid_lookup_table(self):
        with self.assertRaisesRegex(
            ValidationError,
            "Invalid lookup table: invalid",
        ):
            create(
                "invalid",
                {
                    "code": "SCI",
                },
            )

        self.assertEqual(Department.objects.count(), 0)


class TestUpdate(TestCase, LookupUpdateTestMixin):
    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_updates_lookup_row(self, mock_invalidate_cache):
        department = self.create_department()

        update(
            "departments",
            {"code": department.code},
            {"name": "Engineering"},
        )

        department.refresh_from_db()

        self.assertEqual(department.name, "Engineering")
        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_deletes_lookup_row_when_data_is_empty(
        self,
        mock_invalidate_cache,
    ):
        department = self.create_department()

        update(
            "departments",
            {"code": department.code},
            {},
        )

        self.assertFalse(Department.objects.filter(code=department.code).exists())
        mock_invalidate_cache.assert_called_once()

    def test_raises_error_for_invalid_lookup_table(self):
        with self.assertRaisesRegex(
            ValidationError,
            "Invalid lookup table: invalid",
        ):
            update(
                "invalid",
                {"code": "SCI"},
                {"name": "Engineering"},
            )

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_when_row_does_not_exist(
        self,
        mock_invalidate_cache,
    ):
        with self.assertRaisesRegex(
            ValidationError,
            "No matching row found in lookup table 'departments'.",
        ):
            update(
                "departments",
                {"code": "UNKNOWN"},
                {"name": "Engineering"},
            )

        mock_invalidate_cache.assert_not_called()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_when_multiple_rows_are_found(
        self,
        mock_invalidate_cache,
    ):
        self.create_department(
            code="SCI",
            name="Science",
            school="University School",
            school_code="UNI",
        )
        self.create_department(
            code="ENG",
            name="Engineering",
            school="University School",
            school_code="UNI",
        )

        with self.assertRaisesRegex(
            ValidationError,
            "Multiple matching rows found in lookup table 'departments'.",
        ):
            update(
                "departments",
                {"school": "University School"},
                {"name": "Updated"},
            )

        self.assertEqual(
            Department.objects.get(code="SCI").name,
            "Science",
        )
        self.assertEqual(
            Department.objects.get(code="ENG").name,
            "Engineering",
        )
        mock_invalidate_cache.assert_not_called()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_when_lookup_field_is_updated(
        self,
        mock_invalidate_cache,
    ):
        self.create_department()

        with self.assertRaisesRegex(
            ValidationError,
            "Lookup fields cannot be updated: code",
        ):
            update(
                "departments",
                {"code": "SCI"},
                {"code": "ENG"},
            )

        department = Department.objects.get(code="SCI")

        self.assertEqual(department.code, "SCI")
        mock_invalidate_cache.assert_not_called()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_when_updated_data_is_invalid(
        self,
        mock_invalidate_cache,
    ):
        self.create_department()

        with self.assertRaises(DjangoValidationError):
            update(
                "departments",
                {"code": "SCI"},
                {"name": ""},
            )

        department = Department.objects.get(code="SCI")

        self.assertEqual(department.name, "Science")
        mock_invalidate_cache.assert_not_called()
