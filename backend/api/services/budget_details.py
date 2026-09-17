from decimal import ROUND_HALF_UP, Decimal

from ..calculation import pricing
from ..models import Budget
from . import data_loader, lookup_loader


def get_budget_details(budget: Budget) -> dict:
    """
    Get project details from database.
    Calculate cost and price result.
    """
    details = build_budget_details(
        lookup_loader.get_constants(),
        data_loader.load_budget_data(budget),
    )
    store_price(budget, details)
    return details


def store_price(budget: Budget, details: dict) -> None:
    """
    Keep Budget.total_price_exc_gst in step with what the engine just returned,
    so the projects list can read a price without pricing every project.

    Every route that changes a priced field comes through here, and so does a
    plain GET, which makes a row that somehow fell behind heal on next read.
    The write is skipped when the number has not moved, so reads stay
    read-only in the ordinary case. updated_at is left out of update_fields
    deliberately: syncing a price is not an edit to the budget.
    """
    price = details["budget_summary"]["price_summary"]["total_price_exc_gst"]
    price = Decimal(price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if budget.total_price_exc_gst == price:
        return

    budget.total_price_exc_gst = price
    budget.save(update_fields=["total_price_exc_gst"])


def build_budget_details(constants: dict, budget_data: dict) -> dict:
    """
    Run the engine over one budget's inputs and shape the response.
    """
    # Calculation
    calculation_result = pricing.pricing(
        constants,
        budget_data["project_duration"],
        budget_data["staff_table"],
        budget_data["non_staff_table"],
        budget_data["budget_info"],
    )

    # Merge staff table and result
    staff_input_table = budget_data["staff_table"]
    staff_result_table = calculation_result["staff_result"]
    project_duration = budget_data["project_duration"]
    staff_table = {
        "cost_results": merge_staff_table_with_result(
            staff_input_table,
            staff_result_table["cost_results"],
            project_duration,
        ),
        "in_kind_cost_results": merge_staff_table_with_result(
            staff_input_table,
            staff_result_table["in_kind_cost_results"],
            project_duration,
        ),
    }

    return {
        "project_info": budget_data["project_info"],
        "budget_info": budget_data["budget_info"],
        "staff_table": staff_table,
        "non_staff_table": calculation_result["non_staff_result"],
        "budget_summary": calculation_result["budget_summary"],
    }


def merge_staff_table_with_result(
    staff_table: dict,
    staff_result_table: dict,
    project_duration: dict,
) -> dict:
    start_year = project_duration["start_year"]
    end_year = project_duration["end_year"]

    result_table = {}

    for row_id, staff_result in staff_result_table.items():
        if row_id == "column_total":
            continue

        staff_info = staff_table["info_table"][row_id]
        staff_numeric = staff_table["numeric_table"][row_id]

        result_table[row_id] = {
            "info": staff_info,
            "rate_2025": staff_result["rate_2025"],
            "numeric": {
                year: {
                    "input": staff_numeric.get(year, 0),
                    "result": staff_result["results"].get(year, 0),
                }
                for year in range(start_year, end_year + 1)
            },
            "total": staff_result["total"],
        }

    result_table["column_total"] = staff_result_table["column_total"]

    return result_table
