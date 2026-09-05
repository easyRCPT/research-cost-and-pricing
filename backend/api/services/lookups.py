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

CACHE_KEY = "lookup_tables"


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
    Every lookup table's rows, keyed by table name. Cached for an hour alongside
    the calculation constants; both are cleared by lookup_loader.invalidate_lookup_cache.
    """
    tables = cache.get(CACHE_KEY)
    if tables is None:
        # .all() clones the module-level queryset; evaluating it directly would pin
        # the first result set to the module for the life of the process.
        tables = {
            table.value: list(queryset.all())
            for table, queryset in LOOKUP_TABLES.items()
        }
        cache.set(CACHE_KEY, tables, 3600)
    return tables
