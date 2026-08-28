from typing import Dict
from decimal import Decimal
from . import lookup_loader, staff, non_staff

GST_MULTIPLIER = Decimal('1.1')


def pricing(
    staff_table: Dict,
    non_staff_table: Dict,
    project_duration: Dict,
    contingency_table: Dict,
    total_cash_co_contribution: Decimal,
) -> Dict:
    """
    Main entry point for the calculation engine.
    Calculate staff and non-staff costs and the budget form summary.
    """
    # Get lookup dictionary from cache
    constants = lookup_loader.get_constants()

    # staff cost table result
    staff_result = staff.calculate_staff_table(
        staff_table,
        constants,
        project_duration['start_year'],
        project_duration['start_month'],
        project_duration['end_year'],
        project_duration['end_month'],
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
        constants,
        contingency_table,
        total_cash_co_contribution,
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
    constants: Dict,
    contingency_table: Dict,
    total_cash_co_contribution: Decimal,
) -> Dict:
    """
    Calculate summary for budget form
    """
    # price summary
    price_summary = calculate_price_summary(
        staff_result,
        non_staff_result,
        contingency_table,
        total_cash_co_contribution,
    )

    # staff budget
    # not include in-kind costs
    cost_recovery_multiplier = constants['constants']['cost_recovery_multiplier']
    staff_budget = calculate_staff_budget(
        staff_info_table,
        staff_result['cost_results'],
        cost_recovery_multiplier,
    )

    # non-staff budget
    # not include in-kind costs
    non_staff_budget = calculate_non_staff_budget(
        non_staff_result['cost_results'],
        contingency_table,
    )
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
        cost_recovery_multiplier,
    )
    in_kind_non_staff_budget = calculate_non_staff_budget(
        non_staff_result['cost_results'],
        contingency_table,
    )
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
    contingency_table: Dict,
    total_cash_co_contribution: Decimal,
) -> Dict:
    """
    Calculate price summary
    """
    staff_cost = staff_result['cost_results']['column_total']['total']
    non_staff_cost = (non_staff_result['cost_results']['column_total']['total']
                       + sum(contingency_table.values()))
    project_cost = staff_cost + non_staff_cost

    in_kind_staff_cost = staff_result['in_kind_cost_results']['column_total']['total']
    in_kind_non_staff_cost = non_staff_result['in_kind_cost_results']['column_total']['total']
    in_kind_project_cost = in_kind_staff_cost + in_kind_non_staff_cost

    staff_cost_percentage = staff_cost / project_cost
    non_staff_cost_percentage = non_staff_cost / project_cost

    total_project_cost = project_cost + in_kind_project_cost

    total_price_exc_gst = project_cost
    total_price_inc_gst = total_price_exc_gst * GST_MULTIPLIER

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
    cost_recovery_multiplier: Decimal,
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
        result[key] = result.get(key, 0) + row['total'] / cost_recovery_multiplier

    # Calculate total
    cost_before_recovery = sum(result.values())
    total_staff_costs = cost_before_recovery * cost_recovery_multiplier

    return {
        'category_totals': result,
        'cost_before_recovery': cost_before_recovery,
        'cost_recovery': total_staff_costs - cost_before_recovery,
        'cost_recovery_multiplier': cost_recovery_multiplier,
        'total_staff_costs': total_staff_costs,
    }


def calculate_non_staff_budget(
    non_staff_result: Dict,
    contingency_table: Dict,
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

    # Add contingency
    if contingency_table is not None:
        result['contingency'] = sum(contingency_table.values())

    # Add summary
    direct_total = sum(result.values())

    return {
        'category_totals': result,
        'direct_total': direct_total,
    }
