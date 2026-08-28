from typing import Dict
from decimal import Decimal
from ..models import Budget
from . import data_loader, lookup_loader
from ..calculation import pricing

def get_project_details(budget: Budget) -> Dict:
    """
    Get project details from database.
    Calculate cost and price result.
    """
    # Lookup tables
    constants = lookup_loader.get_constants()

    # Budget data
    budget_data = data_loader.load_budget_data(budget)

    # Calculation
    calculation_result = pricing.pricing(
        constants,
        budget_data['project_duration'],
        budget_data['staff_table'],
        budget_data['non_staff_table'],
        budget_data['budget_info'],
        None,
        Decimal('0'),
    )

    return {
        'project_info': budget_data['project_info'],
        'staff_table': calculation_result['staff_result'],
        'non_staff_table': calculation_result['non_staff_result'],
        'budget_summary': calculation_result['budget_summary'],
    }