from ..models import Budget
from . import budget_details


def update(budget: Budget, data: dict) -> dict | None:
    requires_calculation = False

    # Update database
    # section = data["section"]
    # row_id = data.get("row_id")
    # field = data["field"]
    # value = data["value"]

    if requires_calculation:
        return budget_details.get_budget_details(budget)

    return None


def update_project(budget: Budget, field: str, value: object) -> bool:
    return False


def update_budget(budget: Budget, field: str, value: object) -> bool:
    return False


def update_staff(budget: Budget, row_id: int, field: str, value: object) -> bool:
    return False


def update_non_staff(budget: Budget, row_id: int, field: str, value: object) -> bool:
    return False
