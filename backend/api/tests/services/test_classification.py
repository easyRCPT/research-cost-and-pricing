from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase, TestCase

from api.models import Budget, IncrementCap, LookupVersion
from api.services.classification import validate, validate_with_budget


class TestValidate(TestCase):
    def setUp(self):
        self.version = LookupVersion.objects.create()
        self.other_version = LookupVersion.objects.create()

    def test_accepts_valid_stepped_classification(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version_id=self.version.id,
        )

        validate(self.version.id, "Level A.3")

    def test_accepts_valid_stepless_classification(self):
        IncrementCap.objects.create(
            level="UOM 10",
            max_steps=0,
            version_id=self.version.id,
        )

        validate(self.version.id, "UOM 10")

    def test_rejects_unknown_level(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Unknown level: 'Level A'.",
        ):
            validate(self.version.id, "Level A.1")

    def test_rejects_step_for_stepless_level(self):
        IncrementCap.objects.create(
            level="UOM 10",
            max_steps=0,
            version_id=self.version.id,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "'UOM 10' is stepless and takes no step.",
        ):
            validate(self.version.id, "UOM 10.1")

    def test_rejects_stepped_classification_without_step(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version_id=self.version.id,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid classification 'Level A': expected '<level>.<step>'.",
        ):
            validate(self.version.id, "Level A")

    def test_rejects_non_numeric_step(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version_id=self.version.id,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid classification 'Level A.x': expected '<level>.<step>'.",
        ):
            validate(self.version.id, "Level A.x")

    def test_rejects_step_above_maximum(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version_id=self.version.id,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Step 6 out of range for 'Level A' (max 5).",
        ):
            validate(self.version.id, "Level A.6")

    def test_rejects_zero_step(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version_id=self.version.id,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Step 0 out of range for 'Level A' (max 5).",
        ):
            validate(self.version.id, "Level A.0")

    def test_rejects_increment_cap_from_different_version(self):
        IncrementCap.objects.create(
            level="Level A",
            max_steps=5,
            version=self.other_version,
        )

        with self.assertRaisesMessage(
            ValidationError,
            "Unknown level: 'Level A'.",
        ):
            validate(self.version.id, "Level A.1")


class TestValidateWithBudget(SimpleTestCase):
    def test_validates_using_budget_lookup_version(self):
        budget = Mock(spec=Budget)

        with (
            patch(
                "api.services.classification.get_lookup_version_id_for_budget",
                return_value=1,
            ) as mock_get_version,
            patch(
                "api.services.classification.validate",
            ) as mock_validate,
        ):
            validate_with_budget(budget, "Level A.2")

        mock_get_version.assert_called_once_with(budget)
        mock_validate.assert_called_once_with(1, "Level A.2")
