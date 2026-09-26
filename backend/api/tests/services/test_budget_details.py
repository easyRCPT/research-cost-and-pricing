from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from api.models import Budget
from api.services.budget_details import (
    build_budget_details,
    get_budget_details,
    merge_staff_table_with_result,
    store_price,
)


class TestMergeStaffTableWithResult(SimpleTestCase):
    def setUp(self):
        self.staff_table = {
            "info_table": {
                "staff_1": {},
            },
            "numeric_table": {
                "staff_1": {
                    2025: Decimal(1),
                    2026: Decimal(2),
                },
            },
        }

        self.project_duration = {
            "start_year": 2025,
            "end_year": 2026,
        }

    def test_merges_staff_input_and_calculation_result(self):
        staff_result_table = {
            "staff_1": {
                "rate_2025": Decimal(60000),
                "results": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
            },
            "column_total": {
                "results": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
            },
        }

        result = merge_staff_table_with_result(
            self.staff_table,
            staff_result_table,
            self.project_duration,
        )

        expected = {
            "staff_1": {
                "info": {},
                "rate_2025": Decimal(60000),
                "numeric": {
                    2025: {
                        "input": Decimal(1),
                        "result": Decimal(1000),
                    },
                    2026: {
                        "input": Decimal(2),
                        "result": Decimal(2000),
                    },
                },
                "total": Decimal(3000),
            },
            "column_total": {
                "results": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
            },
        }

        self.assertEqual(result, expected)

    def test_missing_numeric_year_defaults_to_zero(self):
        staff_table = {
            **self.staff_table,
            "numeric_table": {
                "staff_1": {
                    2025: Decimal(1),
                },
            },
        }

        staff_result_table = {
            "staff_1": {
                "rate_2025": Decimal(60000),
                "results": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
            },
            "column_total": {
                "results": {
                    2025: Decimal(1000),
                    2026: Decimal(2000),
                },
                "total": Decimal(3000),
            },
        }

        result = merge_staff_table_with_result(
            staff_table,
            staff_result_table,
            self.project_duration,
        )

        self.assertEqual(
            result["staff_1"]["numeric"][2026]["input"],
            0,
        )

    def test_missing_calculation_result_year_defaults_to_zero(self):
        staff_result_table = {
            "staff_1": {
                "rate_2025": Decimal(60000),
                "results": {
                    2025: Decimal(1000),
                },
                "total": Decimal(1000),
            },
            "column_total": {
                "results": {
                    2025: Decimal(1000),
                },
                "total": Decimal(1000),
            },
        }

        result = merge_staff_table_with_result(
            self.staff_table,
            staff_result_table,
            self.project_duration,
        )

        self.assertEqual(
            result["staff_1"]["numeric"][2026]["result"],
            0,
        )


class TestBuildBudgetDetails(SimpleTestCase):
    def setUp(self):
        self.constants = {
            "constants": {},
        }

        self.budget_data = {
            "project_info": {},
            "budget_info": {},
            "project_duration": {
                "start_year": 2025,
                "end_year": 2026,
            },
            "staff_table": {
                "info_table": {
                    "staff_1": {},
                },
                "numeric_table": {
                    "staff_1": {},
                },
            },
            "non_staff_table": {},
        }

        self.calculation_result = {
            "staff_result": {
                "cost_results": {
                    "staff_1": {
                        "rate_2025": Decimal(60000),
                        "results": {
                            2025: Decimal(1000),
                            2026: Decimal(2000),
                        },
                        "total": Decimal(3000),
                    },
                    "column_total": {
                        "results": {
                            2025: Decimal(1000),
                            2026: Decimal(2000),
                        },
                        "total": Decimal(3000),
                    },
                },
                "in_kind_cost_results": {
                    "column_total": {
                        "results": {},
                        "total": Decimal(0),
                    },
                },
            },
            "non_staff_result": {},
            "budget_summary": {},
        }

    @patch("api.calculation.pricing.pricing")
    def test_builds_budget_details(self, mock_pricing):
        mock_pricing.return_value = self.calculation_result

        result = build_budget_details(
            self.constants,
            self.budget_data,
        )

        mock_pricing.assert_called_once_with(
            self.constants,
            self.budget_data["project_duration"],
            self.budget_data["staff_table"],
            self.budget_data["non_staff_table"],
            self.budget_data["budget_info"],
        )

        expected_staff_table = {
            "cost_results": {
                "staff_1": {
                    "info": {},
                    "rate_2025": Decimal(60000),
                    "numeric": {
                        2025: {
                            "input": 0,
                            "result": Decimal(1000),
                        },
                        2026: {
                            "input": 0,
                            "result": Decimal(2000),
                        },
                    },
                    "total": Decimal(3000),
                },
                "column_total": {
                    "results": {
                        2025: Decimal(1000),
                        2026: Decimal(2000),
                    },
                    "total": Decimal(3000),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "results": {},
                    "total": Decimal(0),
                },
            },
        }

        expected = {
            "project_info": {},
            "budget_info": {},
            "staff_table": expected_staff_table,
            "non_staff_table": {},
            "budget_summary": {},
        }

        self.assertEqual(result, expected)


def details_with_price(price: Decimal) -> dict:
    return {"budget_summary": {"price_summary": {"total_price_inc_gst": price}}}


class TestGetBudgetDetails(SimpleTestCase):
    @patch("api.services.budget_details.build_budget_details")
    @patch("api.services.budget_details.data_loader.load_budget_data")
    @patch("api.services.budget_details.lookup_loader.constants_for")
    def test_get_budget_details(
        self,
        mock_constants_for,
        mock_load_budget_data,
        mock_build_budget_details,
    ):
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("0.00")
        constants = {}
        budget_data = {}
        expected = details_with_price(Decimal("1234.5678"))

        mock_constants_for.return_value = constants
        mock_load_budget_data.return_value = budget_data
        mock_build_budget_details.return_value = expected

        result = get_budget_details(budget)

        mock_constants_for.assert_called_once_with(budget)
        mock_load_budget_data.assert_called_once_with(budget)
        mock_build_budget_details.assert_called_once_with(
            constants,
            budget_data,
        )

        self.assertEqual(result, expected)


class TestStorePrice(SimpleTestCase):
    def test_stores_the_rounded_price(self):
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("0.00")

        store_price(budget, details_with_price(Decimal("1234.5678")))

        self.assertEqual(budget.total_price_inc_gst, Decimal("1234.57"))
        budget.save.assert_called_once_with(
            update_fields=["total_price_inc_gst"],
        )

    def test_does_not_write_when_the_price_has_not_moved(self):
        # A plain GET runs the engine too. It should not write on every read.
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("1234.57")

        store_price(budget, details_with_price(Decimal("1234.5678")))

        budget.save.assert_not_called()
