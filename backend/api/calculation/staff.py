from typing import Dict


def calculate_staff_table(
    table_data: Dict,
    constants: Dict,
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
) -> Dict:
    """
    Calculate the staff cost (in kind or not)
    Input format: {
        'info_table': {'<row_id>': {}},
        'numeric_table': {'<row_id>': {}}
    }

    Return the calculation results only.
    Source info/numeric data are not included in the result.
    The caller is responsible for combining the calculation results with the source data.
    Output format: {
        'cost_results': {
            '<row_id>': {'results': {}, 'total': number},
            'column_total': {'results': {}, 'total': number},
        },
        'in_kind_cost_results': {...}
    }
    """
    staff_costs = {}
    in_kind_staff_costs = {}

    # Calculate the fractions of the start and end years
    project_duration = calculate_year_fractions(start_year, start_month, end_year, end_month)

    # Populate staff cost and in kind staff cost result dictionary
    for row_id, info in table_data['info_table'].items():
        numeric = table_data['numeric_table'][row_id]
        cost_result = calculate_staff_row(info, numeric, constants, project_duration)

        if info.get('in_kind', 0):
            in_kind_staff_costs[row_id] = cost_result
        else:
            staff_costs[row_id] = cost_result

    # Calculate column total
    staff_costs = calculate_column_total(staff_costs, start_year, end_year)
    in_kind_staff_costs = calculate_column_total(in_kind_staff_costs, start_year, end_year)

    return {
        'cost_results': staff_costs,
        'in_kind_cost_results': in_kind_staff_costs,
    }


def calculate_year_fractions(
    start_year: int,
    start_month: int,
    end_year: int,
    end_month: int,
) -> Dict:
    """
    Calculate the fractions of the start and end years.
    """
    if start_year > end_year:
        raise ValueError("Invalid project duration.")

    if start_year == end_year and start_month > end_month:
        raise ValueError("Invalid project duration.")

    if start_year == end_year:
        first_year_fraction = (end_month - start_month + 1) / 12
        last_year_fraction = first_year_fraction
    else:
        first_year_fraction = (12 - start_month + 1) / 12
        last_year_fraction = end_month / 12

    return {
        'start_year': start_year,
        'end_year': end_year,
        'first_year_fraction': first_year_fraction,
        'last_year_fraction': last_year_fraction,
    }


def calculate_column_total(
    data: Dict,
    start_year: int,
    end_year: int,
):
    """
    Calculate column total and grand total value
    Add result into input data dictionary
    """
    column_total = {
        year: sum(
            row['results'].get(year) or 0
            for row in data.values()
        )
        for year in range(start_year, end_year + 1)
    }

    total = sum(column_total.values())

    # Add result into input data dictionary
    data['column_total'] = {
        'results': column_total,
        'total': total
    }

    return data


def calculate_staff_row(
    info_data: Dict,
    num_data: Dict,
    constants: Dict,
    project_duration: Dict,
) -> Dict:
    """
    Calculate the cost of a staff in each year of the project
    Return a dictionary for cost in each year {'year': cost}
    """

    # The cost dictionary for each year
    costs = {}

    year_employed = 0
    for year in range(project_duration['start_year'],
                      project_duration['end_year'] + 1):

        # Skip none value
        time = num_data.get(year) or 0
        if time == 0:
            continue

        # Find year fraction
        if year == project_duration['start_year']:
            year_fraction = project_duration['first_year_fraction']
        elif year == project_duration['end_year']:
            year_fraction = project_duration['last_year_fraction']
        else:
            year_fraction = 1

        # Calculate cost
        salary_rate = find_salary_rate(info_data, constants, year_employed, year)
        employment_type = info_data.get('employment_type')
        costs[year] = (
            calculate_staff_cost(constants, salary_rate, time, year_fraction, employment_type))

        # Increment by one year when employed
        year_employed += 1

    # Calculate row total
    total = sum(costs.values())

    return {
        'results': costs,
        'total': total,
    }


def find_salary_rate(
    info_data: Dict,
    constants: Dict,
    year_employed: int,
    year: int,
):
    """
    Find the salary rate for a staff in the specified year
    """
    # Get search key for salary rate
    employment_type = info_data.get('employment_type')
    category = info_data.get('category')
    classification = info_data.get('classification')
    rate_basis = info_data.get('rate_basis')

    # Get payroll type
    mapping = {
        'Continuing': 'Fortnight',
        'Fixed-Term': 'Fortnight',
    }
    payroll_type = mapping.get(employment_type, employment_type)

    # Get new classification based on years employed
    # Assume classification level is in the range from 1 to 10
    if classification.endswith('10'):
        new_classification = classification
    else:
        prefix = classification[:-1]
        current = int(classification[-1])

        max_step = current + year_employed

        while max_step > current:
            key = (payroll_type, category, f"{prefix}{max_step}")
            if key in constants['salary_rate']:
                break
            max_step -= 1
        new_classification = f"{prefix}{max_step}"

    # Find base salary rate in 2025 from lookup table
    key = (payroll_type, category, new_classification)
    base_salary_rate = constants['salary_rate'][key]

    # Calculate salary rate
    salary_rate_multiplier = constants['salary_rate_multiplier'][rate_basis]
    eba_multiplier = constants['eba'][year]
    return base_salary_rate * salary_rate_multiplier * eba_multiplier


def calculate_staff_cost(
    constants: Dict,
    salary_rate,
    time,
    year_fraction,
    employment_type,
):
    """
    Calculate the total cost of a staff in a year, with base salary rate calculated in previous
    """
    on_costs = constants['on_cost_components']
    general = constants['constants']

    # Requested salary
    requested_salary = salary_rate * time * year_fraction
    # Leave loading
    # MAX_LEAVE_LOADING = 1611.3
    leave_loading = on_costs['leave_loading'][employment_type] * requested_salary
    max_leave_loading = general['max_leave_loading']
    leave_loading = min(leave_loading, max_leave_loading)
    # Superannuation
    superannuation = on_costs['superannuation'][employment_type] * requested_salary

    # The intermediate value used to calculate payroll tax and WorkCover
    subtotal_cost = requested_salary + leave_loading + superannuation

    # Add Payroll Tax (on subtotal)
    total_cost = subtotal_cost + general['max_payroll_tax'] * subtotal_cost
    # Add WorkCover (on subtotal)
    total_cost += on_costs['workcover'][employment_type] * subtotal_cost
    # Add Long Service Leave
    total_cost += on_costs['long_service_leave'][employment_type] * requested_salary
    # Add Parental Leave Provision
    total_cost += on_costs['parental_leave'][employment_type] * requested_salary
    # Add Override Default UoM Oncosts
    total_cost += general['override_uom_oncosts'] * requested_salary
    # Add Annual Leave Provision
    total_cost += on_costs['annual_leave_provision'][employment_type] * requested_salary

    return total_cost * general['cost_recovery_multiplier']
