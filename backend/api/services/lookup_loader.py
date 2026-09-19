from typing import cast

from django.core.cache import cache
from django.db import models
from django.db.models import QuerySet

from ..models import (
    Activity,
    Budget,
    CalculationConstant,
    DeliverableType,
    Department,
    EbaIncrease,
    IncrementCap,
    LookupConfiguration,
    NonStaffCostCategory,
    OnCostRate,
    Region,
    RevenueCategory,
    SalaryRate,
    SalaryRateMultiplier,
)

MODELS_CACHE_KEY = "lookup_models"
CACHE_TIMEOUT = 3600

REQUIRED_CONSTANTS = {
    "max_leave_loading",
    "max_payroll_tax",
    "override_uom_oncosts",
    "gst_rate",
    "default_margin",
    "minimum_margin",
}


class LookupTable(models.TextChoices):
    DEPARTMENTS = "departments"
    SALARY_RATES = "salary_rates"
    SALARY_RATE_MULTIPLIERS = "salary_rate_multipliers"
    INCREMENT_CAPS = "increment_caps"
    EBA_INCREASES = "eba_increases"
    ON_COST_RATES = "on_cost_rates"
    NON_STAFF_COST_CATEGORIES = "non_staff_cost_categories"
    CALCULATION_CONSTANTS = "calculation_constants"
    ACTIVITIES = "activities"
    REGIONS = "regions"
    DELIVERABLE_TYPES = "deliverable_types"
    REVENUE_CATEGORIES = "revenue_categories"


# Mapping tables to models for lookup update
LOOKUP_MODELS: dict = {
    LookupTable.DEPARTMENTS: Department,
    LookupTable.SALARY_RATES: SalaryRate,
    LookupTable.SALARY_RATE_MULTIPLIERS: SalaryRateMultiplier,
    LookupTable.INCREMENT_CAPS: IncrementCap,
    LookupTable.EBA_INCREASES: EbaIncrease,
    LookupTable.ON_COST_RATES: OnCostRate,
    LookupTable.NON_STAFF_COST_CATEGORIES: NonStaffCostCategory,
    LookupTable.CALCULATION_CONSTANTS: CalculationConstant,
    LookupTable.ACTIVITIES: Activity,
    LookupTable.REGIONS: Region,
    LookupTable.DELIVERABLE_TYPES: DeliverableType,
    LookupTable.REVENUE_CATEGORIES: RevenueCategory,
}


def _get_unversioned_lookup_models() -> dict[LookupTable, QuerySet]:
    """
    Every unversioned table's rows, in a stable order. The keys are the response's keys.
    """
    return {
        LookupTable.DEPARTMENTS: Department.objects.order_by("code"),
        LookupTable.INCREMENT_CAPS: IncrementCap.objects.order_by("level"),
        LookupTable.NON_STAFF_COST_CATEGORIES: NonStaffCostCategory.objects.order_by(
            "cost_category", "cost_subcategory"
        ),
        LookupTable.ACTIVITIES: Activity.objects.order_by("code"),
        LookupTable.REGIONS: Region.objects.order_by("code"),
        LookupTable.DELIVERABLE_TYPES: DeliverableType.objects.order_by("code"),
        LookupTable.REVENUE_CATEGORIES: RevenueCategory.objects.order_by(
            "budget_ledger_id"
        ),
    }


def _get_versioned_lookup_models(version_id: int) -> dict[LookupTable, QuerySet]:
    """
    Every versioned table's rows, in a stable order. The keys are the response's keys.
    Only include lookups belonging to the specified version.
    """
    return {
        LookupTable.SALARY_RATES: SalaryRate.objects.filter(
            version_id=version_id,
        ).order_by("payroll_type", "category", "classification"),
        LookupTable.SALARY_RATE_MULTIPLIERS: SalaryRateMultiplier.objects.filter(
            version_id=version_id,
        ).order_by("time_basis"),
        LookupTable.EBA_INCREASES: EbaIncrease.objects.filter(
            version_id=version_id,
        ).order_by("year"),
        LookupTable.ON_COST_RATES: OnCostRate.objects.filter(
            version_id=version_id,
        ).order_by("on_cost_type", "employment_type", "year"),
        LookupTable.CALCULATION_CONSTANTS: CalculationConstant.objects.filter(
            version_id=version_id,
        ).order_by("name"),
    }


def _get_lookup_models(version_id: int) -> dict[str, list[models.Model]]:
    tables = _get_unversioned_lookup_models()
    tables.update(_get_versioned_lookup_models(version_id))
    lookup_models = {
        # Pyright infers TextChoices.value as a callable; it is a string at runtime.
        cast(str, table.value): list(queryset.all())
        for table, queryset in tables.items()
    }
    return lookup_models


def get_lookup_tables() -> dict[str, list[models.Model]]:
    """
    Return all lookup table rows keyed by table name.
    Results are cached for CACHE_TIMEOUT seconds.

    Only get current version of lookup tables.
    """
    lookup_models = cache.get(MODELS_CACHE_KEY)
    if lookup_models is None:
        current_version_id = LookupConfiguration.objects.get().current_version_id
        lookup_models = _get_lookup_models(current_version_id)
        cache.set(MODELS_CACHE_KEY, lookup_models, CACHE_TIMEOUT)
    return lookup_models


def _constants_cache_key(version_id: int) -> str:
    return f"lookup_version_{version_id}"


def validate_constants(constants: dict) -> None:
    missing = REQUIRED_CONSTANTS - constants.keys()
    if missing:
        raise KeyError(
            f"Missing required calculation constants: {','.join(sorted(missing))}"
        )


def get_constants(version_id: int) -> dict:
    """
    Get lookup tables from cache and convert them into calculation dictionaries.
    The converted result is cached for CACHE_TIMEOUT seconds.
    """
    cache_key = _constants_cache_key(version_id)
    constants = cache.get(cache_key)

    if constants is not None:
        return constants

    query_sets = _get_versioned_lookup_models(version_id)
    tables = {
        # Pyright infers TextChoices.value as a callable; it is a string at runtime.
        cast(str, table.value): list(queryset.all())
        for table, queryset in query_sets.items()
    }

    # Cast each table to its concrete model type for Pyright.
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

    # Structure: on_cost_type -> employment_type -> year -> rate
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

    cache.set(cache_key, result, CACHE_TIMEOUT)

    return result


def constants_for(budget: Budget) -> dict:
    """
    Return the calculation lookup constants for the budget's lookup version.
    """
    return get_constants(budget.lookup_version_id)


def invalidate_lookup_cache() -> None:
    """
    Refresh the cache after an administrator modifies Lookup table data.
    """
    cache.delete(MODELS_CACHE_KEY)
    current_version_id = LookupConfiguration.objects.get().current_version_id
    cache.delete(_constants_cache_key(current_version_id))
