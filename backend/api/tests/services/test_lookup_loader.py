from decimal import Decimal
from unittest.mock import Mock, patch

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase

from api.models import (
    Budget,
    CalculationConstant,
    Currency,
    EbaIncrease,
    LookupConfiguration,
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
)
from api.services import lookup_loader
from api.services.lookup_loader import (
    CACHE_TIMEOUT,
    MODELS_CACHE_KEY,
    constants_for,
    get_constants,
    get_lookup_tables,
    invalidate_lookup_cache,
    validate_constants,
)


class TestGetVersionedLookupQuerySets(SimpleTestCase):
    @patch("api.services.lookup_loader.LOOKUP_DEFINITIONS")
    def test_returns_versioned_lookup_querysets(
        self,
        mock_lookup_definitions,
    ):
        version_id = 7

        salary_rates = Mock()
        multipliers = Mock()
        eba_increases = Mock()
        on_cost_rates = Mock()
        constants = Mock()

        def definition(model, order_by):
            item = Mock()
            item.versioned = True
            item.model = model
            item.order_by = order_by
            return item

        salary_model = Mock()
        salary_model.objects.filter.return_value.order_by.return_value = salary_rates

        multiplier_model = Mock()
        multiplier_model.objects.filter.return_value.order_by.return_value = multipliers

        eba_model = Mock()
        eba_model.objects.filter.return_value.order_by.return_value = eba_increases

        on_cost_model = Mock()
        on_cost_model.objects.filter.return_value.order_by.return_value = on_cost_rates

        constant_model = Mock()
        constant_model.objects.filter.return_value.order_by.return_value = constants

        mock_lookup_definitions.items.return_value = [
            (
                "salary_rates",
                definition(
                    salary_model,
                    ("payroll_type", "category", "classification"),
                ),
            ),
            (
                "salary_rate_multipliers",
                definition(
                    multiplier_model,
                    ("time_basis",),
                ),
            ),
            (
                "eba_increases",
                definition(
                    eba_model,
                    ("year",),
                ),
            ),
            (
                "on_cost_rates",
                definition(
                    on_cost_model,
                    (
                        "on_cost_type",
                        "employment_type",
                        "year",
                    ),
                ),
            ),
            (
                "calculation_constants",
                definition(
                    constant_model,
                    ("name",),
                ),
            ),
        ]

        result = lookup_loader._get_versioned_lookup_querysets(version_id)

        self.assertIs(
            result["salary_rates"],
            salary_rates,
        )
        self.assertIs(
            result["salary_rate_multipliers"],
            multipliers,
        )
        self.assertIs(
            result["eba_increases"],
            eba_increases,
        )
        self.assertIs(
            result["on_cost_rates"],
            on_cost_rates,
        )
        self.assertIs(
            result["calculation_constants"],
            constants,
        )


class TestGetLookupTables(SimpleTestCase):
    @patch("api.services.lookup_loader.cache.get")
    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader.LookupConfiguration.objects.get")
    @patch("api.services.lookup_loader._get_lookup_models")
    def test_loads_lookup_tables_when_cache_is_empty(
        self,
        mock_get_lookup_models,
        mock_config_get,
        mock_cache_set,
        mock_cache_get,
    ):
        mock_cache_get.return_value = None

        config = Mock()
        config.current_version_id = 3
        mock_config_get.return_value = config

        lookup_models = {
            "departments": ["department"],
            "salary_rates": ["salary_rate"],
        }
        mock_get_lookup_models.return_value = lookup_models

        result = get_lookup_tables()

        self.assertEqual(result, lookup_models)

        mock_config_get.assert_called_once_with()
        mock_get_lookup_models.assert_called_once_with(3)
        mock_cache_set.assert_called_once_with(
            MODELS_CACHE_KEY,
            lookup_models,
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
        mock_cache_get.assert_called_once_with(MODELS_CACHE_KEY)
        mock_cache_set.assert_not_called()


class TestGetConstants(SimpleTestCase):
    def setUp(self):
        # The cache outlives every other test's rolled-back database, so a
        # version priced elsewhere in this process could answer from it.
        cache.clear()
        self.addCleanup(cache.clear)
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

        self.currency = Mock(spec=Currency)
        self.currency.code = "USD"
        self.currency.rate = Decimal("0.70285")

        self.eba = Mock(spec=EbaIncrease)
        self.eba.year = 2026
        self.eba.rate = Decimal("0.03")

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

        self.constant_5 = Mock(spec=CalculationConstant)
        self.constant_5.name = "default_margin"
        self.constant_5.value = Decimal("0.30")

        self.constant_6 = Mock(spec=CalculationConstant)
        self.constant_6.name = "minimum_margin"
        self.constant_6.value = Decimal("0.00")

        self.constant_7 = Mock(spec=CalculationConstant)
        self.constant_7.name = "salary_rate_year"
        self.constant_7.value = Decimal(2025)

        self.constant_8 = Mock(spec=CalculationConstant)
        self.constant_8.name = "full_cost_recovery_multiplier"
        self.constant_8.value = Decimal("1.70")

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
            "currencies": [self.currency],
            "calculation_constants": [
                self.constant_1,
                self.constant_2,
                self.constant_3,
                self.constant_4,
                self.constant_5,
                self.constant_6,
                self.constant_7,
                self.constant_8,
            ],
        }

    @staticmethod
    def _mock_querysets(tables):
        return tables

    @staticmethod
    def _mock_queryset(rows):
        return rows

    @patch("api.services.lookup_loader.cache.get")
    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader._get_versioned_lookup_querysets")
    def test_converts_lookup_tables_to_constants(
        self,
        mock_get_versioned_lookup_querysets,
        mock_cache_set,
        mock_cache_get,
    ):
        mock_cache_get.return_value = None

        tables = self._build_tables()
        mock_get_versioned_lookup_querysets.return_value = self._mock_querysets(tables)

        result = get_constants(3)

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
                2026: Decimal("0.03"),
            },
        )

        # AUD is the base at 1, whether or not the version holds a row for it.
        self.assertEqual(
            result["currencies"],
            {"AUD": Decimal(1), "USD": Decimal("0.70285")},
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
                "default_margin": Decimal("0.30"),
                "minimum_margin": Decimal("0.00"),
                "salary_rate_year": Decimal(2025),
                "full_cost_recovery_multiplier": Decimal("1.70"),
            },
        )

        mock_get_versioned_lookup_querysets.assert_called_once_with(3)
        mock_cache_set.assert_called_once_with(
            "lookup_version_3",
            result,
            CACHE_TIMEOUT,
        )

    @patch("api.services.lookup_loader._get_versioned_lookup_querysets")
    @patch("api.services.lookup_loader.cache.get")
    def test_returns_cached_constants_without_loading_tables(
        self,
        mock_cache_get,
        mock_get_versioned_lookup_querysets,
    ):
        cached_constants = {
            "salary_rate": {},
            "salary_rate_multiplier": {},
            "eba": {},
            "on_cost_components": {},
            "constants": {},
        }

        mock_cache_get.return_value = cached_constants

        result = get_constants(3)

        self.assertEqual(result, cached_constants)
        mock_cache_get.assert_called_once_with("lookup_version_3")
        mock_get_versioned_lookup_querysets.assert_not_called()

    @patch("api.services.lookup_loader._get_versioned_lookup_querysets")
    def test_raises_error_when_on_cost_default_rate_is_missing(
        self,
        mock_get_versioned_lookup_querysets,
    ):
        on_cost = Mock(spec=OnCostRate)
        on_cost.on_cost_type = "superannuation"
        on_cost.employment_type = "Continuing"
        on_cost.year = 2026
        on_cost.rate = Decimal("0.13")

        tables = self._build_tables()
        tables["on_cost_rates"] = [on_cost]

        mock_get_versioned_lookup_querysets.return_value = self._mock_querysets(tables)

        with self.assertRaisesRegex(
            ValueError,
            "Missing default rate for superannuation and Continuing",
        ):
            get_constants(3)

    @patch("api.services.lookup_loader._get_versioned_lookup_querysets")
    def test_raises_error_when_required_constant_is_missing(
        self,
        mock_get_versioned_lookup_querysets,
    ):
        tables = self._build_tables()
        tables["calculation_constants"] = [
            self.constant_1,
            self.constant_2,
            self.constant_3,
            self.constant_5,
            self.constant_6,
            self.constant_8,
        ]

        mock_get_versioned_lookup_querysets.return_value = self._mock_querysets(tables)

        with self.assertRaisesRegex(
            KeyError,
            "Missing required calculation constants: gst_rate",
        ):
            get_constants(3)


class TestConstantsFor(SimpleTestCase):
    @patch("api.services.lookup_loader.get_constants")
    def test_uses_budget_lookup_version(self, mock_get_constants):
        budget = Mock(spec=Budget)
        budget.lookup_version_id = 7

        expected = {
            "constants": {
                "gst_rate": Decimal("0.10"),
            },
        }
        mock_get_constants.return_value = expected

        result = constants_for(budget)

        self.assertEqual(result, expected)
        mock_get_constants.assert_called_once_with(7)


class TestValidateConstants(SimpleTestCase):
    def test_passes_when_all_required_constants_exist(self):
        constants = {
            "max_leave_loading": Decimal(10000),
            "max_payroll_tax": Decimal("0.05"),
            "override_uom_oncosts": Decimal("0.01"),
            "gst_rate": Decimal("0.10"),
            "default_margin": Decimal("0.30"),
            "minimum_margin": Decimal("0.00"),
            "salary_rate_year": Decimal(2025),
            "full_cost_recovery_multiplier": Decimal("1.70"),
        }

        validate_constants(constants)

    def test_raises_error_for_missing_constants(self):
        constants = {
            "max_leave_loading": Decimal(10000),
            "max_payroll_tax": Decimal("0.05"),
        }

        with self.assertRaisesRegex(
            KeyError,
            "Missing required calculation constants: "
            "default_margin,full_cost_recovery_multiplier,gst_rate,minimum_margin,"
            "override_uom_oncosts,salary_rate_year",
        ):
            validate_constants(constants)


class TestInvalidateLookupCache(TestCase):
    def setUp(self):
        # The singleton comes from the lookup versioning migration.
        self.version = LookupConfiguration.objects.get().current_version

    @patch("api.services.lookup_loader.cache.delete")
    def test_deletes_lookup_caches(self, mock_cache_delete):
        invalidate_lookup_cache()

        mock_cache_delete.assert_any_call(MODELS_CACHE_KEY)
        mock_cache_delete.assert_any_call(
            lookup_loader._constants_cache_key(self.version.id),
        )
        self.assertEqual(mock_cache_delete.call_count, 2)
