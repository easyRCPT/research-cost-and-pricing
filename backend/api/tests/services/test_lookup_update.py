from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    AuditLog,
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    SalaryRate,
)
from api.services.lookup_update import create, update
from api.tests.factories import make_department, make_faculty, make_user


class LookupUpdateTestMixin:
    @staticmethod
    def create_faculty(code: str = "SCI", name: str = "Science Faculty") -> Faculty:
        return make_faculty(code, name)

    @classmethod
    def create_department(
        cls,
        code: str = "SCI",
        name: str = "Science",
        school: str = "Science School",
        school_code: str = "SCI",
        faculty_code: str = "SCI",
    ) -> Department:
        return make_department(
            code,
            cls.create_faculty(code=faculty_code),
            name=name,
            school=school,
            school_code=school_code,
        )


class TestCreate(TestCase, LookupUpdateTestMixin):
    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_lookup_row(self, mock_invalidate_cache):
        # A department names its faculty by code; the row has to exist first.
        faculty = self.create_faculty()
        data = {
            "code": "SCI",
            "name": "Science",
            "school": "Science School",
            "school_code": "SCI",
            "faculty": faculty,
        }

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            create("departments", data)

        department = Department.objects.get(code="SCI")

        self.assertEqual(department.name, "Science")
        self.assertEqual(department.school, "Science School")
        self.assertEqual(department.school_code, "SCI")
        self.assertEqual(department.faculty.code, "SCI")
        self.assertEqual(department.faculty.name, "Science Faculty")

        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_validates_data_before_saving(self, mock_invalidate_cache):
        faculty = self.create_faculty()
        data = {
            "code": "SCI",
            "name": "",
            "school": "Science School",
            "school_code": "SCI",
            "faculty": faculty,
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
            create("invalid", {"code": "SCI"})
        self.assertEqual(Department.objects.count(), 0)

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_audit_log_when_lookup_row_created(
        self,
        mock_invalidate_cache,
    ):
        faculty = self.create_faculty()
        actor = make_user("admin@unimelb.edu.au", is_superuser=True)

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            create(
                "departments",
                {
                    "code": "SCI",
                    "name": "Science",
                    "school": "Science School",
                    "school_code": "SCI",
                    "faculty": faculty,
                },
                actor=actor,
            )

        audit = AuditLog.objects.get(
            action="admin.lookup.insert",
        )

        self.assertEqual(audit.actor_id, actor.id)
        self.assertEqual(audit.object_type, "departments")

        self.assertEqual(
            audit.detail["after"]["name"],
            "Science",
        )
        self.assertEqual(
            audit.detail["after"]["faculty"],
            "SCI",
        )
        self.assertIsNone(audit.detail["before"])

        mock_invalidate_cache.assert_called_once()

    def test_a_rate_table_is_refused(self):
        # Rates change only as a reviewed set (#138): a row at a time, a
        # costing submitted partway through a change was frozen onto half of it.
        rates = SalaryRate.objects.count()

        with self.assertRaisesRegex(ValidationError, "reviewed set"):
            create(
                "salary_rates",
                {
                    "payroll_type": "Fortnight",
                    "category": "Academic",
                    "classification": "Level A.1",
                    "rate": Decimal(100000),
                },
            )

        self.assertEqual(SalaryRate.objects.count(), rates)


class TestUpdate(TestCase, LookupUpdateTestMixin):
    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_updates_lookup_row(self, mock_invalidate_cache):
        department = self.create_department()

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            update(
                "departments",
                {"code": department.code},
                {"name": "Engineering"},
            )

        department.refresh_from_db()

        self.assertEqual(department.name, "Engineering")
        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_updates_faculty(self, mock_invalidate_cache):
        department = self.create_department(
            faculty_code="SCI",
        )
        engineering = self.create_faculty(
            code="ENG",
            name="Engineering Faculty",
        )

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            update(
                "departments",
                {"code": department.code},
                {"faculty_code": "ENG"},
            )

        department.refresh_from_db()

        self.assertEqual(department.faculty, engineering)
        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_when_faculty_does_not_exist(
        self,
        mock_invalidate_cache,
    ):
        department = self.create_department()

        with self.assertRaisesRegex(
            ValidationError,
            "Faculty with code UNKNOWN does not exist.",
        ):
            update(
                "departments",
                {"code": department.code},
                {"faculty_code": "UNKNOWN"},
            )

        department.refresh_from_db()

        self.assertEqual(department.faculty.code, "SCI")
        mock_invalidate_cache.assert_not_called()

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

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_raises_error_for_invalid_update_field(
        self,
        mock_invalidate_cache,
    ):
        self.create_department()

        with self.assertRaisesRegex(
            ValidationError,
            "Invalid fields: invalid_field",
        ):
            update(
                "departments",
                {"code": "SCI"},
                {"invalid_field": "value"},
            )

        department = Department.objects.get(code="SCI")

        self.assertEqual(department.name, "Science")
        mock_invalidate_cache.assert_not_called()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_audit_log_when_lookup_row_updated(
        self,
        mock_invalidate_cache,
    ):
        department = self.create_department()

        actor = make_user("admin@unimelb.edu.au", is_superuser=True)

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            update(
                "departments",
                {"code": department.code},
                {"name": "Engineering"},
                actor=actor,
            )

        audit = AuditLog.objects.get(
            action="admin.lookup.update",
        )

        self.assertEqual(audit.actor_id, actor.id)
        self.assertEqual(audit.object_type, "departments")

        self.assertEqual(
            audit.detail["before"]["name"],
            "Science",
        )
        self.assertEqual(
            audit.detail["after"]["name"],
            "Engineering",
        )

        self.assertEqual(
            audit.detail["lookup"]["code"],
            "SCI",
        )

        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_audit_log_uses_faculty_code_for_update(
        self,
        mock_invalidate_cache,
    ):
        department = self.create_department(
            faculty_code="SCI",
        )
        engineering = self.create_faculty(
            code="ENG",
            name="Engineering Faculty",
        )

        actor = make_user("admin@unimelb.edu.au", is_superuser=True)

        # The cache is cleared once the write commits.
        with self.captureOnCommitCallbacks(execute=True):
            update(
                "departments",
                {"code": department.code},
                {"faculty": engineering},
                actor=actor,
            )

        audit = AuditLog.objects.get(
            action="admin.lookup.update",
        )

        self.assertEqual(
            audit.detail["before"]["faculty"],
            "SCI",
        )
        self.assertEqual(
            audit.detail["after"]["faculty"],
            "ENG",
        )

        mock_invalidate_cache.assert_called_once()

    def test_a_rate_table_is_refused(self):
        constant = CalculationConstant.objects.create(
            version=LookupConfiguration.objects.get().current_version,
            name="default_margin",
            value=Decimal("0.300000"),
        )

        with self.assertRaisesRegex(ValidationError, "reviewed set"):
            update(
                "calculation_constants",
                {"name": "default_margin"},
                {"value": Decimal("0.25")},
            )

        constant.refresh_from_db()
        self.assertEqual(constant.value, Decimal("0.300000"))


class TestClassificationValidation(TestCase):
    @patch("api.services.classification.validate")
    def test_salary_rate_classification_is_validated(
        self,
        mock_validate,
    ):
        lookup_update._validate_classification(
            SalaryRate,
            {"classification": "A.2"},
        )

        mock_validate.assert_called_once_with(
            lookup_update.current_version_id(),
            "A.2",
        )

    @patch("api.services.classification.validate")
    def test_salary_rate_without_classification_is_not_validated(
        self,
        mock_validate,
    ):
        lookup_update._validate_classification(
            SalaryRate,
            {},
        )

        mock_validate.assert_not_called()

    @patch("api.services.classification.validate")
    def test_other_lookup_models_are_not_validated(
        self,
        mock_validate,
    ):
        lookup_update._validate_classification(
            CalculationConstant,
            {"classification": "A.2"},
        )

        mock_validate.assert_not_called()
