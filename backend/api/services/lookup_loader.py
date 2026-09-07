from typing import cast

from django.core.cache import cache
from django.db import models
from django.db.models import QuerySet

from ..models import (
    Activity,
    CalculationConstant,
    DeliverableType,
    Department,
    EbaIncrease,
    IncrementCap,
    MinimumCostRecoveryMultiplier,
    NonStaffCostCategory,
    OnCostRate,
    Region,
    RevenueCategory,
    SalaryRate,
    SalaryRateMultiplier,
)

CACHE_KEY = "lookup_models"
CONSTANTS_CACHE_KEY = "lookup_constants"
CACHE_TIMEOUT = 3600

REQUIRED_CONSTANTS = {
    "max_leave_loading",
    "max_payroll_tax",
    "override_uom_oncosts",
    "gst_rate",
}


class LookupTable(models.TextChoices):
    DEPARTMENTS = "departments"
    SALARY_RATES = "salary_rates"
    SALARY_RATE_MULTIPLIERS = "salary_rate_multipliers"
    INCREMENT_CAPS = "increment_caps"
    EBA_INCREASES = "eba_increases"
    ON_COST_RATES = "on_cost_rates"
    NON_STAFF_COST_CATEGORIES = "non_staff_cost_categories"
    MINIMUM_COST_RECOVERY_MULTIPLIERS = "minimum_cost_recovery_multipliers"
    CALCULATION_CONSTANTS = "calculation_constants"
    ACTIVITIES = "activities"
    REGIONS = "regions"
    DELIVERABLE_TYPES = "deliverable_types"
    REVENUE_CATEGORIES = "revenue_categories"


# Every table's rows, in a stable order. The keys are the response's keys.
LOOKUP_TABLES: dict[LookupTable, QuerySet] = {
    LookupTable.DEPARTMENTS: Department.objects.order_by("code"),
    LookupTable.SALARY_RATES: SalaryRate.objects.order_by(
        "payroll_type", "category", "classification"
    ),
    LookupTable.SALARY_RATE_MULTIPLIERS: SalaryRateMultiplier.objects.order_by(
        "time_basis"
    ),
    LookupTable.INCREMENT_CAPS: IncrementCap.objects.order_by("level"),
    LookupTable.EBA_INCREASES: EbaIncrease.objects.order_by("year"),
    LookupTable.ON_COST_RATES: OnCostRate.objects.order_by(
        "on_cost_type", "employment_type", "year"
    ),
    LookupTable.NON_STAFF_COST_CATEGORIES: NonStaffCostCategory.objects.order_by(
        "cost_category", "cost_subcategory"
    ),
    LookupTable.MINIMUM_COST_RECOVERY_MULTIPLIERS: (
        MinimumCostRecoveryMultiplier.objects.order_by("year")
    ),
    LookupTable.CALCULATION_CONSTANTS: CalculationConstant.objects.order_by("name"),
    LookupTable.ACTIVITIES: Activity.objects.order_by("code"),
    LookupTable.REGIONS: Region.objects.order_by("code"),
    LookupTable.DELIVERABLE_TYPES: DeliverableType.objects.order_by("code"),
    LookupTable.REVENUE_CATEGORIES: RevenueCategory.objects.order_by(
        "budget_ledger_id"
    ),
}


def get_lookup_tables() -> dict[str, list[models.Model]]:
    """
    Return all lookup table rows keyed by table name.
    Results are cached for CACHE_TIMEOUT seconds.
    """
    tables = cache.get(CACHE_KEY)
    if tables is None:
        # .all() clones the module-level queryset; evaluating it directly would pin
        # the first result set to the module for the life of the process.
        tables = {
            table.value: list(queryset.all())
            for table, queryset in LOOKUP_TABLES.items()
        }
        cache.set(CACHE_KEY, tables, CACHE_TIMEOUT)
    return tables


def get_constants() -> dict:
    """
    Get lookup tables from cache and convert them into calculation dictionaries.
    The converted result is cached for CACHE_TIMEOUT seconds.
    """
    constants = cache.get(CONSTANTS_CACHE_KEY)

    if constants is not None:
        return constants

    tables = get_lookup_tables()

    # get_lookup_tables() returns generic Model types,
    # but the type of each table is fixed by LOOKUP_TABLES.
    salary_rates = cast(
        list[SalaryRate],
        tables["salary_rates"],
    )
    salary_rate = {
        (
            row.payroll_type,
            row.category,
            row.classification,
        ): row.rate
        for row in salary_rates
    }

    salary_rate_multipliers = cast(
        list[SalaryRateMultiplier],
        tables["salary_rate_multipliers"],
    )
    salary_rate_multiplier = {
        row.time_basis: row.multiplier for row in salary_rate_multipliers
    }

    eba_increases = cast(
        list[EbaIncrease],
        tables["eba_increases"],
    )
    eba_multiplier = {row.year: row.multiplier for row in eba_increases}

    on_cost_rates = cast(
        list[OnCostRate],
        tables["on_cost_rates"],
    )
    on_cost_components = {}

    # Structure: employment_type -> year -> on_cost_type -> rate
    for row in on_cost_rates:
        on_cost_components.setdefault(row.on_cost_type, {}).setdefault(
            row.employment_type, {}
        )[row.year] = row.rate

    # Check that each on-cost type has a default rate
    for on_cost_type, employment_rates in on_cost_components.items():
        for employment_type, year_rates in employment_rates.items():
            if None not in year_rates:
                raise ValueError(
                    f"Missing default rate for {on_cost_type} and {employment_type}"
                )

    calculation_constants = cast(
        list[CalculationConstant],
        tables["calculation_constants"],
    )
    constants = {row.name: row.value for row in calculation_constants}

    validate_constants(constants)

    result = {
        "salary_rate": salary_rate,
        "salary_rate_multiplier": salary_rate_multiplier,
        "eba": eba_multiplier,
        "on_cost_components": on_cost_components,
        "constants": constants,
    }

    cache.set(CONSTANTS_CACHE_KEY, result, CACHE_TIMEOUT)

    return result


def validate_constants(constants: dict) -> None:
    missing = REQUIRED_CONSTANTS - constants.keys()
    if missing:
        raise KeyError(
            f"Missing required calculation constants: {','.join(sorted(missing))}"
        )


def invalidate_lookup_cache() -> None:
    """
    Refresh the cache after an administrator modifies Lookup table data.
    """
    cache.delete(CACHE_KEY)
    cache.delete(CONSTANTS_CACHE_KEY)
