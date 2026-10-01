"""
Saving lookup edits as one reviewed set (#138).

A set is applied all at once or not at all, under the lock submission takes.
It writes into the current version until a costing is submitted on it; the
first set after that starts a new version.
"""

import threading
from decimal import Decimal
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from rest_framework.exceptions import ValidationError

from api.models import (
    AuditLog,
    Budget,
    CalculationConstant,
    Department,
    EbaIncrease,
    Faculty,
    LookupChangeSet,
    LookupConfiguration,
    LookupVersion,
    OnCostRate,
    Project,
    SalaryRate,
    StaffCostLine,
    User,
)
from api.services import lookup_changes
from api.services.lookup_changes import apply_changes
from api.services.lookup_update import create_lookup_version, list_versions
from api.services.submission import submit_budget

LEVEL_A1 = {
    "payroll_type": "Fortnight",
    "category": "Academic",
    "classification": "Level A.1",
}
LEVEL_A2 = {**LEVEL_A1, "classification": "Level A.2"}

# The rate a budget records it was last priced at; required on every budget.
PRICED_AT = {
    "cost_multiplier": Decimal("1.70"),
    "in_kind_multiplier": Decimal("1.70"),
    "margin": Decimal("0.30"),
}


def set_rate(key: dict, rate: str) -> dict:
    return {
        "table": "salary_rates",
        "op": "update",
        "lookup": key,
        "values": {"rate": rate},
    }


def set_constant(name: str, value: str) -> dict:
    return {
        "table": "calculation_constants",
        "op": "update",
        "lookup": {"name": name},
        "values": {"value": value},
    }


def refused_index(refusal: ValidationError) -> list[str]:
    """The indexes the refusal names, as the screen reads them."""
    detail = refusal.detail
    assert isinstance(detail, dict)
    return list(detail["changes"])


class RatesMixin:
    """
    The seeded rates, with nothing submitted on them. A whole set, because a
    set is refused if it would leave rates that cannot price a costing.
    """

    @classmethod
    def make_rates(cls):
        call_command(
            "loaddata",
            str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
            verbosity=0,
        )
        cls.admin = User.objects.create(email="admin@unimelb.edu.au")
        cls.config = LookupConfiguration.objects.get()
        # The seed is the baseline, which no set writes into, so the tests
        # work on an administrator's copy of it, as a database does once the
        # first set has been saved.
        cls.baseline = cls.config.current_version
        create_lookup_version(cls.config, cls.admin)
        cls.config.refresh_from_db()
        cls.version = cls.config.current_version
        # Round figures, so a change reads plainly in the assertions.
        for key in (LEVEL_A1, LEVEL_A2):
            SalaryRate.objects.filter(version=cls.version, **key).update(
                rate=Decimal(100000)
            )
        EbaIncrease.objects.create(version=cls.version, year=2030, rate=Decimal("0.03"))

    def current(self) -> int:
        return LookupConfiguration.objects.get().current_version_id

    def rate(self, key: dict, version_id: int | None = None) -> Decimal:
        return SalaryRate.objects.get(
            version_id=version_id or self.current(), **key
        ).rate

    def submitted_on_current(self):
        """What a submission does to the rates: the next set copies them."""
        LookupConfiguration.objects.update(referenced=True)

    def save(self, *changes: dict, note: str = "") -> dict:
        return apply_changes(list(changes), note=note, actor=self.admin)


class TestVersions(RatesMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def test_sets_with_no_submission_between_them_share_a_version(self):
        first = self.save(set_rate(LEVEL_A1, "110000"))
        second = self.save(set_rate(LEVEL_A2, "120000"))

        self.assertEqual(first["version_id"], self.version.id)
        self.assertEqual(second["version_id"], self.version.id)
        self.assertFalse(second["new_version"])
        self.assertIsNone(second["replaced"])
        self.assertEqual(self.rate(LEVEL_A1), Decimal(110000))
        self.assertEqual(self.rate(LEVEL_A2), Decimal(120000))
        self.assertEqual(
            LookupChangeSet.objects.filter(version=self.version).count(), 2
        )

    def test_the_first_set_after_a_submission_starts_a_new_version(self):
        self.submitted_on_current()

        saved = self.save(set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "120000"))

        self.assertTrue(saved["new_version"])
        self.assertNotEqual(saved["version_id"], self.version.id)
        self.assertEqual(self.current(), saved["version_id"])
        # The submitted costing's rates don't move.
        self.assertEqual(self.rate(LEVEL_A1, self.version.id), Decimal(100000))
        self.assertEqual(self.rate(LEVEL_A2, self.version.id), Decimal(100000))
        self.assertEqual(self.rate(LEVEL_A1), Decimal(110000))
        self.assertEqual(self.rate(LEVEL_A2), Decimal(120000))

    def test_a_new_version_takes_later_sets_until_the_next_submission(self):
        self.submitted_on_current()
        first = self.save(set_rate(LEVEL_A1, "110000"))
        versions = LookupVersion.objects.count()

        second = self.save(set_rate(LEVEL_A2, "120000"))

        self.assertEqual(second["version_id"], first["version_id"])
        self.assertEqual(LookupVersion.objects.count(), versions)

    def test_a_new_version_says_who_was_priced_on_the_one_it_replaced(self):
        owner = User.objects.create(email="owner@unimelb.edu.au")
        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science",
            school_code="SCI",
            faculty=Faculty.objects.create(code="SCI", name="Science"),
        )
        for status in ("hod_review", "submitted", "approved", "withdrawn"):
            Budget.objects.create(
                project=Project.objects.create(
                    created_by=owner,
                    department=department,
                    start_year=2027,
                    start_month=1,
                    end_year=2027,
                    end_month=12,
                ),
                status=status,
                lookup_version=self.version,
                **PRICED_AT,
            )
        self.submitted_on_current()

        saved = self.save(set_rate(LEVEL_A1, "110000"))

        self.assertEqual(
            saved["replaced"],
            {"version_id": self.version.id, "in_review": 2, "approved": 1},
        )

    def test_the_versions_list_shows_each_versions_sets(self):
        self.save(set_rate(LEVEL_A1, "110000"), note="2027 EBA increase")
        self.save(set_rate(LEVEL_A1, "111000"), set_rate(LEVEL_A2, "112000"))

        [listed] = [v for v in list_versions() if v["id"] == self.version.id]

        self.assertEqual(
            [
                (s["note"], s["saved_by"], s["change_count"])
                for s in listed["change_sets"]
            ],
            [("", self.admin.email, 2), ("2027 EBA increase", self.admin.email, 1)],
        )

    def test_the_versions_list_says_which_version_takes_the_next_set(self):
        listed = {v["id"]: v for v in list_versions()}
        self.assertTrue(listed[self.version.id]["accepts_changes"])

        self.submitted_on_current()

        listed = {v["id"]: v for v in list_versions()}
        self.assertFalse(listed[self.version.id]["accepts_changes"])
        self.assertFalse(any(v["accepts_changes"] for v in listed.values()))


class TestBaseline(RatesMixin, TestCase):
    """The rates as first loaded are kept, so they can always be restored."""

    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def make_baseline_current(self):
        LookupConfiguration.objects.update(
            current_version=self.baseline, referenced=False
        )

    def test_the_first_set_after_loading_starts_a_new_version(self):
        self.make_baseline_current()
        before = SalaryRate.objects.get(version=self.baseline, **LEVEL_A1).rate

        saved = self.save(set_rate(LEVEL_A1, "110000"))

        self.assertTrue(saved["new_version"])
        self.assertNotEqual(saved["version_id"], self.baseline.id)
        self.assertEqual(
            SalaryRate.objects.get(version=self.baseline, **LEVEL_A1).rate, before
        )
        self.assertEqual(self.rate(LEVEL_A1), Decimal(110000))

    def test_the_next_set_shares_that_new_version(self):
        self.make_baseline_current()
        first = self.save(set_rate(LEVEL_A1, "110000"))

        second = self.save(set_rate(LEVEL_A2, "120000"))

        self.assertEqual(second["version_id"], first["version_id"])
        self.assertFalse(second["new_version"])

    def test_the_versions_list_marks_the_baseline_and_says_it_takes_no_set(self):
        self.make_baseline_current()

        listed = {v["id"]: v for v in list_versions()}

        self.assertTrue(listed[self.baseline.id]["baseline"])
        self.assertFalse(listed[self.baseline.id]["accepts_changes"])
        self.assertFalse(listed[self.version.id]["baseline"])


class TestAllOrNothing(RatesMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def test_a_set_with_one_bad_change_saves_nothing(self):
        with self.assertRaises(ValidationError) as refused:
            self.save(
                set_rate(LEVEL_A1, "110000"),
                set_rate({**LEVEL_A1, "classification": "Level Z.9"}, "1"),
            )

        self.assertEqual(refused_index(refused.exception), ["1"])
        self.assertEqual(self.rate(LEVEL_A1), Decimal(100000))
        self.assertFalse(LookupChangeSet.objects.exists())
        self.assertFalse(AuditLog.objects.exists())

    def test_a_refused_set_starts_no_version(self):
        self.submitted_on_current()

        versions = LookupVersion.objects.count()

        with self.assertRaises(ValidationError):
            self.save(set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "-1"))

        self.assertEqual(LookupVersion.objects.count(), versions)
        self.assertEqual(self.current(), self.version.id)
        self.assertTrue(LookupConfiguration.objects.get().referenced)

    def test_an_invalid_value_names_its_change_and_field(self):
        with self.assertRaises(ValidationError) as refused:
            self.save(set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "-1"))

        self.assertIn("rate", refused.exception.detail["changes"]["1"])  # type: ignore[index]

    def test_a_duplicate_row_is_refused(self):
        with self.assertRaisesRegex(ValidationError, "already"):
            self.save(
                {
                    "table": "salary_rates",
                    "op": "create",
                    "values": {**LEVEL_A1, "rate": "1"},
                }
            )

    def test_a_row_is_named_by_its_key_not_its_id(self):
        # Ids change when a set copies the rates into a new version.
        row = SalaryRate.objects.get(version=self.version, **LEVEL_A1)

        with self.assertRaisesRegex(ValidationError, "payroll_type"):
            self.save(
                {
                    "table": "salary_rates",
                    "op": "update",
                    "lookup": {"id": row.pk},
                    "values": {"rate": "1"},
                }
            )

    def test_a_key_cannot_be_changed_in_place(self):
        with self.assertRaisesRegex(ValidationError, "names the row"):
            self.save(
                {
                    "table": "salary_rates",
                    "op": "update",
                    "lookup": LEVEL_A1,
                    "values": {"classification": "Level A.9"},
                }
            )

    def test_unknown_fields_are_refused(self):
        with self.assertRaisesRegex(ValidationError, "multiplier"):
            self.save(
                {
                    "table": "eba_increases",
                    "op": "update",
                    "lookup": {"year": 2030},
                    "values": {"multiplier": "1.03"},
                }
            )

    def test_a_table_that_does_not_price_costings_is_refused(self):
        with self.assertRaisesRegex(ValidationError, "does not price"):
            self.save(
                {
                    "table": "faculties",
                    "op": "create",
                    "values": {"code": "ENG", "name": "Engineering"},
                }
            )


class TestAddAndRemove(RatesMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def test_a_row_can_be_added(self):
        self.save(
            {
                "table": "eba_increases",
                "op": "create",
                "values": {"year": 2031, "rate": "0.035"},
            }
        )

        self.assertEqual(
            EbaIncrease.objects.get(version_id=self.current(), year=2031).rate,
            Decimal("0.035"),
        )

    def test_a_removed_row_is_gone_from_the_new_version_and_kept_in_the_old(self):
        self.submitted_on_current()

        saved = self.save(
            {"table": "eba_increases", "op": "delete", "lookup": {"year": 2030}}
        )

        self.assertFalse(
            EbaIncrease.objects.filter(
                version_id=saved["version_id"], year=2030
            ).exists()
        )
        self.assertTrue(
            EbaIncrease.objects.filter(version=self.version, year=2030).exists()
        )

    def test_time_basis_multipliers_cannot_be_removed(self):
        with self.assertRaisesRegex(ValidationError, "can't be removed"):
            self.save(
                {
                    "table": "salary_rate_multipliers",
                    "op": "delete",
                    "lookup": {"time_basis": "FTE"},
                }
            )

    def draft_line_on(self, classification: str, *, submitted: bool = False):
        owner = User.objects.create(email=f"{classification}@unimelb.edu.au")
        budget = Budget.objects.create(
            project=Project.objects.create(
                created_by=owner,
                department=Department.objects.order_by("code").first(),
                start_year=2027,
                start_month=1,
                end_year=2027,
                end_month=12,
            ),
            status="hod_review" if submitted else "draft",
            lookup_version=self.version if submitted else None,
            **PRICED_AT,
        )
        StaffCostLine.objects.create(
            budget=budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification=classification,
            time_basis="FTE",
        )

    def test_a_rate_a_draft_is_costed_at_cannot_be_removed(self):
        # Its line would be costed at nothing rather than refused.
        self.draft_line_on("Level A.1")

        with self.assertRaisesRegex(ValidationError, "1 draft staff line is costed"):
            self.save({"table": "salary_rates", "op": "delete", "lookup": LEVEL_A1})

        self.assertTrue(
            SalaryRate.objects.filter(version=self.version, **LEVEL_A1).exists()
        )

    def test_a_rate_only_submitted_costings_used_can_be_removed(self):
        # They keep the version they were stamped with, which still has it.
        self.draft_line_on("Level A.1", submitted=True)
        self.submitted_on_current()

        saved = self.save({"table": "salary_rates", "op": "delete", "lookup": LEVEL_A1})

        self.assertFalse(
            SalaryRate.objects.filter(
                version_id=saved["version_id"], **LEVEL_A1
            ).exists()
        )
        self.assertTrue(
            SalaryRate.objects.filter(version=self.version, **LEVEL_A1).exists()
        )

    def test_an_on_costs_default_rate_cannot_be_removed(self):
        lookup = {
            "on_cost_type": "workcover",
            "employment_type": "Casual",
            "year": None,
        }

        with self.assertRaisesRegex(ValidationError, "every year without one"):
            self.save({"table": "on_cost_rates", "op": "delete", "lookup": lookup})

    def test_a_set_that_would_leave_rates_unable_to_price_is_refused(self):
        # An on-cost rate for one year, with no rate for the years without one.
        with self.assertRaisesRegex(ValidationError, "cannot price a costing"):
            self.save(
                {
                    "table": "on_cost_rates",
                    "op": "create",
                    "values": {
                        "on_cost_type": "superannuation",
                        "employment_type": None,
                        "year": 2030,
                        "rate": "0.12",
                    },
                }
            )

        self.assertFalse(
            OnCostRate.objects.filter(
                version=self.version, employment_type=None
            ).exists()
        )


class TestConstants(RatesMixin, TestCase):
    """
    The constants can change value, within their ranges, but never be added,
    removed or renamed: the engine reads each one by name. The full cost
    recovery multiplier is an administrator's to set (#149).
    """

    MULTIPLIER = "full_cost_recovery_multiplier"

    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def value(self, name: str) -> Decimal:
        return CalculationConstant.objects.get(
            version_id=self.current(), name=name
        ).value

    def test_the_multiplier_can_be_changed(self):
        self.save(set_constant(self.MULTIPLIER, "1.80"))

        self.assertEqual(self.value(self.MULTIPLIER), Decimal("1.80"))

    def test_the_multiplier_below_one_is_refused(self):
        with self.assertRaisesRegex(ValidationError, "1.00"):
            self.save(set_constant(self.MULTIPLIER, "0.99"))

        self.assertEqual(self.value(self.MULTIPLIER), Decimal("1.70"))

    def test_the_multiplier_with_more_than_two_places_is_refused(self):
        with self.assertRaisesRegex(ValidationError, "two decimal places"):
            self.save(set_constant(self.MULTIPLIER, "1.725"))

    def test_the_multiplier_cannot_be_removed(self):
        with self.assertRaisesRegex(ValidationError, "can't be removed"):
            self.save(
                {
                    "table": "calculation_constants",
                    "op": "delete",
                    "lookup": {"name": self.MULTIPLIER},
                }
            )

        self.assertEqual(self.value(self.MULTIPLIER), Decimal("1.70"))

    def test_a_constant_cannot_be_added(self):
        with self.assertRaisesRegex(ValidationError, "can't be added"):
            self.save(
                {
                    "table": "calculation_constants",
                    "op": "create",
                    "values": {"name": "new_constant", "value": "1"},
                }
            )

    def test_a_constant_cannot_be_renamed(self):
        with self.assertRaisesRegex(ValidationError, "names the row"):
            self.save(
                {
                    "table": "calculation_constants",
                    "op": "update",
                    "lookup": {"name": "default_margin"},
                    "values": {"name": "renamed"},
                }
            )

    def test_other_constants_are_editable(self):
        self.save(set_constant("default_margin", "0.25"))

        self.assertEqual(self.value("default_margin"), Decimal("0.25"))

    def test_salary_rate_year_takes_a_whole_year(self):
        self.save(set_constant("salary_rate_year", "2026"))

        self.assertEqual(self.value("salary_rate_year"), Decimal(2026))

    def test_salary_rate_year_refuses_zero_negative_and_fractions(self):
        for value in ("0", "-1", "2025.5"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                self.save(set_constant("salary_rate_year", value))

        self.assertEqual(self.value("salary_rate_year"), Decimal(2025))


class TestRateConstants(RatesMixin, TestCase):
    """The rate constants are decimals from 0 to 1 (#151)."""

    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def value(self, name: str) -> Decimal:
        return CalculationConstant.objects.get(
            version_id=self.current(), name=name
        ).value

    def test_a_rate_is_saved_as_its_decimal(self):
        self.save(set_constant("minimum_margin", "0.25"))

        self.assertEqual(self.value("minimum_margin"), Decimal("0.25"))

    def test_a_bare_percentage_is_refused_with_the_decimal_it_meant(self):
        with self.assertRaises(ValidationError) as refused:
            self.save(set_constant("minimum_margin", "25"))

        message = str(refused.exception)
        self.assertIn("Minimum margin is a decimal from 0 to 1", message)
        self.assertIn("Did you mean 25%? Enter 0.25 or 25%.", message)
        self.assertEqual(self.value("minimum_margin"), Decimal("0.300000"))

    def test_every_rate_is_held_between_0_and_1(self):
        for name in (
            "default_margin",
            "minimum_margin",
            "gst_rate",
            "max_payroll_tax",
            "override_uom_oncosts",
        ):
            for value in ("-0.01", "1.01"):
                with (
                    self.subTest(name=name, value=value),
                    self.assertRaises(ValidationError),
                ):
                    self.save(set_constant(name, value))

    def test_leave_loading_is_dollars_and_can_be_above_1(self):
        self.save(set_constant("max_leave_loading", "1700"))

        self.assertEqual(self.value("max_leave_loading"), Decimal(1700))

        with self.assertRaisesRegex(ValidationError, "negative"):
            self.save(set_constant("max_leave_loading", "-1"))


class TestAudit(RatesMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.make_rates()

    def test_one_entry_per_set_with_every_change(self):
        self.submitted_on_current()

        saved = self.save(
            set_rate(LEVEL_A1, "110000"),
            {
                "table": "eba_increases",
                "op": "create",
                "values": {"year": 2031, "rate": "0.035"},
            },
            {"table": "eba_increases", "op": "delete", "lookup": {"year": 2030}},
            note="2027 EBA increase",
        )

        [entry] = AuditLog.objects.all()
        self.assertEqual(entry.action, "admin.lookup.changes")
        self.assertEqual(entry.actor, self.admin)
        self.assertEqual(entry.object_id, str(saved["change_set_id"]))
        self.assertEqual(entry.detail["version"], saved["version_id"])
        self.assertEqual(entry.detail["started_from"], self.version.id)
        self.assertEqual(entry.detail["note"], "2027 EBA increase")

        updated, added, removed = entry.detail["changes"]
        self.assertEqual(updated["key"], LEVEL_A1)
        self.assertEqual(Decimal(updated["before"]["rate"]), Decimal(100000))
        self.assertEqual(Decimal(updated["after"]["rate"]), Decimal(110000))
        self.assertIsNone(added["before"])
        self.assertEqual(added["after"]["year"], 2031)
        self.assertEqual(Decimal(added["after"]["rate"]), Decimal("0.035"))
        self.assertEqual(removed["key"], {"year": 2030})
        self.assertEqual(Decimal(removed["before"]["rate"]), Decimal("0.03"))
        self.assertIsNone(removed["after"])

    def test_a_set_into_the_current_version_started_nothing(self):
        self.save(set_rate(LEVEL_A1, "110000"))

        self.assertIsNone(AuditLog.objects.get().detail["started_from"])

    def test_the_version_a_set_starts_names_who_saved_it(self):
        self.submitted_on_current()

        saved = self.save(set_rate(LEVEL_A1, "110000"))

        self.assertEqual(
            LookupVersion.objects.get(id=saved["version_id"]).updated_by, self.admin
        )


class TestRoutes(RatesMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.make_rates()
        cls.admin.groups.set(Group.objects.filter(name="superadmin"))

    def post(self, body: dict):
        return self.client.post(
            reverse("admin-lookup-changes"), body, "application/json"
        )

    def test_a_set_is_saved_in_one_request(self):
        self.client.force_login(self.admin)

        response = self.post(
            {
                "note": "  Two rates  ",
                "changes": [set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "120000")],
            }
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            response.json(),
            {
                "change_set_id": LookupChangeSet.objects.get().id,
                "version_id": self.version.id,
                "new_version": False,
                "replaced": None,
            },
        )
        self.assertEqual(LookupChangeSet.objects.get().note, "Two rates")

    def test_a_row_named_with_a_blank_key_field_can_be_changed(self):
        # An on-cost's rate for every year has no year: its key holds a null.
        self.client.force_login(self.admin)
        lookup = {
            "on_cost_type": "annual_leave_provision",
            "employment_type": "Casual",
            "year": None,
        }

        response = self.post(
            {
                "changes": [
                    {
                        "table": "on_cost_rates",
                        "op": "update",
                        "lookup": lookup,
                        "values": {"rate": "0.0007"},
                    }
                ]
            }
        )

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            OnCostRate.objects.get(version_id=self.current(), **lookup).rate,
            Decimal("0.0007"),
        )

    def test_a_refusal_names_the_change_by_its_index(self):
        self.client.force_login(self.admin)

        response = self.post(
            {"changes": [set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "-5")]}
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "changes.1.rate")
        self.assertEqual(self.rate(LEVEL_A1), Decimal(100000))

    def test_an_empty_set_is_refused(self):
        self.client.force_login(self.admin)

        self.assertEqual(self.post({"changes": []}).status_code, 400)

    def test_a_researcher_is_refused(self):
        researcher = User.objects.create(email="researcher@unimelb.edu.au")
        researcher.groups.set(Group.objects.filter(name="researcher"))
        self.client.force_login(researcher)

        response = self.post({"changes": [set_rate(LEVEL_A1, "1")]})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.rate(LEVEL_A1), Decimal(100000))


class TestVersionBudgets(RatesMixin, TestCase):
    """Which costings were priced on a version (#142)."""

    @classmethod
    def setUpTestData(cls):
        cls.make_rates()
        cls.admin.groups.set(Group.objects.filter(name="superadmin"))
        owner = User.objects.create(email="owner@unimelb.edu.au", first_name="Ada")
        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science",
            school_code="SCI",
            faculty=Faculty.objects.create(code="SCI", name="Science"),
        )

        def costing(title: str, status: str, version: LookupVersion | None) -> Budget:
            return Budget.objects.create(
                project=Project.objects.create(
                    title=title,
                    created_by=owner,
                    department=department,
                    start_year=2027,
                    start_month=1,
                    end_year=2027,
                    end_month=12,
                ),
                status=status,
                lookup_version=version,
                **PRICED_AT,
            )

        cls.in_review = costing("In review", "hod_review", cls.version)
        cls.approved = costing("Approved", "approved", cls.version)
        costing("A draft", "draft", None)
        costing("Elsewhere", "approved", LookupVersion.objects.create())

    def get(self, version_id: int):
        return self.client.get(
            reverse("admin-lookup-version-budgets", args=[version_id])
        )

    def test_a_version_lists_exactly_the_costings_stamped_with_it(self):
        self.client.force_login(self.admin)

        response = self.get(self.version.id)

        self.assertEqual(response.status_code, 200, response.content)
        listed = response.json()
        self.assertEqual(
            sorted(row["title"] for row in listed), ["Approved", "In review"]
        )
        row = next(row for row in listed if row["title"] == "In review")
        self.assertEqual(row["status"], "hod_review")
        self.assertEqual(row["owner"]["email"], "owner@unimelb.edu.au")
        self.assertEqual(row["project_id"], self.in_review.project_id)

    def test_an_unknown_version_is_refused(self):
        self.client.force_login(self.admin)

        self.assertEqual(self.get(987654).status_code, 400)

    def test_a_researcher_is_refused(self):
        researcher = User.objects.create(email="researcher@unimelb.edu.au")
        researcher.groups.set(Group.objects.filter(name="researcher"))
        self.client.force_login(researcher)

        self.assertEqual(self.get(self.version.id).status_code, 403)


class TestSubmissionDuringASet(RatesMixin, TransactionTestCase):
    """
    A costing is priced entirely before a set or entirely after it, never on
    some of its changes. Real threads on real connections, because the lock
    is the thing under test.
    """

    def setUp(self):
        self.make_rates()
        owner = User.objects.create(email="owner@unimelb.edu.au")
        self.budget = Budget.objects.create(
            project=Project.objects.create(
                created_by=owner,
                department=Department.objects.create(
                    code="SCI",
                    name="Science",
                    school="Science",
                    school_code="SCI",
                    faculty=Faculty.objects.create(code="SCI", name="Science"),
                ),
                start_year=2027,
                start_month=1,
                end_year=2027,
                end_month=12,
            ),
            **PRICED_AT,
        )
        self.owner = owner

    def test_a_submission_waits_for_a_set_in_progress(self):
        halfway = threading.Event()
        carry_on = threading.Event()
        errors: list[Exception] = []
        update = lookup_changes.APPLY["update"]

        def pausing_update(definition, version_id, change):
            entry = update(definition, version_id, change)
            if change["lookup"] == LEVEL_A1:
                halfway.set()
                carry_on.wait(10)
            return entry

        def in_thread(work):
            def run():
                try:
                    work()
                # Anything at all: a thread cannot fail the test itself, so
                # its error is handed to the main thread to assert on.
                except Exception as exc:  # noqa: BLE001
                    errors.append(exc)
                finally:
                    connection.close()

            return threading.Thread(target=run)

        saving = in_thread(
            lambda: self.save(
                set_rate(LEVEL_A1, "110000"), set_rate(LEVEL_A2, "120000")
            )
        )
        submitting = in_thread(
            lambda: submit_budget(self.owner, Budget.objects.get(id=self.budget.id))
        )

        with patch.dict(lookup_changes.APPLY, {"update": pausing_update}):
            saving.start()
            self.assertTrue(halfway.wait(10))
            submitting.start()
            # Halfway through the set, the submission is held at the lock.
            submitting.join(1)
            self.assertTrue(submitting.is_alive())
            carry_on.set()
            saving.join(10)
            submitting.join(10)

        self.assertEqual(errors, [])
        stamped = Budget.objects.get(id=self.budget.id).lookup_version_id
        self.assertEqual(self.rate(LEVEL_A1, stamped), Decimal(110000))
        self.assertEqual(self.rate(LEVEL_A2, stamped), Decimal(120000))
