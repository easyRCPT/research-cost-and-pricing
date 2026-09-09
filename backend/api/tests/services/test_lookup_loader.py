from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from api.models import (
    CalculationConstant,
    EbaIncrease,
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
)
from api.services import lookup_loader
from api.services.lookup_loader import (
    CACHE_KEY,
    CACHE_TIMEOUT,
    CONSTANTS_CACHE_KEY,
    get_constants,
    get_lookup_tables,
    invalidate_lookup_cache,
    validate_constants,
)


class TestGetLookupTables(SimpleTestCase):
    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader.LOOKUP_TABLES")
    def test_loads_lookup_tables_when_cache_is_empty(
        self,
        mock_tables,
        mock_cache_set,
    ):
        queryset = Mock()
        rows = ["row1", "row2"]
        queryset.all.return_value = rows

        mock_tables.items.return_value = [
            (
                lookup_loader.LookupTable.DEPARTMENTS,
                queryset,
            ),
        ]

        result = get_lookup_tables()

        self.assertEqual(
            result,
            {
                "departments": rows,
            },
        )

        queryset.all.assert_called_once()
        mock_cache_set.assert_called_once_with(
            CACHE_KEY,
            result,
            CACHE_TIMEOUT,
        )

    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader.cache.get")
    def test_returns_cached_lookup_tables(
        self,
        mock_cache_get,
        mock_cache_set,
    ):
        cached_tables = {
            "departments": ["department"],
        }

        mock_cache_get.return_value = cached_tables

        result = get_lookup_tables()

        self.assertEqual(result, cached_tables)
        mock_cache_get.assert_called_once_with(CACHE_KEY)
        mock_cache_set.assert_not_called()


class TestGetConstants(SimpleTestCase):
    def setUp(self):
        self.salary_rate_1 = Mock(spec=SalaryRate)
        self.salary_rate_1.payroll_type = "Fortnight"
        self.salary_rate_1.category = "Academic"
        self.salary_rate_1.classification = "Level A.1"
        self.salary_rate_1.rate = Decimal(60000)

        self.salary_rate_2 = Mock(spec=SalaryRate)
        self.salary_rate_2.payroll_type = "Casual"
        self.salary_rate_2.category = "Academic"
        self.salary_rate_2.classification = "RA Grade 1.1"
        self.salary_rate_2.rate = Decimal(50000)

        self.multiplier = Mock(spec=SalaryRateMultiplier)
        self.multiplier.time_basis = "FTE"
        self.multiplier.multiplier = Decimal(1)

        self.eba = Mock(spec=EbaIncrease)
        self.eba.year = 2026
        self.eba.multiplier = Decimal("1.03")

        self.on_cost_1 = Mock(spec=OnCostRate)
        self.on_cost_1.on_cost_type = "superannuation"
        self.on_cost_1.employment_type = "Continuing"
        self.on_cost_1.year = None
        self.on_cost_1.rate = Decimal("0.12")

        self.on_cost_2 = Mock(spec=OnCostRate)
        self.on_cost_2.on_cost_type = "superannuation"
        self.on_cost_2.employment_type = "Continuing"
        self.on_cost_2.year = 2026
        self.on_cost_2.rate = Decimal("0.13")

        self.constant_1 = Mock(spec=CalculationConstant)
        self.constant_1.name = "max_leave_loading"
        self.constant_1.value = Decimal(10000)

        self.constant_2 = Mock(spec=CalculationConstant)
        self.constant_2.name = "max_payroll_tax"
        self.constant_2.value = Decimal("0.05")

        self.constant_3 = Mock(spec=CalculationConstant)
        self.constant_3.name = "override_uom_oncosts"
        self.constant_3.value = Decimal("0.01")

        self.constant_4 = Mock(spec=CalculationConstant)
        self.constant_4.name = "gst_rate"
        self.constant_4.value = Decimal("0.10")

    def _build_tables(self):
        return {
            "salary_rates": [
                self.salary_rate_1,
                self.salary_rate_2,
            ],
            "salary_rate_multipliers": [
                self.multiplier,
            ],
            "eba_increases": [
                self.eba,
            ],
            "on_cost_rates": [
                self.on_cost_1,
                self.on_cost_2,
            ],
            "calculation_constants": [
                self.constant_1,
                self.constant_2,
                self.constant_3,
                self.constant_4,
            ],
        }

    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader.get_lookup_tables")
    def test_converts_lookup_tables_to_constants(
        self,
        mock_get_tables,
        mock_cache_set,
    ):
        mock_get_tables.return_value = self._build_tables()

        result = get_constants()

        self.assertEqual(
            result["salary_rate"],
            {
                (
                    "Fortnight",
                    "Academic",
                    "Level A.1",
                ): Decimal(60000),
                (
                    "Casual",
                    "Academic",
                    "RA Grade 1.1",
                ): Decimal(50000),
            },
        )

        self.assertEqual(
            result["salary_rate_multiplier"],
            {
                "FTE": Decimal(1),
            },
        )

        self.assertEqual(
            result["eba"],
            {
                2026: Decimal("1.03"),
            },
        )

        self.assertEqual(
            result["on_cost_components"],
            {
                "superannuation": {
                    "Continuing": {
                        None: Decimal("0.12"),
                        2026: Decimal("0.13"),
                    },
                },
            },
        )

        self.assertEqual(
            result["constants"],
            {
                "max_leave_loading": Decimal(10000),
                "max_payroll_tax": Decimal("0.05"),
                "override_uom_oncosts": Decimal("0.01"),
                "gst_rate": Decimal("0.10"),
            },
        )

        mock_cache_set.assert_called_once_with(
            CONSTANTS_CACHE_KEY,
            result,
            CACHE_TIMEOUT,
        )

    @patch("api.services.lookup_loader.get_lookup_tables")
    @patch("api.services.lookup_loader.cache.get")
    def test_returns_cached_constants_without_loading_tables(
        self,
        mock_cache_get,
        mock_get_tables,
    ):
        cached_constants = {
            "salary_rate": {},
            "salary_rate_multiplier": {},
            "eba": {},
            "on_cost_components": {},
            "constants": {},
        }

        mock_cache_get.return_value = cached_constants

        result = get_constants()

        self.assertEqual(result, cached_constants)
        mock_cache_get.assert_called_once_with(CONSTANTS_CACHE_KEY)
        mock_get_tables.assert_not_called()

    @patch("api.services.lookup_loader.get_lookup_tables")
    def test_raises_error_when_on_cost_default_rate_is_missing(
        self,
        mock_get_tables,
    ):
        on_cost = Mock(spec=OnCostRate)
        on_cost.on_cost_type = "superannuation"
        on_cost.employment_type = "Continuing"
        on_cost.year = 2026
        on_cost.rate = Decimal("0.13")

        tables = self._build_tables()
        tables["on_cost_rates"] = [on_cost]

        mock_get_tables.return_value = tables

        with self.assertRaisesRegex(
            ValueError,
            "Missing default rate for superannuation and Continuing",
        ):
            get_constants()

    @patch("api.services.lookup_loader.get_lookup_tables")
    def test_raises_error_when_required_constant_is_missing(
        self,
        mock_get_tables,
    ):
        tables = self._build_tables()
        tables["calculation_constants"] = [
            self.constant_1,
            self.constant_2,
            self.constant_3,
        ]

        mock_get_tables.return_value = tables

        with self.assertRaisesRegex(
            KeyError,
            "Missing required calculation constants: gst_rate",
        ):
            get_constants()


class TestValidateConstants(SimpleTestCase):
    def test_passes_when_all_required_constants_exist(self):
        constants = {
            "max_leave_loading": Decimal(10000),
            "max_payroll_tax": Decimal("0.05"),
            "override_uom_oncosts": Decimal("0.01"),
            "gst_rate": Decimal("0.10"),
        }

        validate_constants(constants)

    def test_raises_error_for_missing_constants(self):
        constants = {
            "max_leave_loading": Decimal(10000),
            "max_payroll_tax": Decimal("0.05"),
        }

        with self.assertRaisesRegex(
            KeyError,
            "Missing required calculation constants: gst_rate,override_uom_oncosts",
        ):
            validate_constants(constants)


class TestInvalidateLookupCache(SimpleTestCase):
    @patch("api.services.lookup_loader.cache.delete")
    def test_deletes_lookup_caches(self, mock_cache_delete):
        invalidate_lookup_cache()

        self.assertEqual(mock_cache_delete.call_count, 2)
        mock_cache_delete.assert_any_call(CACHE_KEY)
        mock_cache_delete.assert_any_call(CONSTANTS_CACHE_KEY)
