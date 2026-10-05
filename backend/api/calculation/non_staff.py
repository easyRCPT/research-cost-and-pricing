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

    # Column calculation for direct cost and total cost
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
    """
    total = sum(
        num_data.get(year) or Decimal(0) for year in range(start_year, end_year + 1)
    )

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
    Calculate the direct non-staff cost for each year
    Add results into input data dictionary

    The column total is the direct total: a non-staff line takes the 10% and
    nothing more. The workbook's indirect rate multiplier (PART C column T) is
    not needed (#192, #148 option A).
    """
    direct_total = {}
    column_total = {}

    for year in range(start_year, end_year + 1):
        direct = 0

        for row in data.values():
            value = row["numeric"].get(year) or 0

            # direct rate
            direct += value * find_direct_rate_multiplier(row["info"])

        direct_total[year] = direct
        column_total[year] = direct

    data["direct_total"] = {
        "numeric": direct_total,
        "total": sum(direct_total.values()),
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
    Find direct rate multiplier according to selected additional direct rate.
    """
    has_additional_direct_rate = info_data.get("add_ten_percent", False)

    if not info_data["excludes_additional_rate"] and has_additional_direct_rate:
        return Decimal("1.1")
    else:
        return Decimal(1)
