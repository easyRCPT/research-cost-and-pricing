from decimal import Decimal

from django.test import SimpleTestCase

from api.calculation.staff import (
    calculate_column_total,
    calculate_staff_cost,
    calculate_staff_row,
    calculate_staff_table,
    calculate_year_fractions,
    find_salary_rate,
    get_on_cost_rates,
)


class TestCalculateYearFractions(SimpleTestCase):
    def test_same_year_full(self):
        result = calculate_year_fractions(2025, 1, 2025, 12)

        self.assertEqual(result["start_year"], 2025)
        self.assertEqual(result["end_year"], 2025)
        self.assertEqual(
            result["first_year_fraction"],
            Decimal(12) / Decimal(12),
        )
        self.assertEqual(
            result["last_year_fraction"],
            Decimal(12) / Decimal(12),
        )

    def test_same_year_partial(self):
        result = calculate_year_fractions(2025, 3, 2025, 6)

        expected_fraction = Decimal(6 - 3 + 1) / Decimal(12)

        self.assertEqual(result["first_year_fraction"], expected_fraction)
        self.assertEqual(result["last_year_fraction"], expected_fraction)

    def test_multi_year(self):
        result = calculate_year_fractions(2025, 3, 2027, 6)

        self.assertEqual(result["start_year"], 2025)
        self.assertEqual(result["end_year"], 2027)
        self.assertEqual(
            result["first_year_fraction"],
            Decimal(12 - 3 + 1) / Decimal(12),
        )
        self.assertEqual(
            result["last_year_fraction"],
            Decimal(6) / Decimal(12),
        )

    def test_invalid_year_range(self):
        with self.assertRaises(ValueError):
            calculate_year_fractions(2026, 1, 2025, 12)

    def test_invalid_month_range(self):
        with self.assertRaises(ValueError):
            calculate_year_fractions(2025, 6, 2025, 3)


class TestFindSalaryRate(SimpleTestCase):
    def setUp(self):
        self.constants = {
            "salary_rate": {
                ("Fortnight", "Academic", "Level A.1"): Decimal(60000),
                ("Fortnight", "Academic", "Level A.2"): Decimal(65000),
                ("Fortnight", "Academic", "Level A.3"): Decimal(70000),
                ("Casual", "Academic", "RA Grade 1.1"): Decimal(50000),
            },
            "salary_rate_multiplier": {
                "FTE": Decimal(1),
                "Daily": Decimal("0.2"),
                "Hourly": Decimal("0.9"),
            },
            "eba": {
                2025: Decimal(1),
                2026: Decimal("1.03"),
            },
        }

    def test_continuing_uses_fortnight_payroll_type(self):
        info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "FTE",
        }

        result = find_salary_rate(info, self.constants, 0, 2025)

        self.assertEqual(result, Decimal(60000))

    def test_fixed_term_uses_fortnight_payroll_type(self):
        info = {
            "employment_type": "Fixed-Term",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "Daily",
        }

        result = find_salary_rate(info, self.constants, 0, 2025)

        expected = Decimal(60000) * Decimal("0.2")
        self.assertEqual(result, expected)

    def test_casual_uses_casual_payroll_type(self):
        info = {
            "employment_type": "Casual",
            "category": "Academic",
            "classification": "RA Grade 1.1",
            "time_basis": "Hourly",
        }

        result = find_salary_rate(info, self.constants, 0, 2025)

        expected = Decimal(50000) * Decimal("0.9")
        self.assertEqual(result, expected)

    def test_classification_progresses_by_year_employed(self):
        info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "FTE",
        }

        result = find_salary_rate(info, self.constants, 1, 2025)

        self.assertEqual(result, Decimal(65000))

    def test_classification_falls_back_when_next_step_is_missing(self):
        info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "FTE",
        }

        # A.4 is missing, so it should fall back to A.3.
        result = find_salary_rate(info, self.constants, 3, 2025)

        self.assertEqual(result, Decimal(70000))

    def test_uom_10_does_not_progress(self):
        self.constants["salary_rate"][("Fortnight", "Professional", "UOM 10")] = (
            Decimal(80000)
        )

        info = {
            "employment_type": "Continuing",
            "category": "Professional",
            "classification": "UOM 10",
            "time_basis": "FTE",
        }

        result = find_salary_rate(info, self.constants, 5, 2025)

        self.assertEqual(result, Decimal(80000))

    def test_missing_salary_rate_returns_zero(self):
        info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level B.1",
            "time_basis": "FTE",
        }

        result = find_salary_rate(info, self.constants, 0, 2025)

        self.assertEqual(result, Decimal(0))

    def test_eba_multiplier_is_applied(self):
        info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "FTE",
        }

        result = find_salary_rate(info, self.constants, 0, 2026)

        expected = Decimal(60000) * Decimal("1.03")
        self.assertEqual(result, expected)


class TestGetOnCostRates(SimpleTestCase):
    def setUp(self):
        self.on_cost_components = {
            "superannuation": {
                "Continuing": {
                    None: Decimal("0.11"),
                    2025: Decimal("0.12"),
                }
            },
            "workcover": {
                "Continuing": {
                    None: Decimal("0.01"),
                    2025: Decimal("0.015"),
                }
            },
        }

    def test_uses_year_specific_rate(self):
        result = get_on_cost_rates(
            self.on_cost_components,
            "Continuing",
            2025,
        )

        self.assertEqual(result["superannuation"], Decimal("0.12"))
        self.assertEqual(result["workcover"], Decimal("0.015"))

    def test_uses_default_rate_when_year_rate_is_missing(self):
        result = get_on_cost_rates(
            self.on_cost_components,
            "Continuing",
            2026,
        )

        self.assertEqual(result["superannuation"], Decimal("0.11"))
        self.assertEqual(result["workcover"], Decimal("0.01"))


class TestCalculateStaffCost(SimpleTestCase):
    def setUp(self):
        self.on_costs = {
            "leave_loading": Decimal("0.10"),
            "superannuation": Decimal("0.11"),
            "workcover": Decimal("0.02"),
            "long_service_leave": Decimal("0.01"),
            "parental_leave": Decimal("0.01"),
            "annual_leave_provision": Decimal("0.02"),
        }

        self.general = {
            "max_leave_loading": Decimal(10000),
            "max_payroll_tax": Decimal("0.05"),
            "override_uom_oncosts": Decimal("0.01"),
        }

        self.salary_rate = Decimal(100000)
        self.time = Decimal("0.5")
        self.year_fraction = Decimal(1)
        self.cost_recovery_multiplier = Decimal(1)

    def test_calculates_staff_cost(self):
        result = calculate_staff_cost(
            self.on_costs,
            self.general,
            self.salary_rate,
            self.time,
            self.year_fraction,
            self.cost_recovery_multiplier,
        )

        requested_salary = Decimal(100000) * Decimal("0.5")
        leave_loading = Decimal("0.10") * requested_salary
        superannuation = Decimal("0.11") * requested_salary
        subtotal = requested_salary + leave_loading + superannuation

        expected = subtotal
        expected += Decimal("0.05") * subtotal
        expected += Decimal("0.02") * subtotal
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.02") * requested_salary

        self.assertEqual(result, expected)

    def test_leave_loading_is_capped(self):
        result = calculate_staff_cost(
            self.on_costs,
            self.general,
            Decimal(200000),
            Decimal(1),
            Decimal(1),
            Decimal(1),
        )

        requested_salary = Decimal(200000)

        # 10% of salary is 20,000, but the cap is 10,000.
        leave_loading = Decimal(10000)

        subtotal = requested_salary + leave_loading
        subtotal += Decimal("0.11") * requested_salary

        expected = subtotal
        expected += Decimal("0.05") * subtotal
        expected += Decimal("0.02") * subtotal
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.01") * requested_salary
        expected += Decimal("0.02") * requested_salary

        self.assertEqual(result, expected)

    def test_year_fraction_reduces_requested_salary(self):
        full_year = calculate_staff_cost(
            self.on_costs,
            self.general,
            Decimal(100000),
            Decimal(1),
            Decimal(1),
            Decimal(1),
        )

        half_year = calculate_staff_cost(
            self.on_costs,
            self.general,
            Decimal(100000),
            Decimal(1),
            Decimal("0.5"),
            Decimal(1),
        )

        self.assertLess(half_year, full_year)

    def test_cost_recovery_multiplier_is_applied(self):
        base_result = calculate_staff_cost(
            self.on_costs,
            self.general,
            self.salary_rate,
            self.time,
            self.year_fraction,
            Decimal(1),
        )

        result = calculate_staff_cost(
            self.on_costs,
            self.general,
            self.salary_rate,
            self.time,
            self.year_fraction,
            Decimal("1.2"),
        )

        self.assertEqual(
            result,
            base_result * Decimal("1.2"),
        )


class TestCalculateStaffRow(SimpleTestCase):
    def setUp(self):
        self.info = {
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": "FTE",
            "in_kind": False,
        }

        self.constants: dict[str, dict] = {
            "salary_rate": {
                ("Fortnight", "Academic", "Level A.1"): Decimal(60000),
            },
            "salary_rate_multiplier": {
                "FTE": Decimal(1),
            },
            "eba": {
                2025: Decimal(1),
                2026: Decimal("1.05"),
            },
            "on_cost_components": {
                "superannuation": {
                    "Continuing": {
                        None: Decimal("0.11"),
                    }
                },
                "leave_loading": {
                    "Continuing": {
                        None: Decimal("0.10"),
                    }
                },
                "workcover": {
                    "Continuing": {
                        None: Decimal("0.02"),
                    }
                },
                "long_service_leave": {
                    "Continuing": {
                        None: Decimal("0.01"),
                    }
                },
                "parental_leave": {
                    "Continuing": {
                        None: Decimal("0.01"),
                    }
                },
                "annual_leave_provision": {
                    "Continuing": {
                        None: Decimal("0.02"),
                    }
                },
            },
            "constants": {
                "max_leave_loading": Decimal(10000),
                "max_payroll_tax": Decimal("0.05"),
                "override_uom_oncosts": Decimal("0.01"),
            },
        }

        self.project_duration = {
            "start_year": 2025,
            "end_year": 2026,
            "first_year_fraction": Decimal("0.5"),
            "last_year_fraction": Decimal("0.5"),
        }

        self.multiplier = Decimal(1)

    def test_skips_years_with_zero_time(self):
        num_data = {
            2025: Decimal(0),
            2026: Decimal(1),
        }

        result = calculate_staff_row(
            self.info,
            num_data,
            self.constants,
            self.project_duration,
            self.multiplier,
        )

        self.assertNotIn(2025, result["results"])
        self.assertIn(2026, result["results"])

    def test_skips_years_with_missing_time(self):
        num_data = {
            2026: Decimal(1),
        }

        result = calculate_staff_row(
            self.info,
            num_data,
            self.constants,
            self.project_duration,
            self.multiplier,
        )

        self.assertNotIn(2025, result["results"])
        self.assertIn(2026, result["results"])

    def test_fte_uses_project_year_fractions(self):
        num_data = {
            2025: Decimal(1),
            2026: Decimal(1),
        }

        result = calculate_staff_row(
            self.info,
            num_data,
            self.constants,
            self.project_duration,
            self.multiplier,
        )

        expected = calculate_staff_row(
            self.info,
            num_data,
            self.constants,
            {
                **self.project_duration,
                "first_year_fraction": Decimal(1),
                "last_year_fraction": Decimal(1),
            },
            self.multiplier,
        )

        self.assertLess(
            result["results"][2025],
            expected["results"][2025],
        )
        self.assertLess(
            result["results"][2026],
            expected["results"][2026],
        )

    def test_non_fte_uses_full_year_fraction(self):
        info = {
            **self.info,
            "time_basis": "Daily",
        }

        self.constants["salary_rate_multiplier"]["Daily"] = Decimal(1)

        num_data = {
            2025: Decimal(1),
            2026: Decimal(1),
        }

        result = calculate_staff_row(
            info,
            num_data,
            self.constants,
            self.project_duration,
            self.multiplier,
        )

        full_project_duration = {
            **self.project_duration,
            "first_year_fraction": Decimal(1),
            "last_year_fraction": Decimal(1),
        }

        expected = calculate_staff_row(
            {
                **self.info,
                "time_basis": "FTE",
            },
            num_data,
            self.constants,
            full_project_duration,
            self.multiplier,
        )

        self.assertEqual(result, expected)

    def test_returns_rate_results_and_total(self):
        num_data = {
            2025: Decimal(1),
        }

        result = calculate_staff_row(
            self.info,
            num_data,
            self.constants,
            self.project_duration,
            self.multiplier,
        )

        self.assertIn("rate_2025", result)
        self.assertIn("results", result)
        self.assertIn("total", result)
        self.assertEqual(result["total"], sum(result["results"].values()))


class TestCalculateColumnTotal(SimpleTestCase):
    def test_calculates_column_totals(self):
        data = {
            "row_1": {
                "results": {
                    2025: Decimal(100),
                    2026: Decimal(200),
                },
                "total": Decimal(300),
            },
            "row_2": {
                "results": {
                    2025: Decimal(50),
                    2026: Decimal(100),
                },
                "total": Decimal(150),
            },
        }

        result = calculate_column_total(data, 2025, 2026)

        self.assertEqual(
            result["column_total"]["results"][2025],
            Decimal(100) + Decimal(50),
        )
        self.assertEqual(
            result["column_total"]["results"][2026],
            Decimal(200) + Decimal(100),
        )
        self.assertEqual(
            result["column_total"]["total"],
            (Decimal(100) + Decimal(50)) + (Decimal(200) + Decimal(100)),
        )

    def test_missing_year_values_are_treated_as_zero(self):
        data = {
            "row_1": {
                "results": {
                    2025: Decimal(100),
                },
                "total": Decimal(100),
            },
            "row_2": {
                "results": {
                    2026: Decimal(50),
                },
                "total": Decimal(50),
            },
        }

        result = calculate_column_total(data, 2025, 2026)

        self.assertEqual(
            result["column_total"]["results"][2025],
            Decimal(100),
        )
        self.assertEqual(
            result["column_total"]["results"][2026],
            Decimal(50),
        )
        self.assertEqual(
            result["column_total"]["total"],
            Decimal(150),
        )

    def test_none_values_are_treated_as_zero(self):
        data = {
            "row_1": {
                "results": {
                    2025: None,
                },
                "total": Decimal(0),
            }
        }

        result = calculate_column_total(data, 2025, 2025)

        self.assertEqual(
            result["column_total"]["results"][2025],
            Decimal(0),
        )
        self.assertEqual(
            result["column_total"]["total"],
            Decimal(0),
        )

    def test_empty_data(self):
        result = calculate_column_total({}, 2025, 2026)

        self.assertEqual(
            result["column_total"]["results"],
            {
                2025: 0,
                2026: 0,
            },
        )
        self.assertEqual(result["column_total"]["total"], 0)


class TestCalculateStaffTable(SimpleTestCase):
    def setUp(self):
        self.constants = {
            "salary_rate": {
                ("Fortnight", "Academic", "Level A.1"): Decimal(60000),
            },
            "salary_rate_multiplier": {
                "FTE": Decimal(1),
            },
            "eba": {
                2025: Decimal(1),
            },
            "on_cost_components": {
                "superannuation": {
                    "Continuing": {
                        None: Decimal("0.11"),
                    }
                },
                "leave_loading": {
                    "Continuing": {
                        None: Decimal("0.10"),
                    }
                },
                "workcover": {
                    "Continuing": {
                        None: Decimal("0.02"),
                    }
                },
                "long_service_leave": {
                    "Continuing": {
                        None: Decimal("0.01"),
                    }
                },
                "parental_leave": {
                    "Continuing": {
                        None: Decimal("0.01"),
                    }
                },
                "annual_leave_provision": {
                    "Continuing": {
                        None: Decimal("0.02"),
                    }
                },
            },
            "constants": {
                "max_leave_loading": Decimal(10000),
                "max_payroll_tax": Decimal("0.05"),
                "override_uom_oncosts": Decimal("0.01"),
            },
        }

        self.table_data = {
            "info_table": {
                "row_1": {
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level A.1",
                    "time_basis": "FTE",
                    "in_kind": False,
                },
                "row_2": {
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level A.1",
                    "time_basis": "FTE",
                    "in_kind": True,
                },
            },
            "numeric_table": {
                "row_1": {
                    2025: Decimal(1),
                },
                "row_2": {
                    2025: Decimal(1),
                },
            },
        }

    def test_separates_normal_and_in_kind_costs(self):
        result = calculate_staff_table(
            self.table_data,
            self.constants,
            2025,
            1,
            2025,
            12,
            Decimal(1),
            Decimal(2),
        )

        self.assertIn("row_1", result["cost_results"])
        self.assertNotIn("row_2", result["cost_results"])

        self.assertIn("row_2", result["in_kind_cost_results"])
        self.assertNotIn("row_1", result["in_kind_cost_results"])

    def test_uses_different_multiplier_for_in_kind_costs(self):
        result = calculate_staff_table(
            self.table_data,
            self.constants,
            2025,
            1,
            2025,
            12,
            Decimal(1),
            Decimal(2),
        )

        normal_cost = result["cost_results"]["row_1"]["total"]
        in_kind_cost = result["in_kind_cost_results"]["row_2"]["total"]

        self.assertEqual(
            in_kind_cost,
            normal_cost * Decimal(2),
        )

    def test_adds_column_total(self):
        result = calculate_staff_table(
            self.table_data,
            self.constants,
            2025,
            1,
            2025,
            12,
            Decimal(1),
            Decimal(2),
        )

        normal_rows = result["cost_results"]
        in_kind_rows = result["in_kind_cost_results"]

        self.assertIn("column_total", normal_rows)
        self.assertIn("column_total", in_kind_rows)

        self.assertEqual(
            normal_rows["column_total"]["total"],
            normal_rows["row_1"]["total"],
        )
        self.assertEqual(
            in_kind_rows["column_total"]["total"],
            in_kind_rows["row_2"]["total"],
        )

    def test_returns_expected_result_structure(self):
        result = calculate_staff_table(
            self.table_data,
            self.constants,
            2025,
            1,
            2025,
            12,
            Decimal(1),
            Decimal(2),
        )

        self.assertIn("cost_results", result)
        self.assertIn("in_kind_cost_results", result)
        self.assertIn("column_total", result["cost_results"])
        self.assertIn("column_total", result["in_kind_cost_results"])
