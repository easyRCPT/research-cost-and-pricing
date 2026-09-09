from decimal import Decimal

from django.test import SimpleTestCase

from api.calculation.pricing import (
    calculate_budget_summary,
    calculate_dean_required,
    calculate_non_staff_budget,
    calculate_price_summary,
    calculate_staff_budget,
)


class TestCalculateDeanRequired(SimpleTestCase):
    def test_requires_dean_when_cost_multiplier_is_below_default(self):
        budget_info = {
            "cost_multiplier": Decimal("0.8"),
            "margin": Decimal("0.3"),
        }
        general = {
            "full_cost_recovery_multiplier": Decimal(1),
            "default_margin": Decimal("0.3"),
        }

        result = calculate_dean_required(budget_info, general)

        self.assertTrue(result)

    def test_does_not_require_dean_when_cost_multiplier_is_at_default(self):
        budget_info = {
            "cost_multiplier": Decimal(1),
            "margin": Decimal("0.3"),
        }
        general = {
            "full_cost_recovery_multiplier": Decimal(1),
            "default_margin": Decimal("0.3"),
        }

        result = calculate_dean_required(budget_info, general)

        self.assertFalse(result)

    def test_requires_dean_when_margin_is_below_default(self):
        budget_info = {
            "cost_multiplier": Decimal(1),
            "margin": Decimal("0.2"),
        }
        general = {
            "full_cost_recovery_multiplier": Decimal(1),
            "default_margin": Decimal("0.3"),
        }

        result = calculate_dean_required(budget_info, general)

        self.assertTrue(result)

    def test_uses_default_margin_when_not_configured(self):
        budget_info = {
            "cost_multiplier": Decimal(1),
            "margin": Decimal("0.29"),
        }
        general = {
            "full_cost_recovery_multiplier": Decimal(1),
        }

        result = calculate_dean_required(budget_info, general)

        self.assertTrue(result)

    def test_does_not_require_dean_when_no_default_multiplier_and_margin_is_sufficient(
        self,
    ):
        budget_info = {
            "cost_multiplier": Decimal(1),
            "margin": Decimal("0.30"),
        }
        general = {}

        result = calculate_dean_required(budget_info, general)

        self.assertFalse(result)


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
            "default_margin": Decimal("0.30"),
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
