from decimal import ROUND_HALF_UP, Decimal

from ..calculation import pricing
from ..models import Budget, LookupVersion
from . import approval_record, data_loader, lookup_loader


def get_lookup_version_id_for_budget(budget: Budget) -> int:
    return budget.lookup_version_id or lookup_loader.current_version_id()


def get_lookup_version_for_budget(budget: Budget) -> LookupVersion:
    return LookupVersion.objects.get(id=get_lookup_version_id_for_budget(budget))


def get_budget_details(budget: Budget) -> dict:
    """
    Get project details from database.
    Calculate cost and price result.
    """
    details = build_budget_details(
        lookup_loader.constants_for(budget),
        data_loader.load_budget_data(budget),
    )
    store_price(budget, details)
    store_multipliers(budget, details)
    details["approval"] = approval_record.approval_record(budget)
    return details


def store_price(budget: Budget, details: dict) -> None:
    """
    Keep Budget.total_price_inc_gst in step with what the engine just returned,
    so the projects list can read a price without pricing every project.

    In AUD whatever the costing's currency (#152): the lists and the approval
    queue compare costings with one another, which needs one currency.

    Every route that changes a priced field comes through here, and so does a
    plain GET, which makes a row that somehow fell behind heal on next read.
    The write is skipped when the number has not moved, so reads stay
    read-only in the ordinary case. updated_at is left out of update_fields
    deliberately: syncing a price is not an edit to the budget.
    """
    price = details["budget_summary"]["in_aud"]["price_summary"]["total_price_inc_gst"]
    price = Decimal(price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if budget.total_price_inc_gst == price:
        return

    budget.total_price_inc_gst = price
    budget.save(update_fields=["total_price_inc_gst"])


def store_multipliers(budget: Budget, details: dict) -> None:
    """
    Keep the budget's copy of its multipliers at the rate it was last priced
    at, as store_price does for the price. Nothing reads the copy to price:
    the rate comes from the lookup version (build_budget_details).
    """
    info = details["budget_info"]
    changed = [
        field
        for field in ("cost_multiplier", "in_kind_multiplier")
        if getattr(budget, field) != info[field]
    ]
    if not changed:
        return

    for field in changed:
        setattr(budget, field, info[field])
    budget.save(update_fields=changed)


def priced_budget_info(constants: dict, budget_info: dict) -> dict:
    """
    The budget's inputs with the multiplier it is priced at.

    The full cost recovery multiplier is a rate like any other (#149): it comes
    from the lookup version the budget prices against, so a draft follows an
    administrator's change and a submitted costing keeps the rate of the
    version it was stamped with. In-kind staff are costed at the same rate.
    """
    multiplier = constants["constants"]["full_cost_recovery_multiplier"]
    currency = budget_info.get("currency", "AUD")
    override = budget_info.get("exchange_rate_override")
    # The exchange rate comes from the same version, for the same reason: a
    # submitted costing keeps the rate it was submitted at (#152). The
    # researcher's own rate, when they set one, is the costing's to keep.
    table_rate = constants["currencies"][currency]
    exchange_rate = exchange_rate_for(currency, override, constants)
    return {
        **budget_info,
        "cost_multiplier": multiplier,
        "in_kind_multiplier": multiplier,
        "currency": currency,
        "table_exchange_rate": table_rate,
        "exchange_rate": exchange_rate,
    }


def exchange_rate_for(
    currency: str, override: Decimal | None, constants: dict
) -> Decimal:
    """
    What 1 AUD buys of the costing's currency: the researcher's own rate when
    they set one, as the workbook's override allows, otherwise the table's
    rate in the lookup version the costing prices against. AUD is always 1.
    """
    if currency == "AUD":
        return Decimal(1)
    return override or constants["currencies"][currency]


# The price summary's figures that are not money: they read the same in any
# currency.
NOT_MONEY = {"margin", "staff_cost_percentage", "non_staff_cost_percentage"}


def in_aud(calculation: dict, exchange_rate: Decimal) -> dict:
    """
    The costing's totals in AUD, beside the figures in its own currency, as
    the workbook shows them (PART B row 42, PART C rows 47 and 54, Summary of
    Price G41 and G42): each divided by the exchange rate. For an AUD costing
    they are the same figures.
    """
    price_summary = calculation["budget_summary"]["price_summary"]
    staff_years = calculation["staff_result"]["cost_results"]["column_total"]
    non_staff_years = calculation["non_staff_result"]["cost_results"]["column_total"]
    return {
        "price_summary": {
            key: value if key in NOT_MONEY else value / exchange_rate
            for key, value in price_summary.items()
        },
        "staff_cost_by_year": [
            {"year": year, "amount": amount / exchange_rate}
            for year, amount in staff_years["results"].items()
        ],
        "non_staff_cost_by_year": [
            {"year": year, "amount": amount / exchange_rate}
            for year, amount in non_staff_years["numeric"].items()
        ],
    }


def build_budget_details(constants: dict, budget_data: dict) -> dict:
    """
    Run the engine over one budget's inputs and shape the response.
    """
    budget_info = priced_budget_info(constants, budget_data["budget_info"])

    # Calculation
    calculation_result = pricing.pricing(
        constants,
        budget_data["project_duration"],
        budget_data["staff_table"],
        budget_data["non_staff_table"],
        budget_info,
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
        "budget_info": budget_info,
        "staff_table": staff_table,
        "non_staff_table": calculation_result["non_staff_result"],
        "budget_summary": {
            **calculation_result["budget_summary"],
            "in_aud": in_aud(calculation_result, budget_info["exchange_rate"]),
        },
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
            "rate": staff_result["rate"],
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
