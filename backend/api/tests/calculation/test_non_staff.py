from decimal import Decimal

from django.test import SimpleTestCase

from api.calculation.non_staff import (
    calculate_non_staff_column,
    calculate_non_staff_row,
    calculate_non_staff_table,
    find_direct_rate_multiplier,
)


class TestFindDirectRateMultiplier(SimpleTestCase):
    def test_adds_ten_percent_when_allowed(self):
        info = {
            "excludes_additional_rate": False,
            "add_ten_percent": True,
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal("1.1"))

    def test_does_not_add_ten_percent_for_excluded_cost_group(self):
        info = {
            "excludes_additional_rate": True,
            "add_ten_percent": True,
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))

    def test_does_not_add_ten_percent_when_disabled(self):
        info = {
            "excludes_additional_rate": False,
            "add_ten_percent": False,
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))


class TestCalculateNonStaffRow(SimpleTestCase):
    def setUp(self):
        self.info = {
            "excludes_additional_rate": False,
            "add_ten_percent": True,
        }

    def test_calculates_total_and_direct_total(self):
        num_data = {
            2025: Decimal(1000),
            2026: Decimal(2000),
        }

        result = calculate_non_staff_row(
            self.info,
            num_data,
            2025,
            2026,
        )

        self.assertEqual(result["total"], Decimal(3000))
        self.assertEqual(result["direct_total"], Decimal(3300))

    def test_missing_year_value_is_treated_as_zero(self):
        num_data = {
            2025: Decimal(1000),
        }

        result = calculate_non_staff_row(
            self.info,
            num_data,
            2025,
            2026,
        )

        self.assertEqual(result["total"], Decimal(1000))
        self.assertEqual(result["direct_total"], Decimal(1100))


class TestCalculateNonStaffColumn(SimpleTestCase):
    def test_calculates_direct_and_column_totals(self):
        data = {
            "row_1": {
                "info": {
                    "excludes_additional_rate": False,
                    "add_ten_percent": True,
                },
                "numeric": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
                "direct_total": Decimal(3300),
            },
            "row_2": {
                "info": {
                    "excludes_additional_rate": False,
                    "add_ten_percent": False,
                },
                "numeric": {
                    2025: Decimal(500),
                    2026: Decimal(500),
                },
                "total": Decimal(1000),
                "direct_total": Decimal(1000),
            },
        }

        result = calculate_non_staff_column(data, 2025, 2026)

        self.assertEqual(
            result["direct_total"]["numeric"],
            {
                2025: Decimal(1600),
                2026: Decimal(2700),
            },
        )
        # A line takes the 10% and nothing more (#192): no indirect rate.
        self.assertEqual(
            result["column_total"]["numeric"], result["direct_total"]["numeric"]
        )
        self.assertNotIn("indirect_total", result)

        self.assertEqual(result["direct_total"]["total"], Decimal(4300))
        self.assertEqual(result["column_total"]["total"], Decimal(4300))

    def test_excluded_cost_group_does_not_apply_the_ten_percent(self):
        data = {
            "row_1": {
                "info": {
                    "excludes_additional_rate": True,
                    "add_ten_percent": True,
                },
                "numeric": {
                    2025: Decimal(1000),
                },
                "total": Decimal(1000),
                "direct_total": Decimal(1000),
            },
        }

        result = calculate_non_staff_column(data, 2025, 2025)

        self.assertEqual(
            result["direct_total"]["numeric"][2025],
            Decimal(1000),
        )
        self.assertEqual(
            result["column_total"]["numeric"][2025],
            Decimal(1000),
        )


class TestCalculateNonStaffTable(SimpleTestCase):
    def test_separates_in_kind_and_regular_costs(self):
        table_data = {
            "info_table": {
                "row_1": {
                    "excludes_additional_rate": False,
                    "add_ten_percent": False,
                    "in_kind": False,
                },
                "row_2": {
                    "excludes_additional_rate": False,
                    "add_ten_percent": False,
                    "in_kind": True,
                },
            },
            "numeric_table": {
                "row_1": {
                    2025: Decimal(1000),
                },
                "row_2": {
                    2025: Decimal(500),
                },
            },
        }

        result = calculate_non_staff_table(
            table_data,
            2025,
            2025,
        )

        self.assertIn("row_1", result["cost_results"])
        self.assertNotIn("row_2", result["cost_results"])

        self.assertIn("row_2", result["in_kind_cost_results"])
        self.assertNotIn("row_1", result["in_kind_cost_results"])

        self.assertEqual(
            result["cost_results"]["row_1"]["total"],
            Decimal(1000),
        )
        self.assertEqual(
            result["in_kind_cost_results"]["row_2"]["total"],
            Decimal(500),
        )
