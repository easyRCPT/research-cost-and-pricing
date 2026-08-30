from typing import Dict
from decimal import Decimal
from . import staff, non_staff

GST_MULTIPLIER = Decimal('1.1')


def pricing(
    constants: Dict,
    project_duration: Dict,
    staff_table: Dict,
    non_staff_table: Dict,
    budget_info: Dict,
) -> Dict:
    """
    Main entry point for the calculation engine.
    Calculate staff and non-staff costs and the budget form summary.
    """
    # staff cost table result
    staff_result = staff.calculate_staff_table(
        staff_table,
        constants,
        project_duration['start_year'],
        project_duration['start_month'],
        project_duration['end_year'],
        project_duration['end_month'],
        budget_info['cost_multiplier'],
        budget_info['in_kind_multiplier'],
    )

    # non staff cost table result
    non_staff_result = non_staff.calculate_non_staff_table(
        non_staff_table,
        project_duration['start_year'],
        project_duration['end_year'],
    )

    # Calculate budget summary
    budget_summary = calculate_budget_summary(
        staff_table['info_table'],
        staff_result,
        non_staff_result,
        budget_info,
        budget_info['cash_co_contribution'],
    )
    return {
        'staff_result': staff_result,
        'non_staff_result': non_staff_result,
        'budget_summary': budget_summary,
    }


def calculate_budget_summary(
    staff_info_table: Dict,
    staff_result: Dict,
    non_staff_result: Dict,
    budget_info: Dict,
    total_cash_co_contribution: Decimal,
) -> Dict:
    """
    Calculate summary for budget form
    """
    # price summary
    price_summary = calculate_price_summary(
        staff_result,
        non_staff_result,
        total_cash_co_contribution,
        budget_info['gst_applicable'],
    )

    # staff budget
    # not include in-kind costs
    staff_budget = calculate_staff_budget(
        staff_info_table,
        staff_result['cost_results'],
        budget_info['cost_multiplier'],
    )

    # non-staff budget
    # not include in-kind costs
    non_staff_budget = calculate_non_staff_budget(non_staff_result['cost_results'])
    direct_total = non_staff_budget['direct_total']
    indirect_total = non_staff_result['indirect_total']['total']
    non_staff_budget['indirect_cost_recovery'] = indirect_total
    non_staff_budget['total_non_staff_costs'] = direct_total + indirect_total

    # in kind costs
    # non-staff total not include indirect costs
    # If in-kind non-staff cost has indirect rate multiplier, additional direct rate will not be considered
    in_kind_staff_budget = calculate_staff_budget(
        staff_info_table,
        staff_result['in_kind_cost_results'],
        budget_info['in_kind_multiplier'],
    )
    in_kind_non_staff_budget = calculate_non_staff_budget(non_staff_result['in_kind_cost_results'])
    in_kind_costs = {
        'in_kind_staff_budget': in_kind_staff_budget,
        'in_kind_non_staff_budget': in_kind_non_staff_budget,
        'total_in_kind_costs': in_kind_staff_budget['total_staff_costs']
                               + in_kind_non_staff_budget['direct_total'],
    }

    return {
        'price_summary': price_summary,
        'staff_budget': staff_budget,
        'non_staff_budget': non_staff_budget,
        'in_kind_costs': in_kind_costs,
    }


def calculate_price_summary(
    staff_result: Dict,
    non_staff_result: Dict,
    total_cash_co_contribution: Decimal,
    gst_applicable: bool,
) -> Dict:
    """
    Calculate price summary
    """
    staff_cost = staff_result['cost_results']['column_total']['total']
    non_staff_cost = non_staff_result['cost_results']['column_total']['total']
    project_cost = staff_cost + non_staff_cost

    in_kind_staff_cost = staff_result['in_kind_cost_results']['column_total']['total']
    in_kind_non_staff_cost = non_staff_result['in_kind_cost_results']['column_total']['total']
    in_kind_project_cost = in_kind_staff_cost + in_kind_non_staff_cost

    staff_cost_percentage = staff_cost / project_cost if project_cost else Decimal('0')
    non_staff_cost_percentage = non_staff_cost / project_cost if project_cost else Decimal('0')

    total_project_cost = project_cost + in_kind_project_cost

    total_price_exc_gst = project_cost
    if gst_applicable:
        total_price_inc_gst = total_price_exc_gst * GST_MULTIPLIER
    else:
        total_price_inc_gst = total_price_exc_gst

    cash_benefit = total_price_exc_gst - project_cost
    total_in_kind_contribution = in_kind_project_cost
    university_position = cash_benefit - total_in_kind_contribution - total_cash_co_contribution

    return {
        'staff_cost': staff_cost,
        'non_staff_cost': non_staff_cost,
        'project_cost': project_cost,

        'in_kind_staff_cost': in_kind_staff_cost,
        'in_kind_non_staff_cost': in_kind_non_staff_cost,
        'in_kind_project_cost': in_kind_project_cost,

        'staff_cost_percentage': staff_cost_percentage,
        'non_staff_cost_percentage': non_staff_cost_percentage,
        'total_project_cost': total_project_cost,

        'total_price_exc_gst': total_price_exc_gst,
        'total_price_inc_gst': total_price_inc_gst,

        'cash_benefit': cash_benefit,
        'total_in_kind_contribution': total_in_kind_contribution,
        'total_cash_co_contribution': total_cash_co_contribution,
        'university_position': university_position,
    }


def calculate_staff_budget(
    info_table: Dict,
    staff_result: Dict,
    multiplier: Decimal,
) -> Dict:
    """
    Calculate staff cost summary
    """
    # Calculate total result according to category and employment type
    result = {}
    summary_rows = {'column_total'}
    for row_id, row in staff_result.items():
        if row_id in summary_rows:
            continue
        category = info_table[row_id]['category']
        employment_type = info_table[row_id]['employment_type']
        key = f"{category}_{employment_type}"
        result[key] = result.get(key, 0) + row['total'] / multiplier

    # Calculate total
    cost_before_recovery = sum(result.values())
    total_staff_costs = cost_before_recovery * multiplier

    return {
        'category_totals': result,
        'cost_before_recovery': cost_before_recovery,
        'cost_recovery': total_staff_costs - cost_before_recovery,
        'cost_recovery_multiplier': multiplier,
        'total_staff_costs': total_staff_costs,
    }


def calculate_non_staff_budget(
    non_staff_result: Dict,
) -> Dict:
    """
    Calculate non staff cost summary
    Contingency is included in direct costs and total non staff costs,
    but not included in calculation in non_staff_result
    """
    # Calculate total result according to cost group
    # Ignore expense type for non-staff budget
    result = {}
    summary_rows = {'direct_total', 'indirect_total', 'column_total'}
    for row_id, row in non_staff_result.items():
        if row_id in summary_rows:
            continue
        cost_group = row['info']['cost_group']
        result[cost_group] = result.get(cost_group, 0) + row['direct_total']

    # Add summary
    direct_total = sum(result.values())

    return {
        'category_totals': result,
        'direct_total': direct_total,
    }
