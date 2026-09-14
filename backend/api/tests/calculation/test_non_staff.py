from decimal import Decimal

from django.test import SimpleTestCase

from api.calculation.non_staff import (
    calculate_non_staff_column,
    calculate_non_staff_row,
    calculate_non_staff_table,
    find_direct_rate_multiplier,
    find_indirect_rate_multiplier,
)


class TestFindIndirectRateMultiplier(SimpleTestCase):
    def test_returns_rate_when_provided(self):
        info = {
            "cost_group": "equipment",
            "indirect_rate_multiplier": Decimal("1.2"),
        }

        result = find_indirect_rate_multiplier(info)

        self.assertEqual(result, Decimal("1.2"))

    def test_returns_one_when_rate_is_none(self):
        info = {
            "cost_group": "equipment",
            "indirect_rate_multiplier": None,
        }

        result = find_indirect_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))

    def test_returns_one_for_excluded_cost_group(self):
        info = {
            "cost_group": "contingency",
            "indirect_rate_multiplier": Decimal("1.2"),
        }

        result = find_indirect_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))


class TestFindDirectRateMultiplier(SimpleTestCase):
    def test_adds_ten_percent_when_allowed(self):
        info = {
            "cost_group": "equipment",
            "add_ten_percent": True,
            "indirect_rate_multiplier": Decimal(1),
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal("1.1"))

    def test_does_not_add_ten_percent_when_indirect_rate_exceeds_one(self):
        info = {
            "cost_group": "equipment",
            "add_ten_percent": True,
            "indirect_rate_multiplier": Decimal("1.2"),
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))

    def test_does_not_add_ten_percent_for_excluded_cost_group(self):
        info = {
            "cost_group": "contingency",
            "add_ten_percent": True,
            "indirect_rate_multiplier": Decimal(1),
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))

    def test_does_not_add_ten_percent_when_disabled(self):
        info = {
            "cost_group": "equipment",
            "add_ten_percent": False,
            "indirect_rate_multiplier": Decimal(1),
        }

        result = find_direct_rate_multiplier(info)

        self.assertEqual(result, Decimal(1))


class TestCalculateNonStaffRow(SimpleTestCase):
    def setUp(self):
        self.info = {
            "cost_group": "equipment",
            "add_ten_percent": True,
            "indirect_rate_multiplier": Decimal(1),
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
    def test_calculates_direct_indirect_and_column_totals(self):
        data = {
            "row_1": {
                "info": {
                    "cost_group": "equipment",
                    "add_ten_percent": True,
                    "indirect_rate_multiplier": Decimal("1.2"),
                },
                "numeric": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
                "direct_total": Decimal(3000),
            },
            "row_2": {
                "info": {
                    "cost_group": "travel",
                    "add_ten_percent": True,
                    "indirect_rate_multiplier": Decimal(1),
                },
                "numeric": {
                    2025: Decimal(500),
                    2026: Decimal(500),
                },
                "total": Decimal(1000),
                "direct_total": Decimal(1100),
            },
        }

        result = calculate_non_staff_column(data, 2025, 2026)

        self.assertEqual(
            result["direct_total"]["numeric"],
            {
                2025: Decimal(1550),
                2026: Decimal(2550),
            },
        )
        self.assertEqual(
            result["indirect_total"]["numeric"],
            {
                2025: Decimal(200),
                2026: Decimal(400),
            },
        )
        self.assertEqual(
            result["column_total"]["numeric"],
            {
                2025: Decimal(1750),
                2026: Decimal(2950),
            },
        )

        self.assertEqual(result["direct_total"]["total"], Decimal(4100))
        self.assertEqual(result["indirect_total"]["total"], Decimal(600))
        self.assertEqual(result["column_total"]["total"], Decimal(4700))

    def test_excluded_cost_group_does_not_apply_direct_or_indirect_rate(self):
        data = {
            "row_1": {
                "info": {
                    "cost_group": "contingency",
                    "add_ten_percent": True,
                    "indirect_rate_multiplier": Decimal("1.2"),
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
            result["indirect_total"]["numeric"][2025],
            Decimal(0),
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
                    "cost_group": "equipment",
                    "add_ten_percent": False,
                    "indirect_rate_multiplier": Decimal(1),
                    "in_kind": False,
                },
                "row_2": {
                    "cost_group": "travel",
                    "add_ten_percent": False,
                    "indirect_rate_multiplier": Decimal(1),
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
