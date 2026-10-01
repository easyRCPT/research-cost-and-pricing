"""
The reference tables, edited in place through the generic endpoint (#70, #144),
and drafts' non-staff lines kept on the rates drafts price against.
"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from api.models import (
    Activity,
    AuditLog,
    Budget,
    Department,
    Faculty,
    LookupConfiguration,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    Region,
    User,
    YearAmount,
)
from api.services import budget_clone, lookup_update
from api.services.budget_details import get_budget_details
from api.services.lookup_changes import apply_changes

SEED = str(Path(settings.BASE_DIR) / "seeds" / "lookups.json")


class ReferenceTablesTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", SEED, verbosity=0)
        cls.admin = User.objects.create(email="admin@unimelb.edu.au")
        cls.admin.groups.set(Group.objects.filter(name="superadmin"))
        cls.faculty = Faculty.objects.order_by("code")[0]

    def setUp(self):
        self.client.force_login(self.admin)

    def write(self, method: str, table: str, body: dict):
        return getattr(self.client, method)(
            reverse("lookup-table", args=[table]), body, "application/json"
        )

    def remove(self, table: str, key: str):
        return self.client.delete(reverse("lookup-row", args=[table, key]))

    def test_a_faculty_can_be_added_and_renamed(self):
        added = self.write(
            "post", "faculties", {"values": {"code": "NEW", "name": "New"}}
        )
        renamed = self.write(
            "patch",
            "faculties",
            {"lookup": {"code": "NEW"}, "values": {"name": "Renamed"}},
        )

        self.assertEqual(added.status_code, 201, added.content)
        self.assertEqual(renamed.status_code, 204, renamed.content)
        self.assertEqual(Faculty.objects.get(code="NEW").name, "Renamed")

    def test_a_duplicate_code_is_refused_on_the_code_field(self):
        response = self.write(
            "post",
            "faculties",
            {"values": {"code": self.faculty.code, "name": "Again"}},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "code")

    def test_a_code_cannot_be_changed(self):
        response = self.write(
            "patch",
            "faculties",
            {"lookup": {"code": self.faculty.code}, "values": {"code": "OTHER"}},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "code")
        self.assertTrue(Faculty.objects.filter(code=self.faculty.code).exists())

    def test_a_department_can_be_added_under_a_faculty_and_moved(self):
        other = Faculty.objects.exclude(code=self.faculty.code).order_by("code").first()
        assert other is not None
        added = self.write(
            "post",
            "departments",
            {
                "values": {
                    "code": "NEWDEPT",
                    "name": "New department",
                    "school": "School",
                    "school_code": "SCH",
                    "budget_unit": "BU",
                    "faculty_code": self.faculty.code,
                }
            },
        )
        moved = self.write(
            "patch",
            "departments",
            {"lookup": {"code": "NEWDEPT"}, "values": {"faculty_code": other.code}},
        )

        self.assertEqual(added.status_code, 201, added.content)
        self.assertEqual(moved.status_code, 204, moved.content)
        self.assertEqual(Department.objects.get(code="NEWDEPT").faculty, other)
        entry = AuditLog.objects.filter(action="admin.lookup.update").latest("id")
        self.assertEqual(entry.detail["before"], {"faculty": self.faculty.code})
        self.assertEqual(entry.detail["after"], {"faculty": other.code})

    def test_an_unused_row_can_be_removed_and_it_is_logged(self):
        Activity.objects.create(code="ACT_X", name="Unused")

        response = self.remove("activities", "ACT_X")

        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Activity.objects.filter(code="ACT_X").exists())
        entry = AuditLog.objects.get(action="admin.lookup.delete")
        self.assertEqual(entry.actor, self.admin)
        self.assertEqual(entry.detail["lookup"], {"code": "ACT_X"})
        self.assertEqual(entry.detail["before"], {"code": "ACT_X", "name": "Unused"})
        self.assertIsNone(entry.detail["after"])

    def test_a_row_in_use_is_refused_saying_what_uses_it(self):
        region = Region.objects.order_by("code").first()
        assert region is not None
        Project.objects.create(
            created_by=self.admin,
            department=Department.objects.order_by("code").first(),
            region=region,
            start_year=2027,
            start_month=1,
            end_year=2027,
            end_month=12,
        )

        response = self.remove("regions", region.code)

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "1 project uses this region", response.json()["errors"][0]["detail"]
        )
        self.assertTrue(Region.objects.filter(code=region.code).exists())

    def test_faculties_and_departments_are_never_removed(self):
        Faculty.objects.create(code="EMPTY", name="No departments")

        response = self.remove("faculties", "EMPTY")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Faculty.objects.filter(code="EMPTY").exists())

    def test_a_rate_table_cannot_be_removed_from_a_row_at_a_time(self):
        response = self.remove("eba_increases", "2026")

        self.assertEqual(response.status_code, 400)

    def test_a_researcher_is_refused(self):
        researcher = User.objects.create(email="researcher@unimelb.edu.au")
        researcher.groups.set(Group.objects.filter(name="researcher"))
        self.client.force_login(researcher)
        Activity.objects.create(code="ACT_X", name="Unused")

        response = self.remove("activities", "ACT_X")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(Activity.objects.filter(code="ACT_X").exists())

    def test_the_register_carries_each_projects_department_code(self):
        department = Department.objects.order_by("code").first()
        assert department is not None
        Project.objects.create(
            created_by=self.admin,
            department=department,
            start_year=2027,
            start_month=1,
            end_year=2027,
            end_month=12,
        )

        rows = self.client.get(reverse("admin-projects")).json()

        self.assertEqual(rows[0]["department_code"], department.code)


class DraftsFollowTheCategoriesTest(TestCase):
    """
    A non-staff line points at one version's category row. Drafts price on the
    current rates, so they move with the current version; submitted costings
    keep the version they were stamped with.
    """

    # Excluded from the 10% and the indirect rate when the flag is set.
    LEDGER = 5060

    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", SEED, verbosity=0)
        cls.admin = User.objects.create(email="admin@unimelb.edu.au")
        cls.owner = User.objects.create(email="owner@unimelb.edu.au")
        cls.version = LookupConfiguration.objects.get().current_version_id

    def setUp(self):
        # Rates are cached per version, and the cache outlives each test's
        # rolled-back database.
        cache.clear()
        self.addCleanup(cache.clear)

    def costing(self, status: str = "draft") -> Budget:
        budget = Budget.objects.create(
            project=Project.objects.create(
                created_by=self.owner,
                department=Department.objects.order_by("code").first(),
                start_year=2027,
                start_month=1,
                end_year=2027,
                end_month=12,
            ),
            status=status,
            lookup_version_id=None if status == "draft" else self.version,
            cost_multiplier=Decimal("1.70"),
            in_kind_multiplier=Decimal("1.70"),
            margin=Decimal("0.30"),
        )
        line = NonStaffCostLine.objects.create(
            budget=budget,
            category=NonStaffCostCategory.objects.get(
                version_id=self.version, ledger_id=self.LEDGER
            ),
            add_ten_percent=True,
        )
        YearAmount.objects.create(non_staff_line=line, year=2027, amount=Decimal(1000))
        return budget

    def exclude_category(self) -> int:
        """A set that starts a new version and excludes the category from the 10%."""
        LookupConfiguration.objects.update(referenced=True)
        return apply_changes(
            [
                {
                    "table": "non_staff_cost_categories",
                    "op": "update",
                    "lookup": {"ledger_id": self.LEDGER},
                    "values": {"excludes_additional_rate": True},
                }
            ],
            note="",
            actor=self.admin,
        )["version_id"]

    @staticmethod
    def non_staff_cost(budget: Budget) -> Decimal:
        summary = get_budget_details(budget)["budget_summary"]["price_summary"]
        return Decimal(str(summary["non_staff_cost"]))

    def test_a_draft_follows_a_category_changed_in_a_new_version(self):
        draft = self.costing()
        self.assertEqual(self.non_staff_cost(draft), Decimal(1100))

        new_version = self.exclude_category()

        line = draft.non_staff_lines.get()
        self.assertEqual(line.category.version_id, new_version)
        self.assertEqual(self.non_staff_cost(draft), Decimal(1000))

    def test_a_submitted_costing_keeps_its_stamped_category(self):
        submitted = self.costing(status="hod_review")

        self.exclude_category()

        self.assertEqual(
            submitted.non_staff_lines.get().category.version_id, self.version
        )
        self.assertEqual(self.non_staff_cost(submitted), Decimal(1100))

    def test_a_restore_moves_drafts_onto_the_restored_rates(self):
        draft = self.costing()
        self.exclude_category()

        lookup_update.restore_version(self.version, self.admin)

        self.assertEqual(self.non_staff_cost(draft), Decimal(1100))

    def test_a_new_draft_from_a_rejected_costing_takes_the_current_categories(self):
        rejected = self.costing(status="rejected")
        new_version = self.exclude_category()

        draft = budget_clone.clone_budget(self.owner, rejected)

        self.assertEqual(draft.non_staff_lines.get().category.version_id, new_version)
        self.assertEqual(self.non_staff_cost(draft), Decimal(1000))
