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

    # TODO: Load contingency and cash co-contribution from budget data.
    # models are not implemented
    contingency_table = {}
    cash_co_contribution = Decimal(0)

    # Calculation
    calculation_result = pricing.pricing(
        constants,
        budget_data['project_duration'],
        budget_data['staff_table'],
        budget_data['non_staff_table'],
        budget_data['budget_info'],
        contingency_table,
        cash_co_contribution,
    )

    # Merge staff table and result
    staff_input_table = budget_data['staff_table']
    staff_result_table = calculation_result['staff_result']
    project_duration = budget_data['project_duration']
    staff_table = {
        'cost_results': merge_staff_table_with_result(
            staff_input_table,
            staff_result_table['cost_results'],
            project_duration,
        ),
        'in_kind_cost_results': merge_staff_table_with_result(
            staff_input_table,
            staff_result_table['in_kind_cost_results'],
            project_duration,
        ),
    }

    return {
        'project_info': budget_data['project_info'],
        'staff_table': staff_table,
        'non_staff_table': calculation_result['non_staff_result'],
        'budget_summary': calculation_result['budget_summary'],
    }


def merge_staff_table_with_result(
        staff_table: Dict,
        staff_result_table: Dict,
        project_duration: Dict,
) -> Dict:
    start_year = project_duration['start_year']
    end_year = project_duration['end_year']

    result_table = {}

    for row_id, staff_result in staff_result_table.items():
        if row_id == 'column_total':
            continue

        staff_info = staff_table['info_table'][row_id]
        staff_numeric = staff_table['numeric_table'][row_id]

        result_table[row_id] = {
            'info': staff_info,
            'rate_2025': staff_result['rate_2025'],
            'numeric': {
                year: {
                    'input': staff_numeric.get(year, 0),
                    'result': staff_result['results'].get(year, 0),
                }
                for year in range(start_year, end_year + 1)
            },
            'total': staff_result['total'],
        }

    result_table['column_total'] = staff_result_table['column_total']

    return result_table
