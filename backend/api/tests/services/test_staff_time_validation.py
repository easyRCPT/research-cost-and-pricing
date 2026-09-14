from decimal import Decimal

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from api.services.staff_time_validation import (
    TIME_LIMITS,
    check_time,
    check_time_against_basis,
)


class TestCheckTime(SimpleTestCase):
    def test_time_within_limit(self):
        for time_basis, limit in TIME_LIMITS.items():
            check_time(time_basis, limit)

    def test_time_at_limit_is_valid(self):
        check_time("FTE", Decimal(1))
        check_time("Daily", Decimal(220))
        check_time("Hourly", Decimal(8784))

    def test_time_above_fte_limit(self):
        with self.assertRaises(ValidationError) as context:
            check_time("FTE", Decimal("1.0001"))

        self.assertEqual(
            str(context.exception.detail[0]),
            "Time cannot exceed 1 for time basis 'FTE'.",
        )

    def test_time_above_daily_limit(self):
        with self.assertRaises(ValidationError) as context:
            check_time("Daily", Decimal("220.0001"))

        self.assertEqual(
            str(context.exception.detail[0]),
            "Time cannot exceed 220 for time basis 'Daily'.",
        )

    def test_time_above_hourly_limit(self):
        with self.assertRaises(ValidationError) as context:
            check_time("Hourly", Decimal("8784.0001"))

        self.assertEqual(
            str(context.exception.detail[0]),
            "Time cannot exceed 8784 for time basis 'Hourly'.",
        )

    def test_error_includes_year(self):
        with self.assertRaises(ValidationError) as context:
            check_time(
                "FTE",
                Decimal("1.5"),
                year=2026,
            )

        self.assertEqual(
            str(context.exception.detail[0]),
            "Time for 2026 cannot exceed 1 for time basis 'FTE'.",
        )


class TestCheckTimeAgainstBasis(SimpleTestCase):
    def test_valid_entries(self):
        entries = [
            {"year": 2025, "time": Decimal(1)},
            {"year": 2026, "time": Decimal("0.5")},
        ]

        check_time_against_basis("FTE", entries)

    def test_valid_entries_for_daily_basis(self):
        entries = [
            {"year": 2025, "time": Decimal(220)},
            {"year": 2026, "time": Decimal(100)},
        ]

        check_time_against_basis("Daily", entries)

    def test_valid_entries_for_hourly_basis(self):
        entries = [
            {"year": 2025, "time": Decimal(8784)},
        ]

        check_time_against_basis("Hourly", entries)

    def test_raises_error_for_invalid_entry(self):
        entries = [
            {"year": 2025, "time": Decimal("0.5")},
            {"year": 2026, "time": Decimal("1.5")},
        ]

        with self.assertRaises(ValidationError) as context:
            check_time_against_basis("FTE", entries)

        self.assertEqual(
            str(context.exception.detail[0]),
            "Time for 2026 cannot exceed 1 for time basis 'FTE'.",
        )

    def test_does_nothing_when_time_basis_is_none(self):
        entries = [
            {"year": 2025, "time": Decimal(999999)},
        ]

        check_time_against_basis(None, entries)

    def test_checks_all_entries_until_invalid_entry(self):
        entries = [
            {"year": 2025, "time": Decimal(1)},
            {"year": 2026, "time": Decimal("1.5")},
            {"year": 2027, "time": Decimal("0.5")},
        ]

        with self.assertRaises(ValidationError):
            check_time_against_basis("FTE", entries)
