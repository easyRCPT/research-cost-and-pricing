from typing import Dict


def calculate_non_staff_table(
    table_data: Dict,
    start_year: int,
    end_year: int,
) -> Dict:
    """
    Calculate the non staff cost (in kind or not)
    Return the completed non staff table
    """
    non_staff_costs = {}
    in_kind_non_staff_costs = {}

    for row_id, row in table_data.items():
        row_result = calculate_non_staff_row(row, start_year, end_year)
        if row['in_kind']:
            in_kind_non_staff_costs[row_id] = row_result
        else:
            non_staff_costs[row_id] = row_result

    # need to add column calculation
    non_staff_costs = calculate_non_staff_column(non_staff_costs, start_year, end_year)
    in_kind_non_staff_costs = calculate_non_staff_column(in_kind_non_staff_costs, start_year, end_year)

    return {
        'cost_results': non_staff_costs,
        'in_kind_cost_results': in_kind_non_staff_costs,
    }


def calculate_non_staff_row(
    row_data: Dict,
    start_year: int,
    end_year: int,
) -> Dict:
    """
    Calculate non staff cost line item
    Return input with row total
    """
    total = sum(
        row_data.get(year) or 0
        for year in range(start_year, end_year + 1)
    )

    return {
        'data': row_data,
        'total': total,
    }


def calculate_non_staff_column(
    data: Dict,
    start_year: int,
    end_year: int,
) -> Dict:
    """
    Calculate direct and indirect non-staff cost
    Add results into input data dictionary
    """
    direct_total = {}
    indirect_total = {}
    column_total = {}

    for year in range(start_year, end_year + 1):
        direct = 0
        total = 0

        for row in data.values():
            value = row['data'].get(year) or 0

            if row['data']['add_10%']:
                value *= 1.1

            direct += value
            total += value * row['data']['indirect_rate_multiplier']

        direct_total[year] = direct
        indirect_total[year] = total - direct
        column_total[year] = total

    data['direct_total'] = {
        'data': direct_total,
        'total': sum(direct_total.values()),
    }
    data['indirect_total'] = {
        'data': indirect_total,
        'total': sum(indirect_total.values()),
    }
    data['column_total'] = {
        'data': column_total,
        'total': sum(column_total.values()),
    }

    return data
