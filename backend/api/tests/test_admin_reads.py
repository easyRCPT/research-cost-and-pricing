"""The console's read-only endpoints: audit log, project register, overview."""

from datetime import timedelta
from decimal import Decimal

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from api.models import (
    AuditLog,
    Budget,
    LookupConfiguration,
    LookupVersion,
    Project,
    User,
    UserOrgAssignment,
)
from api.services.audit import write_audit
from api.tests.factories import (
    make_budget,
    make_department,
    make_faculty,
    make_project,
    make_user,
)

ADMIN = "/api/admin/"


class ConsoleFixture(TestCase):
    def setUp(self):
        version = LookupVersion.objects.create()
        LookupConfiguration.objects.update(current_version=version)
        self.faculty = make_faculty("SCI", "Science Faculty")
        self.department = make_department(
            "SCI", self.faculty, name="Science", school="Science School"
        )
        self.admin = self.account("admin@unimelb.edu.au", "superadmin")
        self.ruth = self.account("ruth@unimelb.edu.au", "researcher")
        self.hod = self.account("hod@unimelb.edu.au", "staff")
        UserOrgAssignment.objects.create(
            user=self.hod, role="hod", department=self.department
        )
        self.client.force_login(self.admin)

    @staticmethod
    def account(email, group) -> User:
        return make_user(email, groups=[group])

    def a_project(self, owner, title="Project", statuses=("draft",)) -> Project:
        project = make_project(
            owner, self.department, title=title, start_year=2026, end_year=2026
        )
        for i, status in enumerate(statuses):
            budget = make_budget(
                project,
                status=status,
                total_price_inc_gst=Decimal(1000 * (i + 1)),
            )
            # Later in the list is touched later, so it is the current one.
            Budget.objects.filter(id=budget.id).update(
                updated_at=timezone.now() + timedelta(minutes=i)
            )
        return project

    def refused_to_everyone_else(self, path):
        for user in (self.ruth, self.hod):
            self.client.force_login(user)
            self.assertEqual(self.client.get(path).status_code, 403, user.email)
        self.client.force_login(self.admin)


class AuditTest(ConsoleFixture):
    def page(self, **query):
        return self.client.get(f"{ADMIN}audit/", query).json()

    def test_newest_first_with_the_actors_email(self):
        write_audit(self.admin, "admin.user.groups", "user", "1", {"added": ["staff"]})
        write_audit(None, "budget.submit", "budget", "2")

        rows = self.page()["results"]

        self.assertEqual(
            [r["action"] for r in rows], ["budget.submit", "admin.user.groups"]
        )
        self.assertIsNone(rows[0]["actor_email"])
        self.assertEqual(rows[1]["actor_email"], "admin@unimelb.edu.au")
        self.assertEqual(rows[1]["detail"], {"added": ["staff"]})

    def test_the_next_cursor_walks_the_whole_log_once(self):
        for i in range(5):
            write_audit(self.admin, f"a.{i}", "x", str(i))

        first = self.page(limit=2)
        self.assertIsNone(first["previous"])
        second = self.client.get(first["next"]).json()
        third = self.client.get(second["next"]).json()

        self.assertEqual(
            [r["action"] for p in (first, second, third) for r in p["results"]],
            [f"a.{i}" for i in range(4, -1, -1)],
        )
        self.assertIsNone(third["next"])

    def test_the_page_size_is_capped_at_500(self):
        for _ in range(3):
            write_audit(self.admin, "admin.user.update", "user", "1")
        self.assertEqual(len(self.page(limit=2)["results"]), 2)
        self.assertEqual(len(self.page(limit=501)["results"]), 3)

    def test_each_filter_takes_several_values(self):
        write_audit(self.admin, "admin.user.groups", "user", "1")
        write_audit(self.ruth, "admin.user.update", "user", "1")
        write_audit(self.admin, "budget.submit", "budget", "2")

        rows = self.client.get(
            f"{ADMIN}audit/?action=admin.user.groups&action=budget.submit"
        ).json()["results"]
        self.assertEqual(
            [r["action"] for r in rows], ["budget.submit", "admin.user.groups"]
        )
        rows = self.page(actor="ruth@unimelb.edu.au")["results"]
        self.assertEqual([r["action"] for r in rows], ["admin.user.update"])
        rows = self.page(object_type="budget")["results"]
        self.assertEqual([r["action"] for r in rows], ["budget.submit"])

    def test_the_day_range_is_inclusive(self):
        write_audit(self.admin, "a.old", "x", "1")
        write_audit(self.admin, "a.new", "x", "2")
        AuditLog.objects.filter(action="a.old").update(
            created_at=timezone.now() - timedelta(days=3)
        )
        today = timezone.localdate()

        self.assertEqual(
            [r["action"] for r in self.page(since=today)["results"]], ["a.new"]
        )
        self.assertEqual(
            [
                r["action"]
                for r in self.page(until=today - timedelta(days=3))["results"]
            ],
            ["a.old"],
        )

    def test_the_filters_are_read_off_the_log(self):
        self.assertEqual(
            self.client.get(f"{ADMIN}audit/filters/").json(),
            {"actor": [], "action": [], "object_type": []},
        )
        write_audit(self.admin, "b.two", "x", "1")
        write_audit(self.ruth, "a.one", "y", "1")
        write_audit(None, "b.two", "x", "2")

        self.assertEqual(
            self.client.get(f"{ADMIN}audit/filters/").json(),
            {
                "actor": [
                    {
                        "value": "admin@unimelb.edu.au",
                        "label": "admin@unimelb.edu.au",
                        "count": 1,
                    },
                    {
                        "value": "ruth@unimelb.edu.au",
                        "label": "ruth@unimelb.edu.au",
                        "count": 1,
                    },
                ],
                "action": [
                    {"value": "a.one", "count": 1},
                    {"value": "b.two", "count": 2},
                ],
                "object_type": [{"value": "x", "count": 2}, {"value": "y", "count": 1}],
            },
        )

    def test_each_filter_is_counted_against_the_others(self):
        write_audit(self.admin, "b.two", "x", "1")
        write_audit(self.ruth, "a.one", "y", "1")

        body = self.client.get(f"{ADMIN}audit/filters/", {"action": ["a.one"]}).json()

        # Its own values keep their counts, so a second can still be ticked.
        self.assertEqual([o["count"] for o in body["action"]], [1, 1])
        self.assertEqual([o["count"] for o in body["object_type"]], [0, 1])

    def test_nothing_edits_or_deletes_an_entry(self):
        write_audit(self.admin, "a.one", "x", "1")
        for method in (self.client.post, self.client.patch, self.client.delete):
            self.assertEqual(method(f"{ADMIN}audit/").status_code, 405)
        self.assertEqual(AuditLog.objects.count(), 1)

    def test_a_deactivated_actors_entries_stay_readable(self):
        write_audit(self.ruth, "a.one", "x", "1")
        User.objects.filter(id=self.ruth.id).update(is_active=False)
        (row,) = self.page()["results"]
        self.assertEqual(row["actor_email"], "ruth@unimelb.edu.au")

    def test_refused_to_researchers_and_heads(self):
        self.refused_to_everyone_else(f"{ADMIN}audit/")
        self.refused_to_everyone_else(f"{ADMIN}audit/filters/")


class RegisterTest(ConsoleFixture):
    def test_every_project_whoever_owns_it(self):
        self.a_project(self.ruth, "Ruth's")
        self.a_project(self.hod, "The head's")

        rows = self.client.get(f"{ADMIN}projects/").json()["results"]

        self.assertEqual({r["title"] for r in rows}, {"Ruth's", "The head's"})
        ruths = next(r for r in rows if r["title"] == "Ruth's")
        self.assertEqual(ruths["owner"]["email"], "ruth@unimelb.edu.au")

    def test_several_budgets_show_once_as_the_latest(self):
        self.a_project(self.ruth, statuses=("rejected", "rejected", "hod_review"))

        (row,) = self.client.get(f"{ADMIN}projects/").json()["results"]

        self.assertEqual(row["status"], "hod_review")
        self.assertEqual(row["budget_count"], 3)
        self.assertEqual(row["total_price_inc_gst"], 3000)

    def test_the_status_filter_reads_the_current_budget(self):
        self.a_project(self.ruth, "Resubmitted", statuses=("rejected", "hod_review"))
        self.a_project(self.ruth, "Still rejected", statuses=("rejected",))

        rows = self.client.get(f"{ADMIN}projects/", {"status": "rejected"}).json()[
            "results"
        ]

        self.assertEqual([r["title"] for r in rows], ["Still rejected"])

    def test_an_unknown_status_is_a_400(self):
        response = self.client.get(f"{ADMIN}projects/", {"status": "nonsense"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("nonsense", str(response.json()))

    def test_the_list_costs_the_same_whatever_its_length(self):
        def queries() -> int:
            with CaptureQueriesContext(connection) as captured:
                self.client.get(f"{ADMIN}projects/")
            return len(captured.captured_queries)

        self.a_project(self.ruth)
        few = queries()
        for _ in range(5):
            self.a_project(self.ruth, statuses=("draft", "draft"))
        self.assertEqual(queries(), few)

    def test_refused_to_researchers_and_heads(self):
        self.refused_to_everyone_else(f"{ADMIN}projects/")


class OverviewTest(ConsoleFixture):
    def test_counts_are_one_row_per_status_and_group(self):
        self.a_project(self.ruth, statuses=("draft",))
        self.a_project(self.ruth, statuses=("rejected", "approved"))
        make_user("nobody@unimelb.edu.au", is_active=False)

        body = self.client.get(f"{ADMIN}overview/").json()

        self.assertEqual(body["accounts"]["total"], 4)
        self.assertEqual(body["accounts"]["inactive"], 1)
        self.assertEqual(body["accounts"]["no_group"], 1)
        groups = {g["group"]: g["count"] for g in body["accounts"]["by_group"]}
        self.assertEqual(groups["superadmin"], 1)
        self.assertEqual(groups["researcher"], 1)

        statuses = {s["status"]: s["count"] for s in body["projects"]["by_status"]}
        self.assertEqual(list(statuses), [value for value, _ in Budget.Status.choices])
        self.assertEqual(statuses["draft"], 1)
        self.assertEqual(statuses["approved"], 1)
        self.assertEqual(statuses["rejected"], 0)
        self.assertEqual(body["projects"]["total"], 2)
        self.assertEqual(body["projects"]["faculties"], 1)

    def test_recent_is_the_last_eight_entries(self):
        for i in range(10):
            write_audit(self.admin, f"a.{i}", "x", str(i))

        recent = self.client.get(f"{ADMIN}overview/").json()["recent"]

        self.assertEqual(
            [r["action"] for r in recent], [f"a.{i}" for i in range(9, 1, -1)]
        )

    def test_the_versions_panel_names_the_current_one(self):
        versions = self.client.get(f"{ADMIN}overview/").json()["versions"]
        self.assertEqual(versions["total"], LookupVersion.objects.count())
        self.assertTrue(versions["latest"][0]["current"])
        self.assertEqual(
            versions["latest"][0]["id"],
            LookupConfiguration.objects.get().current_version_id,
        )

    def test_refused_to_researchers_and_heads(self):
        self.refused_to_everyone_else(f"{ADMIN}overview/")
