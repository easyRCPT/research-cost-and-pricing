"""
The full cost recovery multiplier is a rate an administrator sets (#149).

Priced end to end against the seeded rates: an edit reaches a draft the next
time it is priced, a submitted costing keeps the rate of the version it was
stamped with, and in-kind staff are costed at the same rate.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase

from api.models import AuditLog, Budget, Department, LookupConfiguration, User
from api.services import lookup_changes, project, staff_line
from api.services.budget_details import get_budget_details

MULTIPLIER = "full_cost_recovery_multiplier"


def staff_cost(details: dict) -> Decimal:
    return details["budget_summary"]["price_summary"]["staff_cost"]


def in_kind_staff_cost(details: dict) -> Decimal:
    return details["budget_summary"]["price_summary"]["in_kind_staff_cost"]


class TestCostMultiplier(TestCase):
    def setUp(self):
        # Rates are cached per version, and the cache outlives each test's
        # rolled-back database, so an edit in one test would leak into the next.
        cache.clear()
        self.addCleanup(cache.clear)
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        self.admin = User.objects.create_user("admin@unimelb.edu.au")

        row = project.create(
            {
                "title": "Multiplier",
                "department": Department.objects.order_by("code").first(),
                "start_year": 2027,
                "start_month": 1,
                "end_year": 2027,
                "end_month": 12,
            },
            User.objects.create_user("owner@unimelb.edu.au"),
        )
        self.budget = Budget.objects.get(project_id=row["id"])

        for in_kind in (False, True):
            staff_line.create(
                self.budget,
                {
                    "name_role": "In kind" if in_kind else "Paid",
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level B.6",
                    "time_basis": "FTE",
                    "in_kind": in_kind,
                    "in_kind_reason": "Faculty contribution" if in_kind else "",
                    "allocations": [{"year": 2027, "time": Decimal(1)}],
                },
            )

    def set_multiplier(self, value: str) -> None:
        # The rates cache is cleared once the set commits, so run that here.
        with self.captureOnCommitCallbacks(execute=True):
            lookup_changes.apply_changes(
                [
                    {
                        "table": "calculation_constants",
                        "op": "update",
                        "lookup": {"name": MULTIPLIER},
                        "values": {"value": value},
                    }
                ],
                note="",
                actor=self.admin,
            )

    def stamp_as_submitted(self) -> None:
        # What submit_budget does to the rates: the budget is frozen on the
        # current version, and the next edit starts a new one.
        config = LookupConfiguration.objects.get()
        self.budget.lookup_version = config.current_version
        self.budget.status = Budget.Status.HOD_REVIEW
        self.budget.save(update_fields=["lookup_version", "status"])
        config.referenced = True
        config.save(update_fields=["referenced"])

    def test_a_draft_is_priced_at_the_new_multiplier(self):
        before = staff_cost(get_budget_details(self.budget))

        self.set_multiplier("1.80")
        details = get_budget_details(self.budget)

        self.assertEqual(details["budget_info"]["cost_multiplier"], Decimal("1.80"))
        self.assertAlmostEqual(
            staff_cost(details), before / Decimal("1.7") * Decimal("1.8"), places=6
        )

    def test_in_kind_staff_are_priced_at_the_same_rate(self):
        before = in_kind_staff_cost(get_budget_details(self.budget))

        self.set_multiplier("1.80")
        details = get_budget_details(self.budget)

        self.assertEqual(details["budget_info"]["in_kind_multiplier"], Decimal("1.80"))
        self.assertAlmostEqual(
            in_kind_staff_cost(details),
            before / Decimal("1.7") * Decimal("1.8"),
            places=6,
        )

    def test_the_budget_records_the_rate_it_was_priced_at(self):
        self.set_multiplier("1.80")
        get_budget_details(self.budget)

        self.budget.refresh_from_db()
        self.assertEqual(self.budget.cost_multiplier, Decimal("1.80"))
        self.assertEqual(self.budget.in_kind_multiplier, Decimal("1.80"))

    def test_a_submitted_costing_keeps_its_stamped_multiplier(self):
        before = get_budget_details(self.budget)
        self.stamp_as_submitted()

        self.set_multiplier("1.80")
        after = get_budget_details(self.budget)

        self.assertEqual(after["budget_info"]["cost_multiplier"], Decimal("1.7"))
        self.assertEqual(staff_cost(after), staff_cost(before))
        self.assertEqual(
            after["budget_summary"]["price_summary"]["total_price_inc_gst"],
            before["budget_summary"]["price_summary"]["total_price_inc_gst"],
        )

    def test_the_change_is_audited_with_its_old_and_new_value(self):
        self.set_multiplier("1.80")

        entry = AuditLog.objects.get(action="admin.lookup.changes")
        self.assertEqual(entry.actor, self.admin)
        [change] = entry.detail["changes"]
        self.assertEqual(Decimal(change["before"]["value"]), Decimal("1.7"))
        self.assertEqual(Decimal(change["after"]["value"]), Decimal("1.8"))
