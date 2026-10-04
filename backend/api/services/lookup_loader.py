from decimal import Decimal
from typing import cast

from django.core.cache import cache
from django.db import models
from django.db.models import QuerySet

from ..models import (
    PAYROLL_TYPE_MAPPING,
    Budget,
    CalculationConstant,
    Currency,
    EbaIncrease,
    IncrementCap,
    LookupConfiguration,
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
)
from .lookup_definitions import LOOKUP_DEFINITIONS

MODELS_CACHE_KEY = "lookup_models"
CACHE_TIMEOUT = 3600

REQUIRED_CONSTANTS = {
    "max_leave_loading",
    "max_payroll_tax",
    "override_uom_oncosts",
    "gst_rate",
    "default_margin",
    "minimum_margin",
    "salary_rate_year",
    "full_cost_recovery_multiplier",
}


def _get_lookup_models(version_id: int) -> dict[str, list[models.Model]]:
    lookup_models = {}

    for table, definition in LOOKUP_DEFINITIONS.items():
        queryset = definition.model.objects.all()

        if definition.versioned:
            queryset = queryset.filter(version_id=version_id)

        queryset = queryset.order_by(*definition.order_by)
        lookup_models[table] = list(queryset)

    return lookup_models


def get_lookup_tables() -> dict[str, list[models.Model]]:
    """
    Return all lookup table rows keyed by table name.
    Results are cached for CACHE_TIMEOUT seconds.

    Only get current version of lookup tables.
    """
    lookup_models = cache.get(MODELS_CACHE_KEY)
    if lookup_models is None:
        version_id = LookupConfiguration.objects.get().current_version_id
        lookup_models = _get_lookup_models(version_id)
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


def _validate_increment_cap(rates: dict, caps: dict) -> None:
    """Check that all rates defined by increment caps exist."""
    for (category, level), max_steps in caps.items():
        classifications = (
            [level]
            if max_steps == 0
            else [f"{level}.{i}" for i in range(1, max_steps + 1)]
        )

        for payroll_type in set(PAYROLL_TYPE_MAPPING.values()):
            for classification in classifications:
                key = (payroll_type, category, classification)
                if key not in rates:
                    raise KeyError(
                        f"Salary rate for {payroll_type}, {category}, {classification} is missing."
                    )


def _get_versioned_lookup_querysets(version_id: int) -> dict[str, QuerySet]:
    return {
        table: definition.model.objects.filter(
            version_id=version_id,
        ).order_by(*definition.order_by)
        for table, definition in LOOKUP_DEFINITIONS.items()
        if definition.versioned
    }


def get_constants(version_id: int) -> dict:
    """
    Get lookup tables from cache and convert them into calculation dictionaries.
    The converted result is cached for CACHE_TIMEOUT seconds.
    """
    cache_key = _constants_cache_key(version_id)
    constants = cache.get(cache_key)

    if constants is not None:
        return constants

    result = build_constants(version_id)
    cache.set(cache_key, result, CACHE_TIMEOUT)
    return result


def build_constants(version_id: int) -> dict:
    """
    One version's rates as the engine reads them, straight from the database.

    Raises if the version could not price a costing: a constant missing, or an
    on-cost with no default rate. A set of changes is checked with this before
    it is saved (#138), so it can never leave the rates in that state.
    """
    querysets = _get_versioned_lookup_querysets(version_id)
    tables = {
        # Pyright infers TextChoices.value as a callable; it is a string at runtime.
        table: list(queryset)
        for table, queryset in querysets.items()
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

    increment_caps = cast(
        list[IncrementCap],
        tables["increment_caps"],
    )
    increment_cap = {(row.category, row.level): row.max_steps for row in increment_caps}
    _validate_increment_cap(salary_rate, increment_cap)

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
    eba_rate = {row.year: row.rate for row in eba_increases}

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

    # What 1 AUD buys of each currency (#152). AUD is the base, at 1 whether
    # or not a version holds a row for it, so a costing priced before
    # currencies existed still prices.
    currencies = {"AUD": Decimal(1)}
    currencies.update(
        {row.code: row.rate for row in cast(list[Currency], tables["currencies"])}
    )

    result = {
        "currencies": currencies,
        "salary_rate": salary_rate,
        "increment_cap": increment_cap,
        "salary_rate_multiplier": salary_rate_multiplier,
        "eba": eba_rate,
        "on_cost_components": on_cost_components,
        "constants": constants,
        "payroll_type_mapping": PAYROLL_TYPE_MAPPING,
    }

    return result


def current_version_id() -> int:
    return LookupConfiguration.objects.get().current_version_id


def constants_for(budget: Budget) -> dict:
    """
    The lookup state one budget prices against.

    A draft has no version of its own and reads the live rates, so a lookup
    edit reaches it: an unauthorised budget is meant to pick up a rate change
    made after it was created. Submitting stamps the version in use, and from
    then on the budget is frozen against that one however the rates move.
    """
    version_id = budget.lookup_version_id
    if version_id is None:
        version_id = current_version_id()
    return get_constants(version_id)


def invalidate_lookup_cache() -> None:
    """
    Refresh the cache after an administrator modifies Lookup table data.
    """
    cache.delete(MODELS_CACHE_KEY)
    cache.delete(_constants_cache_key(current_version_id()))
