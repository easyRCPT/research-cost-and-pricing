from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase

from api.calculation.pricing import (
    calculate_budget_summary,
    calculate_dean_required,
    calculate_dean_required_with_dict,
    calculate_non_staff_budget,
    calculate_price_summary,
    calculate_staff_budget,
    pricing,
)


class TestCalculateDeanRequired(SimpleTestCase):
    def test_requires_dean_when_margin_is_below_minimum(self):
        result = calculate_dean_required(
            margin=Decimal("0.20"),
            minimum_margin=Decimal("0.25"),
            has_in_kind=False,
        )

        self.assertEqual(
            result,
            {
                "dean_required": True,
                "dean_triggers": ["margin_below_minimum"],
            },
        )

    def test_does_not_require_dean_when_margin_equals_minimum(self):
        result = calculate_dean_required(
            margin=Decimal("0.25"),
            minimum_margin=Decimal("0.25"),
            has_in_kind=False,
        )

        self.assertEqual(
            result,
            {
                "dean_required": False,
                "dean_triggers": [],
            },
        )

    def test_does_not_require_dean_when_margin_is_above_minimum(self):
        result = calculate_dean_required(
            margin=Decimal("0.30"),
            minimum_margin=Decimal("0.25"),
            has_in_kind=False,
        )

        self.assertEqual(
            result,
            {
                "dean_required": False,
                "dean_triggers": [],
            },
        )

    def test_requires_dean_when_in_kind_cost_is_present(self):
        result = calculate_dean_required(
            margin=Decimal("0.30"),
            minimum_margin=Decimal("0.25"),
            has_in_kind=True,
        )

        self.assertEqual(
            result,
            {
                "dean_required": True,
                "dean_triggers": ["in_kind_present"],
            },
        )

    def test_returns_both_triggers_when_both_conditions_apply(self):
        result = calculate_dean_required(
            margin=Decimal("0.20"),
            minimum_margin=Decimal("0.25"),
            has_in_kind=True,
        )

        self.assertEqual(
            result,
            {
                "dean_required": True,
                "dean_triggers": [
                    "margin_below_minimum",
                    "in_kind_present",
                ],
            },
        )


class TestCalculateDeanRequiredWithDict(SimpleTestCase):
    def test_uses_margin_minimum_and_in_kind_cost_from_dicts(self):
        budget_info = {
            "margin": Decimal("0.20"),
        }
        general = {
            "minimum_margin": Decimal("0.25"),
        }
        price_summary = {
            "in_kind_project_cost": Decimal(100),
        }

        result = calculate_dean_required_with_dict(
            budget_info,
            general,
            price_summary,
        )

        self.assertEqual(
            result,
            {
                "dean_required": True,
                "dean_triggers": [
                    "margin_below_minimum",
                    "in_kind_present",
                ],
            },
        )

    def test_does_not_require_dean_when_no_trigger_applies(self):
        budget_info = {
            "margin": Decimal("0.30"),
        }
        general = {
            "minimum_margin": Decimal("0.25"),
        }
        price_summary = {
            "in_kind_project_cost": Decimal(0),
        }

        result = calculate_dean_required_with_dict(
            budget_info,
            general,
            price_summary,
        )

        self.assertEqual(
            result,
            {
                "dean_required": False,
                "dean_triggers": [],
            },
        )


class TestCalculatePriceSummary(SimpleTestCase):
    def setUp(self):
        self.staff_result = {
            "cost_results": {
                "column_total": {
                    "total": Decimal(1000),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "total": Decimal(200),
                },
            },
        }

        self.non_staff_result = {
            "cost_results": {
                "column_total": {
                    "total": Decimal(500),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "total": Decimal(300),
                },
            },
        }

        self.general = {
            "gst_rate": Decimal("0.10"),
        }

    def test_calculates_price_summary_with_gst(self):
        result = calculate_price_summary(
            self.staff_result,
            self.non_staff_result,
            Decimal(100),
            True,
            self.general,
            Decimal("0.20"),
        )

        self.assertEqual(result["margin"], Decimal("0.20"))
        self.assertEqual(result["margin_amount"], Decimal(300))

        self.assertEqual(result["staff_cost"], Decimal(1000))
        self.assertEqual(result["non_staff_cost"], Decimal(500))
        self.assertEqual(result["project_cost"], Decimal(1500))

        self.assertEqual(result["in_kind_staff_cost"], Decimal(200))
        self.assertEqual(result["in_kind_non_staff_cost"], Decimal(300))
        self.assertEqual(result["in_kind_project_cost"], Decimal(500))
        self.assertEqual(result["total_project_cost"], Decimal(2000))

        self.assertEqual(result["staff_cost_percentage"], Decimal(2) / Decimal(3))
        self.assertEqual(
            result["non_staff_cost_percentage"],
            Decimal(1) / Decimal(3),
        )

        self.assertEqual(result["total_price_exc_gst"], Decimal(1800))
        self.assertEqual(result["total_price_inc_gst"], Decimal(1980))

        self.assertEqual(result["cash_benefit"], Decimal(300))
        self.assertEqual(result["total_in_kind_contribution"], Decimal(500))
        self.assertEqual(result["total_cash_co_contribution"], Decimal(100))
        self.assertEqual(result["university_position"], Decimal(-300))

    def test_does_not_apply_gst_when_not_applicable(self):
        result = calculate_price_summary(
            self.staff_result,
            self.non_staff_result,
            Decimal(0),
            False,
            self.general,
            Decimal("0.20"),
        )

        self.assertEqual(result["total_price_exc_gst"], Decimal(1800))
        self.assertEqual(result["total_price_inc_gst"], Decimal(1800))

    def test_handles_zero_project_cost(self):
        staff_result = {
            "cost_results": {
                "column_total": {
                    "total": Decimal(0),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "total": Decimal(0),
                },
            },
        }

        non_staff_result = {
            "cost_results": {
                "column_total": {
                    "total": Decimal(0),
                },
            },
            "in_kind_cost_results": {
                "column_total": {
                    "total": Decimal(0),
                },
            },
        }

        result = calculate_price_summary(
            staff_result,
            non_staff_result,
            Decimal(0),
            False,
            self.general,
            Decimal("0.30"),
        )

        self.assertEqual(result["staff_cost_percentage"], Decimal(0))
        self.assertEqual(result["non_staff_cost_percentage"], Decimal(0))


class TestCalculateStaffBudget(SimpleTestCase):
    def test_groups_staff_costs_by_category_and_employment_type(self):
        info_table = {
            "row_1": {
                "category": "Academic",
                "employment_type": "Continuing",
            },
            "row_2": {
                "category": "Academic",
                "employment_type": "Casual",
            },
            "row_3": {
                "category": "Professional",
                "employment_type": "Continuing",
            },
        }

        staff_result = {
            "row_1": {"total": Decimal(1000)},
            "row_2": {"total": Decimal(500)},
            "row_3": {"total": Decimal(2000)},
            "column_total": {"total": Decimal(3500)},
        }

        result = calculate_staff_budget(
            info_table,
            staff_result,
            Decimal(1),
        )

        self.assertEqual(
            result["category_totals"],
            {
                "Academic_Continuing": Decimal(1000),
                "Academic_Casual": Decimal(500),
                "Professional_Continuing": Decimal(2000),
            },
        )
        self.assertEqual(result["cost_before_recovery"], Decimal(3500))
        self.assertEqual(result["cost_recovery"], Decimal(0))
        self.assertEqual(result["cost_recovery_multiplier"], Decimal(1))
        self.assertEqual(result["total_staff_costs"], Decimal(3500))

    def test_calculates_cost_recovery(self):
        info_table = {
            "row_1": {
                "category": "Academic",
                "employment_type": "Continuing",
            },
        }

        staff_result = {
            "row_1": {"total": Decimal(1200)},
            "column_total": {"total": Decimal(1200)},
        }

        result = calculate_staff_budget(
            info_table,
            staff_result,
            Decimal("1.2"),
        )

        self.assertEqual(
            result["category_totals"]["Academic_Continuing"],
            Decimal(1000),
        )
        self.assertEqual(result["cost_before_recovery"], Decimal(1000))
        self.assertEqual(result["cost_recovery"], Decimal(200))
        self.assertEqual(result["cost_recovery_multiplier"], Decimal("1.2"))
        self.assertEqual(result["total_staff_costs"], Decimal(1200))


class TestCalculateNonStaffBudget(SimpleTestCase):
    def test_groups_non_staff_costs_by_cost_group(self):
        non_staff_result = {
            "row_1": {
                "info": {"cost_group": "equipment"},
                "direct_total": Decimal(1000),
            },
            "row_2": {
                "info": {"cost_group": "equipment"},
                "direct_total": Decimal(500),
            },
            "row_3": {
                "info": {"cost_group": "travel"},
                "direct_total": Decimal(200),
            },
            "direct_total": {
                "total": Decimal(1700),
            },
            "indirect_total": {
                "total": Decimal(300),
            },
            "column_total": {
                "total": Decimal(2000),
            },
        }

        result = calculate_non_staff_budget(non_staff_result)

        self.assertEqual(
            result["category_totals"],
            {
                "equipment": Decimal(1500),
                "travel": Decimal(200),
            },
        )
        self.assertEqual(result["direct_total"], Decimal(1700))
        self.assertEqual(result["indirect_cost_recovery"], Decimal(300))
        self.assertEqual(result["total_non_staff_costs"], Decimal(2000))


class TestCalculateBudgetSummary(SimpleTestCase):
    def test_calculates_budget_summary(self):
        staff_info_table = {
            "staff_1": {
                "category": "Academic",
                "employment_type": "Continuing",
            },
            "staff_2": {
                "category": "Academic",
                "employment_type": "Continuing",
            },
        }

        staff_result = {
            "cost_results": {
                "staff_1": {"total": Decimal(1000)},
                "column_total": {"total": Decimal(1000)},
            },
            "in_kind_cost_results": {
                "staff_2": {"total": Decimal(200)},
                "column_total": {"total": Decimal(200)},
            },
        }

        non_staff_result = {
            "cost_results": {
                "equipment_1": {
                    "info": {"cost_group": "equipment"},
                    "direct_total": Decimal(500),
                },
                "direct_total": {
                    "total": Decimal(500),
                },
                "indirect_total": {
                    "total": Decimal(100),
                },
                "column_total": {
                    "total": Decimal(600),
                },
            },
            "in_kind_cost_results": {
                "equipment_2": {
                    "info": {"cost_group": "equipment"},
                    "direct_total": Decimal(300),
                },
                "direct_total": {
                    "total": Decimal(300),
                },
                "indirect_total": {
                    "total": Decimal(0),
                },
                "column_total": {
                    "total": Decimal(300),
                },
            },
        }

        budget_info = {
            "cost_multiplier": Decimal(1),
            "in_kind_multiplier": Decimal(1),
            "gst_applicable": False,
            "margin": Decimal("0.20"),
        }

        general = {
            "gst_rate": Decimal("0.10"),
            "full_cost_recovery_multiplier": Decimal(1),
            # A floor above this budget's margin, so dean_required is carried
            # through to the summary rather than being incidentally false.
            "minimum_margin": Decimal("0.25"),
        }

        result = calculate_budget_summary(
            staff_info_table,
            staff_result,
            non_staff_result,
            budget_info,
            Decimal(100),
            general,
        )

        self.assertEqual(
            result["price_summary"]["project_cost"],
            Decimal(1600),
        )
        self.assertEqual(
            result["staff_budget"]["total_staff_costs"],
            Decimal(1000),
        )
        self.assertEqual(
            result["non_staff_budget"]["total_non_staff_costs"],
            Decimal(600),
        )
        self.assertEqual(
            result["in_kind_costs"]["total_in_kind_costs"],
            Decimal(500),
        )
        self.assertTrue(result["dean_required"])
        self.assertEqual(
            result["dean_triggers"],
            [
                "margin_below_minimum",
                "in_kind_present",
            ],
        )


class TestPricing(SimpleTestCase):
    def setUp(self):
        self.constants = {
            "constants": {},
        }
        self.project_duration = {
            "start_year": 2025,
            "start_month": 1,
            "end_year": 2026,
            "end_month": 12,
        }
        self.staff_table = {
            "info_table": {},
            "numeric_table": {},
        }
        self.non_staff_table = {}
        self.budget_info = {
            "cost_multiplier": Decimal("1.2"),
            "in_kind_multiplier": Decimal(1),
            "cash_co_contribution": Decimal(100),
        }

    @patch("api.calculation.pricing.calculate_budget_summary")
    @patch("api.calculation.non_staff.calculate_non_staff_table")
    @patch("api.calculation.staff.calculate_staff_table")
    def test_pricing(
        self,
        mock_staff,
        mock_non_staff,
        mock_budget_summary,
    ):
        staff_result = {"staff": "result"}
        non_staff_result = {"non_staff": "result"}
        budget_summary = {"summary": "result"}

        mock_staff.return_value = staff_result
        mock_non_staff.return_value = non_staff_result
        mock_budget_summary.return_value = budget_summary

        result = pricing(
            self.constants,
            self.project_duration,
            self.staff_table,
            self.non_staff_table,
            self.budget_info,
        )

        mock_staff.assert_called_once_with(
            self.staff_table,
            self.constants,
            2025,
            1,
            2026,
            12,
            Decimal("1.2"),
            Decimal(1),
        )

        mock_non_staff.assert_called_once_with(
            self.non_staff_table,
            2025,
            2026,
        )

        mock_budget_summary.assert_called_once_with(
            self.staff_table["info_table"],
            staff_result,
            non_staff_result,
            self.budget_info,
            Decimal(100),
            self.constants["constants"],
        )

        self.assertEqual(
            result,
            {
                "staff_result": staff_result,
                "non_staff_result": non_staff_result,
                "budget_summary": budget_summary,
            },
        )
