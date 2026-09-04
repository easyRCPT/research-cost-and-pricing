from . import budget_details

def update_budget(budget, request) -> dict | None:
    requires_calculation = False

    # Update database

    if requires_calculation:
        return budget_details.get_budget_details(budget)

    return None
