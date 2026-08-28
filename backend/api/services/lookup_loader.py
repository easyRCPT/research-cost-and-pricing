from typing import Dict
from django.core.cache import cache
from ..models import SalaryRate, SalaryRateMultiplier, EbaIncrease, OnCostRate, CalculationConstant, Department, \
    NonStaffCostCategory, Activity, Region, DeliverableType, RevenueCategory

CACHE_KEY = 'lookup_constants_dict'


def get_lookup_tables() -> Dict:
    """
    Public data access interface with table formatting.
    Used for displaying lookup tables.
    """
    lookup_tables = get_constants()
    salary_rate = lookup_tables['salary_rate']

    return {
        **lookup_tables,
        'salary_rate': {
            f"{row_id[0]}_{row_id[1]}_{row_id[2]}": {
                'payroll_type': row_id[0],
                'category': row_id[1],
                'classification': row_id[2],
                'rate': rate
            }
            for row_id, rate in salary_rate.items()
        },
    }


def get_constants():
    """
    Public data access interface with caching.
    Used for calculation.
    """
    constants = cache.get(CACHE_KEY)
    if constants is None:
        constants = load_lookup_dict()
        cache.set(CACHE_KEY, constants, 3600)  # cache for one hour
    return constants


def load_lookup_dict() -> Dict:
    """
    Load lookup tables from database, and convert them into plain python dictionaries.
    This function is executed only once when the cache is invalidated.
    """

    # Convert the query results from each lookup table into a dictionary.
    salary_rate_data = {
        (item['payroll_type'], item['category'], item['classification']): item['rate']
        for item in SalaryRate.objects.values('payroll_type', 'category', 'classification', 'rate')
    }

    salary_rate_multiplier_data = {
        item['time_basis']: item['multiplier']
        for item in SalaryRateMultiplier.objects.values('time_basis', 'multiplier')
    }

    eba_multiplier = {
        item['year']: item['multiplier']
        for item in EbaIncrease.objects.values('year', 'multiplier')
    }

    on_cost_components = {}
    for item in OnCostRate.objects.values('on_cost_type', 'employment_type', 'rate'):
        on_cost_components.setdefault(item['employment_type'], {})[item['on_cost_type']] = item['rate']

    constants = {
        item['name']: item['value']
        for item in CalculationConstant.objects.values('name', 'value')
    }

    departments = {
        item['code']: {
            'name': item['name'],
            'school': item['school'],
            'school_code': item['school_code'],
            'faculty': item['faculty'],
            'faculty_code': item['faculty_code'],
            'budget_unit': item['budget_unit'],
        }
        for item in Department.objects.values(
            'code', 'name', 'school', 'school_code', 'faculty', 'faculty_code', 'budget_unit'
        )
    }

    non_staff_cost_categories = {
        item['ledger_id']: {
            'cost_category': item['cost_category'],
            'cost_subcategory': item['cost_subcategory'],
        }
        for item in NonStaffCostCategory.objects.values('ledger_id', 'cost_category', 'cost_subcategory')
    }

    activities = {
        item['code']: item['name']
        for item in Activity.objects.values('code', 'name')
    }

    regions = {
        item['code']: item['name']
        for item in Region.objects.values('code', 'name')
    }

    deliverable_types = {
        item['code']: item['name']
        for item in DeliverableType.objects.values('code', 'name')
    }

    revenue_categories = {
        item['budget_ledger_id']: {
            'external_party': item['external_party'],
            'description': item['description'],
        }
        for item in RevenueCategory.objects.values('budget_ledger_id', 'external_party', 'description')
    }

    # Store all lookup dictionaries into a single dictionary.
    return {
        'salary_rate': salary_rate_data,
        'salary_rate_multiplier': salary_rate_multiplier_data,
        'eba': eba_multiplier,
        'on_cost_components': on_cost_components,
        'constants': constants,
        'departments': departments,
        'non_staff_cost_categories': non_staff_cost_categories,
        'activities': activities,
        'regions': regions,
        'deliverable_types': deliverable_types,
        'revenue_categories': revenue_categories,
    }


def invalidate_lookup_cache():
    """
    Refresh the cache after an administrator modifies Lookup table data.
    """
    cache.delete(CACHE_KEY)
