from django.core.cache import cache
from ..models import SalaryRate

CACHE_KEY = 'lookup_constants_dict'


def load_lookup_dict():
    """
    Load lookup tables from database, and convert them into plain python dictionaries.
    This function is executed only once when the cache is invalidated.
    """

    # Convert the query results from each lookup table into a dictionary.
    salary_rate_data = {
        (item['payroll_type'], item['category'], item['classification']): item['rate']
        for item in SalaryRate.objects.values('payroll_type', 'category', 'classification', 'rate')
    }

    # Store all lookup dictionaries into a single dictionary.
    return {
        'salary_rate': salary_rate_data,
    }


def get_constants():
    """
    Public data access interface with caching.
    """
    constants = cache.get(CACHE_KEY)
    if constants is None:
        constants = load_lookup_dict()
        cache.set(CACHE_KEY, constants, 3600)  # cache for one hour
    return constants


def invalidate_lookup_cache():
    """
    Refresh the cache after an administrator modifies Lookup table data.
    """
    cache.delete(CACHE_KEY)
