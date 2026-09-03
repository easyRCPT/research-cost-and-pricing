from decimal import Decimal


def calculate_non_staff_table(
    table_data: dict,
    start_year: int,
    end_year: int,
) -> dict:
    """
    Calculate the non staff cost (in kind or not)
    Input format: {'info_table': {}, 'numeric_table': {}}

    Return the completed non-staff table, including source data and calculated row/column results.
    Output format: {
        'cost_results': {
            '<row_id>': {'info': {}, 'numeric': {}, 'total': number, 'direct_total': number},
            'direct_total': {'numeric': {}, 'total': number},
            'indirect_total': {'numeric': {}, 'total': number},
            'column_total': {'numeric': {}, 'total': number},
        },
        'in_kind_cost_results': {...}
    }
    """
    non_staff_costs = {}
    in_kind_non_staff_costs = {}

    for row_id, info in table_data["info_table"].items():
        numeric = table_data["numeric_table"][row_id]
        row_result = calculate_non_staff_row(info, numeric, start_year, end_year)
        if info.get("in_kind", False):
            in_kind_non_staff_costs[row_id] = row_result
        else:
            non_staff_costs[row_id] = row_result

    # Column calculation for direct cost, indirect cost and total cost
    non_staff_costs = calculate_non_staff_column(non_staff_costs, start_year, end_year)
    in_kind_non_staff_costs = calculate_non_staff_column(
        in_kind_non_staff_costs, start_year, end_year
    )

    return {
        "cost_results": non_staff_costs,
        "in_kind_cost_results": in_kind_non_staff_costs,
    }


def calculate_non_staff_row(
    info_data: dict,
    num_data: dict,
    start_year: int,
    end_year: int,
) -> dict:
    """
    Calculate non staff cost line item
    Return input with row total and direct total.
    Not consider indirect cost rate multiplier
    """
    total = sum(num_data.get(year) or 0 for year in range(start_year, end_year + 1))

    direct_total = total * find_direct_rate_multiplier(info_data)

    return {
        "info": info_data,
        "numeric": num_data,
        "total": total,
        "direct_total": direct_total,
    }


def calculate_non_staff_column(
    data: dict,
    start_year: int,
    end_year: int,
) -> dict:
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
            value = row["numeric"].get(year) or 0

            # direct rate
            value *= find_direct_rate_multiplier(row["info"])
            direct += value

            # indirect rate
            indirect_rate_multiplier = row["info"].get("indirect_rate_multiplier", 1)
            # Contingency should not apply additional direct rate and indirect rate
            if row["info"]["cost_group"] != "contingency":
                indirect_rate_multiplier = 1
            total += value * indirect_rate_multiplier

        direct_total[year] = direct
        indirect_total[year] = total - direct
        column_total[year] = total

    data["direct_total"] = {
        "numeric": direct_total,
        "total": sum(direct_total.values()),
    }
    data["indirect_total"] = {
        "numeric": indirect_total,
        "total": sum(indirect_total.values()),
    }
    data["column_total"] = {
        "numeric": column_total,
        "total": sum(column_total.values()),
    }

    return data


def find_direct_rate_multiplier(
    info_data: dict,
) -> Decimal:
    """
    Find direct rate multiplier according to selected additional direct rate and input indirect rate
    If add_ten_percent and indirect_rate_multiplier coexist, only consider indirect_rate_multiplier
    """
    has_additional_direct_rate = info_data.get("add_ten_percent", False)
    indirect_rate_multiplier = info_data.get("indirect_rate_multiplier", 1)
    cost_group = info_data["cost_group"]

    # Contingency should not apply additional direct rate and indirect rate
    if (
        cost_group != "contingency"
        and has_additional_direct_rate
        and indirect_rate_multiplier <= 1
    ):
        return Decimal("1.1")
    else:
        return Decimal(1)
