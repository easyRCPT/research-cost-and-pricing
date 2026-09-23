from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
    SalaryRateMultiplier,
)
from api.services.lookup_update import create, update


class LookupUpdateTestMixin:
    @staticmethod
    def create_faculty(code: str = "SCI", name: str = "Science Faculty") -> Faculty:
        faculty, _ = Faculty.objects.get_or_create(code=code, defaults={"name": name})
        return faculty

    @classmethod
    def create_department(
        cls,
        code: str = "SCI",
        name: str = "Science",
        school: str = "Science School",
        school_code: str = "SCI",
        faculty_code: str = "SCI",
    ) -> Department:
        return Department.objects.create(
            code=code,
            name=name,
            school=school,
            school_code=school_code,
            faculty=cls.create_faculty(code=faculty_code),
        )


class TestCreate(TestCase, LookupUpdateTestMixin):
    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_lookup_row(self, mock_invalidate_cache):
        # A department names its faculty by code; the row has to exist first.
        self.create_faculty()
        data = {
            "code": "SCI",
            "name": "Science",
            "school": "Science School",
            "school_code": "SCI",
            "faculty_id": "SCI",
        }

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
        self.create_faculty()
        data = {
            "code": "SCI",
            "name": "",
            "school": "Science School",
            "school_code": "SCI",
            "faculty_id": "SCI",
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


class TestVersionedCreate(TestCase):
    def setUp(self):
        # The singleton already exists: the lookup versioning migration
        # creates it, so the app can assume there is always a current version.
        self.config = LookupConfiguration.objects.get()
        self.version = self.config.current_version
        self.config.referenced = False
        self.config.save(update_fields=["referenced"])

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_new_version_when_referenced(
        self,
        mock_invalidate_cache,
    ):
        self.config.referenced = True
        self.config.save(update_fields=["referenced"])

        create(
            "salary_rates",
            {
                "payroll_type": "Fortnight",
                "category": "Academic",
                "classification": "A",
                "rate": Decimal(100000),
            },
        )

        self.config.refresh_from_db()

        self.assertNotEqual(
            self.config.current_version_id,
            self.version.id,
        )
        self.assertFalse(self.config.referenced)
        self.assertEqual(LookupVersion.objects.count(), 2)

        salary_rate = SalaryRate.objects.get(
            version_id=self.config.current_version_id,
            classification="A",
        )

        self.assertEqual(salary_rate.rate, Decimal(100000))
        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_rolls_back_new_version_when_create_fails(
        self,
        mock_invalidate_cache,
    ):
        self.config.referenced = True
        self.config.save(update_fields=["referenced"])

        with self.assertRaises(DjangoValidationError):
            create(
                "salary_rates",
                {
                    "payroll_type": "Fortnight",
                    "category": "Academic",
                    "classification": "A",
                    "rate": Decimal(-1),
                },
            )

        self.config.refresh_from_db()

        self.assertEqual(
            self.config.current_version_id,
            self.version.id,
        )
        self.assertTrue(self.config.referenced)
        self.assertEqual(LookupVersion.objects.count(), 1)
        self.assertEqual(SalaryRate.objects.count(), 0)
        mock_invalidate_cache.assert_not_called()


class TestVersionedUpdate(TestCase):
    def setUp(self):
        # The singleton already exists: the lookup versioning migration
        # creates it, so the app can assume there is always a current version.
        self.config = LookupConfiguration.objects.get()
        self.version = self.config.current_version
        self.config.referenced = False
        self.config.save(update_fields=["referenced"])

    def create_salary_rate(
        self,
        *,
        rate: Decimal = Decimal(100000),
    ) -> SalaryRate:
        return SalaryRate.objects.create(
            version=self.version,
            payroll_type="Fortnight",
            category="Academic",
            classification="A",
            rate=rate,
        )

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_creates_new_version_when_referenced(
        self,
        mock_invalidate_cache,
    ):
        self.create_salary_rate()

        self.config.referenced = True
        self.config.save(update_fields=["referenced"])

        update(
            "salary_rates",
            {
                "payroll_type": "Fortnight",
                "category": "Academic",
                "classification": "A",
            },
            {"rate": Decimal(120000)},
        )

        self.config.refresh_from_db()

        self.assertNotEqual(
            self.config.current_version_id,
            self.version.id,
        )
        self.assertFalse(self.config.referenced)

        old_salary_rate = SalaryRate.objects.get(
            version=self.version,
            classification="A",
        )
        new_salary_rate = SalaryRate.objects.get(
            version_id=self.config.current_version_id,
            classification="A",
        )

        self.assertEqual(old_salary_rate.rate, Decimal(100000))
        self.assertEqual(new_salary_rate.rate, Decimal(120000))
        self.assertNotEqual(
            old_salary_rate.id,
            new_salary_rate.id,
        )

        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_new_version_copies_all_versioned_lookup_rows(
        self,
        mock_invalidate_cache,
    ):
        self.create_salary_rate()

        SalaryRateMultiplier.objects.create(
            version=self.version,
            time_basis="FTE",
            multiplier=Decimal(1),
        )

        self.config.referenced = True
        self.config.save(update_fields=["referenced"])

        update(
            "salary_rates",
            {
                "payroll_type": "Fortnight",
                "category": "Academic",
                "classification": "A",
            },
            {"rate": Decimal(120000)},
        )

        self.config.refresh_from_db()
        new_version_id = self.config.current_version_id

        new_salary_rate = SalaryRate.objects.get(
            version_id=new_version_id,
            classification="A",
        )
        new_multiplier = SalaryRateMultiplier.objects.get(
            version_id=new_version_id,
            time_basis="FTE",
        )

        self.assertEqual(new_salary_rate.rate, Decimal(120000))
        self.assertEqual(new_multiplier.multiplier, Decimal(1))

        self.assertNotEqual(
            new_salary_rate.id,
            SalaryRate.objects.get(
                version=self.version,
                classification="A",
            ).id,
        )
        self.assertNotEqual(
            new_multiplier.id,
            SalaryRateMultiplier.objects.get(
                version=self.version,
                time_basis="FTE",
            ).id,
        )

        mock_invalidate_cache.assert_called_once()

    @patch("api.services.lookup_update.invalidate_lookup_cache")
    def test_does_not_create_new_version_when_row_does_not_exist(
        self,
        mock_invalidate_cache,
    ):
        self.config.referenced = True
        self.config.save(update_fields=["referenced"])

        with self.assertRaisesRegex(
            ValidationError,
            "No matching row found in lookup table 'salary_rates'.",
        ):
            update(
                "salary_rates",
                {
                    "payroll_type": "Fortnight",
                    "category": "Academic",
                    "classification": "UNKNOWN",
                },
                {"rate": Decimal(120000)},
            )

        self.config.refresh_from_db()

        self.assertEqual(
            self.config.current_version_id,
            self.version.id,
        )
        self.assertTrue(self.config.referenced)
        self.assertEqual(LookupVersion.objects.count(), 1)
        mock_invalidate_cache.assert_not_called()


class TestFixedConstants(TestCase):
    """
    1.70 is not a rate that gets corrected (#60).

    It decides whether a budget needs a Dean, so an edit changes who has to
    approve every budget in the system. The API refuses it however the write is
    dressed up: as a change, as a new row, or as a delete.
    """

    TABLE = "calculation_constants"
    FIXED = "full_cost_recovery_multiplier"

    def setUp(self):
        self.config = LookupConfiguration.objects.get()
        self.version = self.config.current_version
        self.constant = CalculationConstant.objects.create(
            version=self.version,
            name=self.FIXED,
            description="Default cost recovery multiplier",
            value=Decimal("1.700000"),
        )

    def test_it_cannot_be_changed(self):
        with self.assertRaises(ValidationError) as refused:
            update(self.TABLE, {"name": self.FIXED}, {"value": Decimal("1.000000")})

        self.assertIn(self.FIXED, str(refused.exception))
        self.constant.refresh_from_db()
        self.assertEqual(self.constant.value, Decimal("1.700000"))

    def test_it_cannot_be_deleted(self):
        # Empty data is how this service spells a delete.
        with self.assertRaises(ValidationError):
            update(self.TABLE, {"name": self.FIXED}, {})

        self.assertTrue(
            CalculationConstant.objects.filter(
                name=self.FIXED, version=self.version
            ).exists()
        )

    def test_it_cannot_be_put_back_at_another_value(self):
        # Removed behind the service's back, so what is under test is the guard
        # and not the unique constraint a duplicate would have hit anyway.
        CalculationConstant.objects.filter(name=self.FIXED).delete()

        with self.assertRaises(ValidationError) as refused:
            create(
                self.TABLE,
                {
                    "name": self.FIXED,
                    "description": "Sneaking one in",
                    "value": Decimal("2.000000"),
                },
            )

        self.assertIn(self.FIXED, str(refused.exception))
        self.assertFalse(CalculationConstant.objects.filter(name=self.FIXED).exists())

    def test_a_refused_edit_mints_no_version(self):
        # The refusal comes before the copy-on-write check, so a rejected write
        # leaves no new version lying around.
        self.config.referenced = True
        self.config.save(update_fields=["referenced"])
        before = LookupVersion.objects.count()

        with self.assertRaises(ValidationError):
            update(self.TABLE, {"name": self.FIXED}, {"value": Decimal("1.5")})

        self.assertEqual(LookupVersion.objects.count(), before)

    def test_every_other_constant_is_still_editable(self):
        other = CalculationConstant.objects.create(
            version=self.version,
            name="default_margin",
            description="Default margin",
            value=Decimal("0.300000"),
        )

        update(self.TABLE, {"name": "default_margin"}, {"value": Decimal("0.250000")})

        other.refresh_from_db()
        self.assertEqual(other.value, Decimal("0.250000"))
