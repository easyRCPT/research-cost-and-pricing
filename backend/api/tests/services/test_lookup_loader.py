from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase

from api.models import (
    Budget,
    CalculationConstant,
    EbaIncrease,
    LookupConfiguration,
    LookupVersion,
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


class TestGetVersionedLookupModels(SimpleTestCase):
    @patch("api.services.lookup_loader.CalculationConstant.objects")
    @patch("api.services.lookup_loader.OnCostRate.objects")
    @patch("api.services.lookup_loader.EbaIncrease.objects")
    @patch("api.services.lookup_loader.SalaryRateMultiplier.objects")
    @patch("api.services.lookup_loader.SalaryRate.objects")
    def test_returns_versioned_lookup_querysets(
        self,
        mock_salary_rate_objects,
        mock_multiplier_objects,
        mock_eba_objects,
        mock_on_cost_objects,
        mock_constant_objects,
    ):
        version_id = 7

        salary_rates = Mock()
        mock_salary_rate_objects.filter.return_value.order_by.return_value = (
            salary_rates
        )

        multipliers = Mock()
        mock_multiplier_objects.filter.return_value.order_by.return_value = multipliers

        eba_increases = Mock()
        mock_eba_objects.filter.return_value.order_by.return_value = eba_increases

        on_cost_rates = Mock()
        mock_on_cost_objects.filter.return_value.order_by.return_value = on_cost_rates

        constants = Mock()
        mock_constant_objects.filter.return_value.order_by.return_value = constants

        result = lookup_loader._get_versioned_lookup_models(version_id)

        self.assertEqual(
            result,
            {
                lookup_loader.LookupTable.SALARY_RATES: salary_rates,
                lookup_loader.LookupTable.SALARY_RATE_MULTIPLIERS: multipliers,
                lookup_loader.LookupTable.EBA_INCREASES: eba_increases,
                lookup_loader.LookupTable.ON_COST_RATES: on_cost_rates,
                lookup_loader.LookupTable.CALCULATION_CONSTANTS: constants,
            },
        )

        mock_salary_rate_objects.filter.assert_called_once_with(
            version_id=version_id,
        )
        mock_salary_rate_objects.filter.return_value.order_by.assert_called_once_with(
            "payroll_type",
            "category",
            "classification",
        )

        mock_multiplier_objects.filter.assert_called_once_with(
            version_id=version_id,
        )
        mock_multiplier_objects.filter.return_value.order_by.assert_called_once_with(
            "time_basis",
        )

        mock_eba_objects.filter.assert_called_once_with(
            version_id=version_id,
        )
        mock_eba_objects.filter.return_value.order_by.assert_called_once_with(
            "year",
        )

        mock_on_cost_objects.filter.assert_called_once_with(
            version_id=version_id,
        )
        mock_on_cost_objects.filter.return_value.order_by.assert_called_once_with(
            "on_cost_type",
            "employment_type",
            "year",
        )

        mock_constant_objects.filter.assert_called_once_with(
            version_id=version_id,
        )
        mock_constant_objects.filter.return_value.order_by.assert_called_once_with(
            "name",
        )


class TestGetLookupModels(SimpleTestCase):
    @patch("api.services.lookup_loader._get_versioned_lookup_models")
    @patch("api.services.lookup_loader._get_unversioned_lookup_models")
    def test_combines_unversioned_and_versioned_lookup_models(
        self,
        mock_get_unversioned,
        mock_get_versioned,
    ):
        version_id = 7

        department_queryset = Mock()
        department_rows = ["department"]
        department_queryset.all.return_value = department_rows

        salary_rate_queryset = Mock()
        salary_rate_rows = ["salary_rate"]
        salary_rate_queryset.all.return_value = salary_rate_rows

        mock_get_unversioned.return_value = {
            lookup_loader.LookupTable.DEPARTMENTS: department_queryset,
        }

        mock_get_versioned.return_value = {
            lookup_loader.LookupTable.SALARY_RATES: salary_rate_queryset,
        }

        result = lookup_loader._get_lookup_models(version_id)

        self.assertEqual(
            result,
            {
                "departments": department_rows,
                "salary_rates": salary_rate_rows,
            },
        )

        mock_get_unversioned.assert_called_once_with()
        mock_get_versioned.assert_called_once_with(version_id)

        department_queryset.all.assert_called_once_with()
        salary_rate_queryset.all.assert_called_once_with()


class TestGetLookupTables(SimpleTestCase):
    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader.LookupConfiguration.objects.get")
    @patch("api.services.lookup_loader._get_lookup_models")
    def test_loads_lookup_tables_when_cache_is_empty(
        self,
        mock_get_lookup_models,
        mock_config_get,
        mock_cache_set,
    ):
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

        self.constant_5 = Mock(spec=CalculationConstant)
        self.constant_5.name = "default_margin"
        self.constant_5.value = Decimal("0.30")

        self.constant_6 = Mock(spec=CalculationConstant)
        self.constant_6.name = "minimum_margin"
        self.constant_6.value = Decimal("0.00")

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
                self.constant_5,
                self.constant_6,
            ],
        }

    def _mock_querysets(self, tables):
        return {
            lookup_loader.LookupTable.SALARY_RATES: self._mock_queryset(
                tables["salary_rates"]
            ),
            lookup_loader.LookupTable.SALARY_RATE_MULTIPLIERS: self._mock_queryset(
                tables["salary_rate_multipliers"]
            ),
            lookup_loader.LookupTable.EBA_INCREASES: self._mock_queryset(
                tables["eba_increases"]
            ),
            lookup_loader.LookupTable.ON_COST_RATES: self._mock_queryset(
                tables["on_cost_rates"]
            ),
            lookup_loader.LookupTable.CALCULATION_CONSTANTS: self._mock_queryset(
                tables["calculation_constants"]
            ),
        }

    @staticmethod
    def _mock_queryset(rows):
        queryset = Mock()
        queryset.all.return_value = rows
        return queryset

    @patch("api.services.lookup_loader.cache.set")
    @patch("api.services.lookup_loader._get_versioned_lookup_models")
    def test_converts_lookup_tables_to_constants(
        self,
        mock_get_versioned_lookup_models,
        mock_cache_set,
    ):
        tables = self._build_tables()
        mock_get_versioned_lookup_models.return_value = self._mock_querysets(tables)

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
                "default_margin": Decimal("0.30"),
                "minimum_margin": Decimal("0.00"),
            },
        )

        mock_get_versioned_lookup_models.assert_called_once_with(3)
        mock_cache_set.assert_called_once_with(
            "lookup_version_3",
            result,
            CACHE_TIMEOUT,
        )

    @patch("api.services.lookup_loader._get_versioned_lookup_models")
    @patch("api.services.lookup_loader.cache.get")
    def test_returns_cached_constants_without_loading_tables(
        self,
        mock_cache_get,
        mock_get_versioned_lookup_models,
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
        mock_get_versioned_lookup_models.assert_not_called()

    @patch("api.services.lookup_loader._get_versioned_lookup_models")
    def test_raises_error_when_on_cost_default_rate_is_missing(
        self,
        mock_get_versioned_lookup_models,
    ):
        on_cost = Mock(spec=OnCostRate)
        on_cost.on_cost_type = "superannuation"
        on_cost.employment_type = "Continuing"
        on_cost.year = 2026
        on_cost.rate = Decimal("0.13")

        tables = self._build_tables()
        tables["on_cost_rates"] = [on_cost]

        mock_get_versioned_lookup_models.return_value = self._mock_querysets(tables)

        with self.assertRaisesRegex(
            ValueError,
            "Missing default rate for superannuation and Continuing",
        ):
            get_constants(3)

    @patch("api.services.lookup_loader._get_versioned_lookup_models")
    def test_raises_error_when_required_constant_is_missing(
        self,
        mock_get_versioned_lookup_models,
    ):
        tables = self._build_tables()
        tables["calculation_constants"] = [
            self.constant_1,
            self.constant_2,
            self.constant_3,
            self.constant_5,
            self.constant_6,
        ]

        mock_get_versioned_lookup_models.return_value = self._mock_querysets(tables)

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
            "default_margin,gst_rate,minimum_margin,override_uom_oncosts",
        ):
            validate_constants(constants)


class TestInvalidateLookupCache(TestCase):
    def setUp(self):
        self.version = LookupVersion.objects.create()
        LookupConfiguration.objects.create(
            current_version=self.version,
        )

    @patch("api.services.lookup_loader.cache.delete")
    def test_deletes_lookup_caches(self, mock_cache_delete):
        invalidate_lookup_cache()

        mock_cache_delete.assert_any_call(MODELS_CACHE_KEY)
        mock_cache_delete.assert_any_call(
            lookup_loader._constants_cache_key(self.version.id),
        )
        self.assertEqual(mock_cache_delete.call_count, 2)
