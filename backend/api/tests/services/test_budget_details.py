from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from api.models import Budget
from api.services.budget_details import (
    build_budget_details,
    get_budget_details,
    merge_staff_table_with_result,
)


class TestMergeStaffTableWithResult(SimpleTestCase):
    def setUp(self):
        self.staff_table = {
            "info_table": {
                "staff_1": {},
            },
            "numeric_table": {
                "staff_1": {
                    2025: Decimal("1"),
                    2026: Decimal("2"),
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
                "rate_2025": Decimal("60000"),
                "results": {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                },
                "total": Decimal("3000"),
            },
            "column_total": {
                "results": {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                },
                "total": Decimal("3000"),
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
                "rate_2025": Decimal("60000"),
                "numeric": {
                    2025: {
                        "input": Decimal("1"),
                        "result": Decimal("1000"),
                    },
                    2026: {
                        "input": Decimal("2"),
                        "result": Decimal("2000"),
                    },
                },
                "total": Decimal("3000"),
            },
            "column_total": {
                "results": {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                },
                "total": Decimal("3000"),
            },
        }

        self.assertEqual(result, expected)

    def test_missing_numeric_year_defaults_to_zero(self):
        staff_table = {
            **self.staff_table,
            "numeric_table": {
                "staff_1": {
                    2025: Decimal("1"),
                },
            },
        }

        staff_result_table = {
            "staff_1": {
                "rate_2025": Decimal("60000"),
                "results": {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                },
                "total": Decimal("3000"),
            },
            "column_total": {
                "results": {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                },
                "total": Decimal("3000"),
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
                "rate_2025": Decimal("60000"),
                "results": {
                    2025: Decimal("1000"),
                },
                "total": Decimal("1000"),
            },
            "column_total": {
                "results": {
                    2025: Decimal("1000"),
                },
                "total": Decimal("1000"),
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
                        "rate_2025": Decimal("60000"),
                        "results": {
                            2025: Decimal("1000"),
                            2026: Decimal("2000"),
                        },
                        "total": Decimal("3000"),
                    },
                    "column_total": {
                        "results": {
                            2025: Decimal("1000"),
                            2026: Decimal("2000"),
                        },
                        "total": Decimal("3000"),
                    },
                },
                "in_kind_cost_results": {
                    "column_total": {
                        "results": {},
                        "total": Decimal("0"),
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
                    "rate_2025": Decimal("60000"),
                    "numeric": {
                        2025: {
                            "input": 0,
                            "result": Decimal("1000"),
                        },
                        2026: {
                            "input": 0,
                            "result": Decimal("2000"),
                        },
                    },
                    "total": Decimal("3000"),
                },
                "column_total": {
                    "results": {
                        2025: Decimal("1000"),
                        2026: Decimal("2000"),
                    },
                    "total": Decimal("3000"),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "results": {},
                    "total": Decimal("0"),
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


class TestGetBudgetDetails(SimpleTestCase):
    @patch("api.services.budget_details.build_budget_details")
    @patch("api.services.budget_details.data_loader.load_budget_data")
    @patch("api.services.budget_details.lookup_loader.get_constants")
    def test_get_budget_details(
        self,
        mock_get_constants,
        mock_load_budget_data,
        mock_build_budget_details,
    ):
        budget = Mock(spec=Budget)
        constants = {}
        budget_data = {}
        expected = {"result": "test"}

        mock_get_constants.return_value = constants
        mock_load_budget_data.return_value = budget_data
        mock_build_budget_details.return_value = expected

        result = get_budget_details(budget)

        mock_get_constants.assert_called_once_with()
        mock_load_budget_data.assert_called_once_with(budget)
        mock_build_budget_details.assert_called_once_with(
            constants,
            budget_data,
        )

        self.assertEqual(result, expected)
