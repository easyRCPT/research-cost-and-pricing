"""
Pricing a costing in another currency, as the workbook does (#152).

The workbook converts staff costs from AUD where it reads the salary: each
year's salary is multiplied by the exchange rate (On cost calculator J7, L7,
...), and so is the leave loading cap (K9). Non-staff amounts are entered in
the costing's currency. Totals show in that currency with the AUD figure
beside them, each divided by the rate.
"""

from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from api.models import (
    Budget,
    Currency,
    Deliverable,
    DeliverableType,
    LookupConfiguration,
    User,
    YearAmount,
)
from api.services import budget_clone, project, staff_line
from api.services.budget_details import get_budget_details
from api.services.lookup_changes import apply_changes
from api.services.lookup_update import create_lookup_version
from api.services.submission import submit_budget
from api.tests.factories import make_department, seed_lookups

CENTS = Decimal("0.01")
USD = Decimal("0.70285")  # the seeded table's rate: 1 AUD = 0.70285 USD


def cents(value) -> Decimal:
    return Decimal(value).quantize(CENTS)


class CurrencyFixture(TestCase):
    """The workbook's demo costing (2027 to 2029), on the seeded rates."""

    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.owner = User.objects.create_user("owner@unimelb.edu.au")
        cls.admin = User.objects.create_user("admin@unimelb.edu.au")
        row = project.create(
            {
                "title": "Workbook demo",
                "department": make_department(),
                "start_year": 2027,
                "start_month": 1,
                "end_year": 2029,
                "end_month": 12,
            },
            cls.owner,
        )
        cls.budget = Budget.objects.get(project_id=row["id"])
        for line in (
            {
                "name_role": "Continuing academic",
                "employment_type": "Continuing",
                "category": "Academic",
                "classification": "Level B.6",
                "time_basis": "FTE",
                "allocations": [
                    {"year": 2027, "time": Decimal(1)},
                    {"year": 2028, "time": Decimal(1)},
                ],
            },
            {
                "name_role": "Casual professional",
                "employment_type": "Casual",
                "category": "Professional",
                "classification": "UOM 7.1",
                "time_basis": "Hourly",
                "allocations": [
                    {"year": 2027, "time": Decimal(120)},
                    {"year": 2028, "time": Decimal(120)},
                ],
            },
        ):
            staff_line.create(cls.budget, line)

    def setUp(self):
        # Rates are cached per version, and the cache outlives each test's
        # rolled-back database.
        cache.clear()
        self.addCleanup(cache.clear)
        self.client.force_login(self.owner)

    def patch(self, field: str, value):
        return self.client.patch(
            reverse("budget-detail", args=[self.budget.id]),
            {"section": "budget", "field": field, "value": value},
            "application/json",
        )

    def add_non_staff(self, amount: str):
        response = self.client.post(
            reverse("non-staff-line", args=[self.budget.id]),
            {
                "cost_group": "Advertising and marketing",
                "expense_type": "Advertising, Marketing and Promotional Expenses",
                "amounts": [{"year": 2027, "amount": amount}],
            },
            "application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def details(self) -> dict:
        self.budget.refresh_from_db()
        return get_budget_details(self.budget)

    def years(self, details: dict, name_role: str) -> dict[int, Decimal]:
        [line] = [
            line
            for key, line in details["staff_table"]["cost_results"].items()
            if key != "column_total" and line["info"]["name_role"] == name_role
        ]
        return {year: cents(cell["result"]) for year, cell in line["numeric"].items()}


class TestPricing(CurrencyFixture):
    def test_staff_costs_convert_as_the_workbook_converts_them(self):
        # The workbook's figures for the demo lines, at 1 AUD = 0.70285 USD:
        # its AUD figures (371,136.20, 382,182.89, 18,639.97, 19,199.17) with
        # each year's salary and the leave loading cap multiplied by the rate.
        # The B.6 line's leave loading is over the cap, so a cap left in AUD
        # would show here.
        self.assertEqual(self.patch("currency", "USD").status_code, 200)

        details = self.details()

        self.assertEqual(
            self.years(details, "Continuing academic"),
            {2027: Decimal("260853.08"), 2028: Decimal("268617.24"), 2029: 0},
        )
        self.assertEqual(
            self.years(details, "Casual professional"),
            {2027: Decimal("13101.11"), 2028: Decimal("13494.14"), 2029: 0},
        )
        self.assertEqual(
            cents(details["budget_summary"]["price_summary"]["staff_cost"]),
            Decimal("556065.56"),
        )

    def test_the_aud_figures_beside_them_are_the_same_costing_in_aud(self):
        self.patch("currency", "USD")

        aud = self.details()["budget_summary"]["in_aud"]

        self.assertEqual(
            cents(aud["price_summary"]["staff_cost"]), Decimal("791158.23")
        )
        self.assertEqual(
            [(row["year"], cents(row["amount"])) for row in aud["staff_cost_by_year"]],
            [
                (2027, Decimal("389776.17")),
                (2028, Decimal("401382.06")),
                (2029, Decimal("0.00")),
            ],
        )

    def test_non_staff_amounts_are_in_the_costings_currency(self):
        self.patch("currency", "USD")
        self.add_non_staff("1000")

        details = self.details()

        self.assertEqual(
            cents(details["budget_summary"]["price_summary"]["non_staff_cost"]),
            Decimal("1000.00"),
        )
        self.assertEqual(
            cents(
                details["budget_summary"]["in_aud"]["price_summary"]["non_staff_cost"]
            ),
            cents(Decimal(1000) / USD),
        )

    def test_the_lists_carry_the_price_in_aud(self):
        self.patch("currency", "USD")
        details = self.details()

        self.budget.refresh_from_db()
        self.assertEqual(
            self.budget.total_price_inc_gst,
            cents(
                details["budget_summary"]["in_aud"]["price_summary"][
                    "total_price_inc_gst"
                ]
            ),
        )

    def test_an_aud_costing_prices_as_before(self):
        details = self.details()

        self.assertEqual(details["budget_info"]["currency"], "AUD")
        self.assertEqual(details["budget_info"]["exchange_rate"], Decimal(1))
        self.assertEqual(
            cents(details["budget_summary"]["price_summary"]["staff_cost"]),
            Decimal("791158.23"),
        )


class TestTheRate(CurrencyFixture):
    def test_the_researchers_own_rate_is_used_instead_of_the_tables(self):
        self.patch("currency", "USD")

        response = self.patch("exchange_rate_override", "0.5")

        self.assertEqual(response.status_code, 200, response.content)
        info = self.details()["budget_info"]
        self.assertEqual(info["exchange_rate"], Decimal("0.5"))
        self.assertEqual(info["table_exchange_rate"], USD)

    def test_clearing_it_goes_back_to_the_tables(self):
        self.patch("currency", "USD")
        self.patch("exchange_rate_override", "0.5")

        response = self.patch("exchange_rate_override", None)

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.details()["budget_info"]["exchange_rate"], USD)

    def test_a_new_currency_starts_at_its_tables_rate(self):
        self.patch("currency", "USD")
        self.patch("exchange_rate_override", "0.5")

        self.patch("currency", "EUR")

        self.budget.refresh_from_db()
        self.assertIsNone(self.budget.exchange_rate_override)

    def test_an_aud_costing_has_no_rate_to_set(self):
        response = self.patch("exchange_rate_override", "0.5")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "exchange_rate_override")

    def test_an_unknown_currency_is_refused(self):
        response = self.patch("currency", "XYZ")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "currency")

    def test_a_rate_of_nothing_is_refused(self):
        self.patch("currency", "USD")

        response = self.patch("exchange_rate_override", "0")

        self.assertEqual(response.status_code, 400)


class TestEnteredAmountsKeepTheirValue(CurrencyFixture):
    """
    What the workbook's macro sets out to do when the currency or its rate
    changes: entered amounts go back to AUD at the old rate and on at the new
    one, so their AUD value holds.
    """

    def test_a_currency_change_moves_every_entered_amount(self):
        self.add_non_staff("1000")
        self.patch("cash_co_contribution", "200")
        Deliverable.objects.create(
            budget=self.budget,
            number=1,
            description="Report",
            deliverable_type=DeliverableType.objects.order_by("code").first(),
            invoice_amount=Decimal(500),
        )

        self.patch("currency", "USD")

        self.budget.refresh_from_db()
        self.assertEqual(YearAmount.objects.get().amount, Decimal("702.85"))
        self.assertEqual(self.budget.cash_co_contribution, Decimal("140.57"))
        self.assertEqual(
            self.budget.deliverables.get().invoice_amount, Decimal("351.43")
        )

    def test_a_rate_change_moves_them_by_the_change(self):
        self.patch("currency", "USD")
        self.add_non_staff("1000")

        self.patch("exchange_rate_override", "0.5")

        expected = (Decimal(1000) * Decimal("0.5") / USD).quantize(CENTS)
        self.assertEqual(YearAmount.objects.get().amount, expected)

    def test_and_back_again_to_aud(self):
        self.add_non_staff("1000")
        self.patch("currency", "USD")

        self.patch("currency", "AUD")

        self.assertEqual(YearAmount.objects.get().amount, Decimal("1000.00"))


class TestSubmission(CurrencyFixture):
    def change_usd_to(self, rate: str) -> None:
        apply_changes(
            [
                {
                    "table": "currencies",
                    "op": "update",
                    "lookup": {"code": "USD"},
                    "values": {"rate": rate},
                }
            ],
            note="",
            actor=self.admin,
        )

    def test_a_submitted_costing_keeps_the_rate_it_was_submitted_at(self):
        self.patch("currency", "USD")
        self.budget.refresh_from_db()
        before = cents(self.details()["budget_summary"]["price_summary"]["staff_cost"])
        submit_budget(self.owner, self.budget)

        self.change_usd_to("0.8")

        self.budget.refresh_from_db()
        after = self.details()
        self.assertEqual(after["budget_info"]["exchange_rate"], USD)
        self.assertEqual(
            cents(after["budget_summary"]["price_summary"]["staff_cost"]), before
        )

    def test_a_draft_follows_the_tables_rate(self):
        self.patch("currency", "USD")

        self.change_usd_to("0.8")

        self.assertEqual(self.details()["budget_info"]["exchange_rate"], Decimal("0.8"))


class TestTheTable(CurrencyFixture):
    def save(self, *changes: dict):
        return apply_changes(list(changes), note="", actor=self.admin)

    def test_the_currencies_are_lookup_tables_anyone_can_read(self):
        tables = self.client.get(reverse("lookups")).json()

        usd = next(row for row in tables["currencies"] if row["code"] == "USD")
        self.assertEqual(usd["name"], "United States Dollar")
        self.assertEqual(Decimal(str(usd["rate"])), USD)
        self.assertEqual(len(tables["currencies"]), 21)

    def test_aud_stays_at_one(self):
        with self.assertRaisesRegex(ValidationError, "always 1"):
            self.save(
                {
                    "table": "currencies",
                    "op": "update",
                    "lookup": {"code": "AUD"},
                    "values": {"rate": "1.1"},
                }
            )

    def test_aud_cant_be_removed(self):
        with self.assertRaisesRegex(ValidationError, "base currency"):
            self.save(
                {"table": "currencies", "op": "delete", "lookup": {"code": "AUD"}}
            )

    def test_a_currency_a_draft_is_priced_in_cant_be_removed(self):
        self.patch("currency", "USD")

        with self.assertRaisesRegex(
            ValidationError, "1 draft costing is priced in USD"
        ):
            self.save(
                {"table": "currencies", "op": "delete", "lookup": {"code": "USD"}}
            )

    def test_a_currency_nobody_uses_can_be_removed_and_added_back(self):
        self.save({"table": "currencies", "op": "delete", "lookup": {"code": "THB"}})
        current = LookupConfiguration.objects.get().current_version
        self.assertFalse(Currency.objects.filter(version=current, code="THB").exists())

        self.save(
            {
                "table": "currencies",
                "op": "create",
                "values": {"code": "THB", "name": "Thai Baht", "rate": "23.5"},
            }
        )
        self.assertEqual(
            Currency.objects.get(version=current, code="THB").rate, Decimal("23.5")
        )


class TestNewDraft(CurrencyFixture):
    def test_a_new_draft_keeps_the_currency_and_the_researchers_rate(self):
        self.patch("currency", "USD")
        self.patch("exchange_rate_override", "0.65")
        self.budget.refresh_from_db()
        Budget.objects.filter(id=self.budget.id).update(
            status=Budget.Status.REJECTED,
            lookup_version=LookupConfiguration.objects.get().current_version,
        )
        self.budget.refresh_from_db()

        draft = budget_clone.clone_budget(self.owner, self.budget)

        self.assertEqual(draft.currency, "USD")
        self.assertEqual(draft.exchange_rate_override, Decimal("0.65"))

    def test_a_currency_since_removed_keeps_the_rate_it_was_priced_at(self):
        self.patch("currency", "USD")
        self.budget.refresh_from_db()
        config = LookupConfiguration.objects.get()
        Budget.objects.filter(id=self.budget.id).update(
            status=Budget.Status.REJECTED, lookup_version=config.current_version
        )
        self.budget.refresh_from_db()
        # USD leaves the rates in a later version.
        create_lookup_version(config, self.admin)
        Currency.objects.filter(
            version=LookupConfiguration.objects.get().current_version, code="USD"
        ).delete()

        draft = budget_clone.clone_budget(self.owner, self.budget)

        self.assertEqual(draft.currency, "USD")
        self.assertEqual(draft.exchange_rate_override, USD)
