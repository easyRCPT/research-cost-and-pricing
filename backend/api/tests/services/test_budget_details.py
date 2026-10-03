from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase

from api.models import Budget, LookupConfiguration, LookupVersion
from api.services.budget_details import (
    build_budget_details,
    get_budget_details,
    get_lookup_version_for_budget,
    merge_staff_table_with_result,
    store_multipliers,
    store_price,
)


class TestGetLookupVersionForBudget(TestCase):
    def setUp(self):
        self.version = LookupVersion.objects.create()

        LookupConfiguration.objects.update_or_create(
            id=1,
            defaults={"current_version": self.version},
        )

    def test_returns_budget_lookup_version_when_available(self):
        budget_version = LookupVersion.objects.create()

        budget = Mock()
        budget.lookup_version_id = budget_version.id
        budget.lookup_version = budget_version

        result = get_lookup_version_for_budget(budget)

        self.assertEqual(result, budget_version)

    def test_returns_current_lookup_version_when_budget_has_no_version(self):
        budget = Mock()
        budget.lookup_version_id = None
        budget.lookup_version = None

        result = get_lookup_version_for_budget(budget)

        self.assertEqual(result, self.version)


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
                "rate": Decimal(60000),
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
                "rate": Decimal(60000),
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
                "rate": Decimal(60000),
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
                "rate": Decimal(60000),
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
            "constants": {"full_cost_recovery_multiplier": Decimal("1.80")},
            "currencies": {"AUD": Decimal(1)},
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
                        "rate": Decimal(60000),
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
            "non_staff_result": {
                "cost_results": {
                    "column_total": {
                        "numeric": {2025: Decimal(0), 2026: Decimal(500)},
                        "total": Decimal(500),
                    },
                },
            },
            "budget_summary": {
                "price_summary": {
                    "margin": Decimal("0.30"),
                    "total_price_inc_gst": Decimal(3500),
                },
            },
        }

    @patch("api.calculation.pricing.pricing")
    def test_builds_budget_details(self, mock_pricing):
        mock_pricing.return_value = self.calculation_result

        result = build_budget_details(
            self.constants,
            self.budget_data,
        )

        # Priced at the version's multiplier, for in-kind staff too (#149),
        # and in AUD, since the budget names no other currency (#152).
        priced_info = {
            "cost_multiplier": Decimal("1.80"),
            "in_kind_multiplier": Decimal("1.80"),
            "currency": "AUD",
            "table_exchange_rate": Decimal(1),
            "exchange_rate": Decimal(1),
        }
        mock_pricing.assert_called_once_with(
            self.constants,
            self.budget_data["project_duration"],
            self.budget_data["staff_table"],
            self.budget_data["non_staff_table"],
            priced_info,
        )

        expected_staff_table = {
            "cost_results": {
                "staff_1": {
                    "info": {},
                    "rate": Decimal(60000),
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
            "budget_info": priced_info,
            "staff_table": expected_staff_table,
            "non_staff_table": self.calculation_result["non_staff_result"],
            "budget_summary": {
                "price_summary": {
                    "margin": Decimal("0.30"),
                    "total_price_inc_gst": Decimal(3500),
                },
                # The same figures in AUD, which for an AUD costing they are.
                "in_aud": {
                    "price_summary": {
                        "margin": Decimal("0.30"),
                        "total_price_inc_gst": Decimal(3500),
                    },
                    "staff_cost_by_year": [
                        {"year": 2025, "amount": Decimal(1000)},
                        {"year": 2026, "amount": Decimal(2000)},
                    ],
                    "non_staff_cost_by_year": [
                        {"year": 2025, "amount": Decimal(0)},
                        {"year": 2026, "amount": Decimal(500)},
                    ],
                },
            },
        }

        self.assertEqual(result, expected)


def details_with_price(price: Decimal) -> dict:
    return {
        "budget_info": {
            "cost_multiplier": Decimal("1.70"),
            "in_kind_multiplier": Decimal("1.70"),
        },
        "budget_summary": {
            "price_summary": {"total_price_inc_gst": price},
            "in_aud": {"price_summary": {"total_price_inc_gst": price}},
        },
    }


class TestGetBudgetDetails(SimpleTestCase):
    @patch("api.services.budget_details.approval_record.approval_record")
    @patch("api.services.budget_details.build_budget_details")
    @patch("api.services.budget_details.data_loader.load_budget_data")
    @patch("api.services.budget_details.lookup_loader.constants_for")
    def test_get_budget_details(
        self,
        mock_constants_for,
        mock_load_budget_data,
        mock_build_budget_details,
        mock_approval_record,
    ):
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("0.00")
        constants = {}
        budget_data = {}
        expected = details_with_price(Decimal("1234.5678"))

        mock_constants_for.return_value = constants
        mock_load_budget_data.return_value = budget_data
        mock_build_budget_details.return_value = expected
        mock_approval_record.return_value = {"steps": []}

        result = get_budget_details(budget)

        mock_constants_for.assert_called_once_with(budget)
        mock_load_budget_data.assert_called_once_with(budget)
        mock_build_budget_details.assert_called_once_with(
            constants,
            budget_data,
        )

        self.assertEqual(result, expected)
        # The review record rides along, from the budget itself.
        mock_approval_record.assert_called_once_with(budget)
        self.assertEqual(result["approval"], {"steps": []})


class TestStorePrice(SimpleTestCase):
    def test_stores_the_rounded_price(self):
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("0.00")

        store_price(budget, details_with_price(Decimal("1234.5678")))

        self.assertEqual(budget.total_price_inc_gst, Decimal("1234.57"))
        budget.save.assert_called_once_with(
            update_fields=["total_price_inc_gst"],
        )

    def test_stores_the_price_in_aud_whatever_the_currency(self):
        # The lists compare costings with one another, in one currency (#152).
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("0.00")
        details = details_with_price(Decimal("700.00"))
        details["budget_summary"]["in_aud"]["price_summary"]["total_price_inc_gst"] = (
            Decimal("995.945")
        )

        store_price(budget, details)

        self.assertEqual(budget.total_price_inc_gst, Decimal("995.95"))

    def test_does_not_write_when_the_price_has_not_moved(self):
        # A plain GET runs the engine too. It should not write on every read.
        budget = Mock(spec=Budget)
        budget.total_price_inc_gst = Decimal("1234.57")

        store_price(budget, details_with_price(Decimal("1234.5678")))

        budget.save.assert_not_called()


def details_with_multiplier(multiplier: Decimal) -> dict:
    return {
        "budget_info": {
            "cost_multiplier": multiplier,
            "in_kind_multiplier": multiplier,
        }
    }


class TestStoreMultipliers(SimpleTestCase):
    """The budget's copy follows the rate it was last priced at (#149)."""

    def test_records_the_rate_the_budget_was_priced_at(self):
        budget = Mock(spec=Budget)
        budget.cost_multiplier = Decimal("1.70")
        budget.in_kind_multiplier = Decimal("1.70")

        store_multipliers(budget, details_with_multiplier(Decimal("1.800000")))

        self.assertEqual(budget.cost_multiplier, Decimal("1.800000"))
        self.assertEqual(budget.in_kind_multiplier, Decimal("1.800000"))
        budget.save.assert_called_once_with(
            update_fields=["cost_multiplier", "in_kind_multiplier"],
        )

    def test_does_not_write_when_the_rate_has_not_moved(self):
        budget = Mock(spec=Budget)
        budget.cost_multiplier = Decimal("1.70")
        budget.in_kind_multiplier = Decimal("1.70")

        store_multipliers(budget, details_with_multiplier(Decimal("1.700000")))

        budget.save.assert_not_called()
