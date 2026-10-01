"""
Putting the rates back to an older version (#137).

Restores forward: a new version copied from the old one becomes current, and
nothing that already exists is rewritten.
"""

from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from api.models import (
    AuditLog,
    Budget,
    LookupChangeSet,
    LookupConfiguration,
    LookupVersion,
    SalaryRate,
)
from api.services.lookup_changes import apply_changes
from api.services.lookup_update import (
    get_versioned_models,
    list_versions,
    restore_version,
)
from api.tests.factories import make_budget, make_project, make_user, seed_lookups

LEVEL_A1 = {
    "classification": "Level A.1",
    "category": "Academic",
    "payroll_type": "Fortnight",
}


def rows(version_id: int) -> dict:
    """Every versioned row of one version, comparable across versions."""
    out = {}
    for model in get_versioned_models():
        out[model.__name__] = sorted(
            (
                tuple(
                    (f.name, getattr(row, f.name))
                    for f in model._meta.concrete_fields
                    if not f.primary_key and f.name != "version"
                )
                for row in model.objects.filter(version_id=version_id)
            ),
            # Some columns are nullable, and None does not sort against a number.
            key=repr,
        )
    return out


class RestoreVersionTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        seed_lookups()
        cls.admin = make_user(email="admin@unimelb.edu.au", groups=["superadmin"])
        cls.owner = make_user()

    def current(self) -> int:
        return LookupConfiguration.objects.get().current_version_id

    def rate(self) -> Decimal:
        return SalaryRate.objects.get(version_id=self.current(), **LEVEL_A1).rate

    def edit_rate(self, to: str) -> int:
        """An edit that has to mint a version, as one after an approval does."""
        LookupConfiguration.objects.update(referenced=True)
        apply_changes(
            [
                {
                    "table": "salary_rates",
                    "op": "update",
                    "lookup": LEVEL_A1,
                    "values": {"rate": to},
                }
            ],
            note="",
            actor=self.admin,
        )
        return self.current()

    def restore(self, version_id: int) -> int:
        return restore_version(version_id, self.admin)["version_id"]

    def test_restoring_mints_a_copy_and_leaves_the_original_alone(self):
        original = self.current()
        before = rows(original)
        self.edit_rate("99999.0000")

        restored = self.restore(original)

        self.assertNotEqual(restored, original)
        self.assertEqual(self.current(), restored)
        self.assertEqual(rows(restored), before)
        self.assertEqual(rows(original), before)
        self.assertEqual(self.rate(), Decimal("87266.1000"))

    def test_the_version_in_between_is_kept(self):
        original = self.current()
        edited = self.edit_rate("99999.0000")

        self.restore(original)

        self.assertTrue(LookupVersion.objects.filter(id=edited).exists())
        self.assertEqual(
            SalaryRate.objects.get(version_id=edited, **LEVEL_A1).rate,
            Decimal("99999.0000"),
        )

    def test_a_budget_stamped_with_the_edited_version_still_reads_it(self):
        from api.models import Department

        original = self.current()
        edited = self.edit_rate("99999.0000")
        project = make_project(
            self.owner,
            Department.objects.order_by("code").first(),
            title="Stmaped",
            end_year=2026,
        )
        budget = make_budget(project, lookup_version_id=edited)

        self.restore(original)

        budget.refresh_from_db()
        self.assertEqual(budget.lookup_version_id, edited)

    def a_costing(self) -> Budget:
        """A draft with one Level A.1 line, so it prices on the live rates."""
        from api.models import Department, StaffCostLine, YearAllocation

        project = make_project(
            self.owner,
            Department.objects.order_by("code").first(),
            title="Priced",
            end_year=2026,
        )
        budget = make_budget(project)
        line = StaffCostLine.objects.create(
            budget=budget,
            name_role="Dr A",
            employment_type="Continuing",
            **{k: v for k, v in LEVEL_A1.items() if k != "payroll_type"},
            time_basis="FTE",
        )
        YearAllocation.objects.create(staff_line=line, year=2026, time=Decimal("0.5"))
        return budget

    @staticmethod
    def price(budget: Budget) -> Decimal:
        from api.services.budget_details import get_budget_details

        summary = get_budget_details(budget)["budget_summary"]["price_summary"]
        return Decimal(str(summary["total_price_inc_gst"]))

    def test_a_new_costing_on_restored_rates_prices_as_it_did_on_the_original(self):
        version = self.current()
        original = self.price(self.a_costing())

        self.edit_rate("99999.0000")
        # The edit has to move the price, or matching it afterwards proves nothing.
        self.assertNotEqual(self.price(self.a_costing()), original)

        self.restore(version)

        self.assertEqual(self.price(self.a_costing()), original)

    def test_restoring_the_current_version_is_refused(self):
        with self.assertRaises(ValidationError):
            restore_version(self.current(), self.admin)

    def test_an_unknown_version_is_refused(self):
        with self.assertRaises(ValidationError):
            restore_version(987654, self.admin)

    def test_it_is_recorded_as_who_did_it_and_from_what(self):
        original = self.current()
        edited = self.edit_rate("99999.0000")

        restored = self.restore(original)

        self.assertEqual(LookupVersion.objects.get(id=restored).updated_by, self.admin)
        entry = AuditLog.objects.get(action="admin.lookup.restore")
        self.assertEqual(entry.detail, {"restored_from": original, "replaced": edited})

    def test_the_list_marks_the_current_one_newest_first(self):
        original = self.current()
        self.edit_rate("99999.0000")
        restored = self.restore(original)

        listed = list_versions()

        self.assertEqual(listed[0]["id"], restored)
        self.assertTrue(listed[0]["current"])
        self.assertEqual(sum(v["current"] for v in listed), 1)

    def test_it_says_who_was_priced_on_the_version_it_replaced(self):
        # #142: the costings an administrator may need to send back.
        original = self.current()
        edited = self.edit_rate("99999.0000")
        for status in ("hod_review", "dean_review", "approved", "rejected"):
            budget = self.a_costing()
            budget.status = status
            budget.lookup_version_id = edited
            budget.save(update_fields=["status", "lookup_version"])
        self.a_costing()  # a draft, never stamped

        restored = restore_version(original, self.admin)

        self.assertEqual(
            restored["replaced"],
            {"version_id": edited, "in_review": 2, "approved": 1},
        )


class RestoreRoutesTest(TestCase):
    """The endpoints sit behind the superadmin group."""

    def setUp(self):
        self.researcher = make_user("r@unimelb.edu.au", groups=["researcher"])
        self.admin = make_user("a@unimelb.edu.au", groups=["superadmin"])

    def test_a_researcher_is_refused(self):
        self.client.force_login(self.researcher)
        self.assertEqual(
            self.client.get("/api/admin/lookups/versions/").status_code, 403
        )

    def test_a_researcher_cannot_restore(self):
        self.client.force_login(self.researcher)
        current = LookupConfiguration.objects.get().current_version_id
        older = LookupVersion.objects.create()

        response = self.client.post(f"/api/admin/lookups/versions/{older.id}/restore/")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(LookupConfiguration.objects.get().current_version_id, current)

    def test_a_superadmin_lists_the_versions(self):
        self.client.force_login(self.admin)
        response = self.client.get("/api/admin/lookups/versions/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(v["current"] for v in response.json()["results"]))


class VersionHistoryRoutesTest(TestCase):
    """The history pages by cursor, sorts and filters on the server."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = make_user(
            "a@unimelb.edu.au", groups=["superadmin"], first_name="Ada", last_name="Ng"
        )
        cls.zed = make_user("z@unimelb.edu.au", groups=["superadmin"])
        cls.loaded = LookupConfiguration.objects.get().current_version
        cls.by_ada = LookupVersion.objects.create(updated_by=cls.admin)
        cls.by_zed = LookupVersion.objects.create(updated_by=cls.zed)
        LookupChangeSet.objects.create(
            version=cls.by_ada, saved_by=cls.admin, note="Fix the EBA", change_count=3
        )
        LookupChangeSet.objects.create(
            version=cls.by_ada, saved_by=cls.admin, note="", change_count=2
        )
        project = make_project()
        for _ in range(2):
            make_budget(project, lookup_version=cls.by_zed)

    def setUp(self):
        self.client.force_login(self.admin)

    def ids(self, **query) -> list[int]:
        response = self.client.get("/api/admin/lookups/versions/", query)
        self.assertEqual(response.status_code, 200, response.content)
        return [v["id"] for v in response.json()["results"]]

    def test_newest_first_a_page_at_a_time(self):
        response = self.client.get("/api/admin/lookups/versions/", {"limit": 2})
        page = response.json()
        self.assertEqual(
            [v["id"] for v in page["results"]], [self.by_zed.id, self.by_ada.id]
        )
        rest = self.client.get(page["next"]).json()
        self.assertEqual(rest["results"][0]["id"], self.loaded.id)

    def test_it_sorts_on_the_counts_and_who(self):
        self.assertEqual(self.ids(ordering="-changes")[0], self.by_ada.id)
        self.assertEqual(self.ids(ordering="-budgets_priced")[0], self.by_zed.id)
        # By name, or by email without one; the system's blank sorts first.
        self.assertEqual(
            self.ids(ordering="updated_by"),
            [self.loaded.id, self.by_ada.id, self.by_zed.id],
        )

    def test_it_refuses_a_sort_it_cannot_do(self):
        response = self.client.get("/api/admin/lookups/versions/", {"ordering": "note"})
        self.assertEqual(response.status_code, 400)

    def test_it_filters_by_who_made_it(self):
        self.assertEqual(self.ids(by="z@unimelb.edu.au"), [self.by_zed.id])
        self.assertEqual(
            self.ids(by=["system", "a@unimelb.edu.au"]),
            [self.by_ada.id, self.loaded.id],
        )

    def test_it_searches_notes_names_and_numbers(self):
        self.assertEqual(self.ids(q="eba"), [self.by_ada.id])
        self.assertEqual(self.ids(q="ada"), [self.by_ada.id])
        self.assertEqual(self.ids(q=f"#{self.by_zed.id}"), [self.by_zed.id])

    def test_it_filters_by_day(self):
        today = timezone.localdate().isoformat()
        self.assertEqual(len(self.ids(since=today, until=today)), 3)
        self.assertEqual(self.ids(until="2000-01-01"), [])

    def test_the_counts_ride_on_each_row(self):
        response = self.client.get("/api/admin/lookups/versions/")
        rows = {v["id"]: v for v in response.json()["results"]}
        self.assertEqual(rows[self.by_zed.id]["budgets_priced"], 2)
        self.assertEqual(len(rows[self.by_ada.id]["change_sets"]), 2)

    def test_one_version_by_id_and_the_current_one(self):
        one = self.client.get(f"/api/admin/lookups/versions/{self.by_ada.id}/")
        self.assertEqual(one.json()["updated_by_name"], "Ada Ng")
        current = self.client.get("/api/admin/lookups/versions/current/")
        self.assertEqual(current.json()["id"], self.loaded.id)
        self.assertTrue(current.json()["current"])

    def test_the_filter_options_name_and_count_every_maker(self):
        url = "/api/admin/lookups/versions/filters/"
        system = LookupVersion.objects.filter(updated_by__isnull=True).count()
        self.assertEqual(
            self.client.get(url).json()["by"],
            [
                {"value": "a@unimelb.edu.au", "label": "Ada Ng", "count": 1},
                {"value": "system", "count": system},
                {
                    "value": "z@unimelb.edu.au",
                    "label": "z@unimelb.edu.au",
                    "count": 1,
                },
            ],
        )

        # Counted against the search, but every maker still listed.
        searched = self.client.get(url, {"q": "EBA"}).json()["by"]
        counts = {option["value"]: option["count"] for option in searched}
        self.assertEqual(
            counts, {"a@unimelb.edu.au": 1, "system": 0, "z@unimelb.edu.au": 0}
        )
