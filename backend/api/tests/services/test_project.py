from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import patch

from django.db.models import ProtectedError
from django.test import TestCase

from api.models import (
    Budget,
    CalculationConstant,
    Department,
    Faculty,
    LookupConfiguration,
    Project,
    User,
)
from api.services import budget_update
from api.services.project import budget_defaults, create, list_projects


def current_version():
    """The singleton the lookup versioning migration creates."""
    return LookupConfiguration.objects.get().current_version


class ProjectTestMixin:
    @staticmethod
    def create_department(code: str = "SCI") -> Department:
        return Department.objects.create(
            code=code,
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=Faculty.objects.get_or_create(
                code="SCI", defaults={"name": "Science Faculty"}
            )[0],
        )

    def project_data(self, **overrides) -> dict:
        return {
            "title": "Test Project",
            "department": self.create_department(),
            "funder": "Test Funder",
            "chief_investigator": "A. Researcher",
            "scheme": "",
            "start_year": 2026,
            "start_month": 1,
            "end_year": 2028,
            "end_month": 12,
            **overrides,
        }

    @staticmethod
    def owner() -> User:
        return User.objects.get_or_create(email="owner@unimelb.edu.au")[0]

    def create_project(self, department: Department, **overrides) -> Project:
        return Project.objects.create(
            **{
                "title": "Test Project",
                "department": department,
                "created_by": self.owner(),
                "funder": "Test Funder",
                "start_year": 2026,
                "start_month": 1,
                "end_year": 2028,
                "end_month": 12,
                **overrides,
            }
        )

    @staticmethod
    def create_budget(project: Project, **overrides) -> Budget:
        return Budget.objects.create(
            project=project,
            cost_multiplier=Decimal("1.70"),
            in_kind_multiplier=Decimal("1.70"),
            margin=Decimal("0.30"),
            **overrides,
        )

    @staticmethod
    def touch(budget: Budget, when: datetime) -> None:
        # queryset.update bypasses auto_now, which is the only way to place a
        # row at a chosen point in time.
        Budget.objects.filter(pk=budget.pk).update(updated_at=when)


class TestReference(ProjectTestMixin, TestCase):
    def test_allocated_on_creation(self):
        project = self.create_project(self.create_department())

        self.assertEqual(
            project.reference,
            f"RCP-{project.created_at.year}-{project.pk:04d}",
        )

    def test_survives_a_reload(self):
        project = self.create_project(self.create_department())

        self.assertEqual(
            Project.objects.get(pk=project.pk).reference,
            project.reference,
        )

    def test_projects_do_not_share_one(self):
        first = self.create_project(self.create_department("A"))
        second = self.create_project(self.create_department("B"))

        self.assertNotEqual(first.reference, second.reference)


class TestTouch(ProjectTestMixin, TestCase):
    def test_moves_the_edit_time(self):
        budget = self.create_budget(self.create_project(self.create_department()))
        self.touch(budget, datetime(2020, 1, 1, tzinfo=UTC))

        budget.touch()

        budget.refresh_from_db()
        self.assertGreater(
            budget.updated_at,
            datetime(2020, 1, 1, tzinfo=UTC),
        )

    def test_changes_nothing_else(self):
        budget = self.create_budget(
            self.create_project(self.create_department()),
            status=Budget.Status.APPROVED,
            total_price_exc_gst=Decimal("500.00"),
        )

        budget.touch()

        budget.refresh_from_db()
        self.assertEqual(budget.status, Budget.Status.APPROVED)
        self.assertEqual(budget.total_price_exc_gst, Decimal("500.00"))

    def test_a_line_edit_reaches_the_projects_list(self):
        # The point of touch(): a budget's own columns do not move when a cost
        # line is added, so without it the list would report a stale edit time.
        project = self.create_project(self.create_department())
        budget = self.create_budget(project)
        self.touch(budget, datetime(2020, 1, 1, tzinfo=UTC))

        before = list_projects(self.owner())[0]["updated_at"]
        budget.touch()
        after = list_projects(self.owner())[0]["updated_at"]

        self.assertGreater(after, before)


class TestDecimalFields(ProjectTestMixin, TestCase):
    """A JSON number reaching a DecimalField goes through its string form."""

    def setUp(self):
        self.budget = self.create_budget(self.create_project(self.create_department()))

    def update(self, field, value):
        # The write is what is under test; pricing it needs seeded constants.
        with patch.object(budget_update, "get_budget_details", return_value={}):
            budget_update.update_field(
                self.budget,
                {"section": "budget", "field": field, "value": value},
            )
        self.budget.refresh_from_db()

    def test_a_margin_that_has_no_exact_float(self):
        # Decimal(0.35) is 0.34999999999999997779..., which the field rejects.
        self.update("margin", 0.35)

        self.assertEqual(self.budget.margin, Decimal("0.35"))

    def test_a_multiplier_that_has_no_exact_float(self):
        # in_kind_multiplier rather than cost_multiplier: the cost multiplier
        # is not writable over HTTP, and this is about the decimal conversion.
        self.update("in_kind_multiplier", 1.15)

        self.assertEqual(self.budget.in_kind_multiplier, Decimal("1.15"))

    def test_a_whole_number_still_saves(self):
        self.update("cash_co_contribution", 5000)

        self.assertEqual(self.budget.cash_co_contribution, Decimal(5000))

    def test_a_non_decimal_field_is_left_alone(self):
        self.update("comments", "Priced for the pilot only")

        self.assertEqual(self.budget.comments, "Priced for the pilot only")


class TestBudgetDefaults(ProjectTestMixin, TestCase):
    def test_reads_the_constants(self):
        CalculationConstant.objects.create(
            name="full_cost_recovery_multiplier",
            value=Decimal("1.90"),
            version=current_version(),
        )
        CalculationConstant.objects.create(
            name="in_kind_multiplier",
            value=Decimal("1.25"),
            version=current_version(),
        )
        CalculationConstant.objects.create(
            name="default_margin",
            value=Decimal("0.25"),
            version=current_version(),
        )

        self.assertEqual(
            budget_defaults(),
            {
                "cost_multiplier": Decimal("1.90"),
                "in_kind_multiplier": Decimal("1.25"),
                # Four decimal places, not the multipliers' two.
                "margin": Decimal("0.2500"),
            },
        )

    def test_falls_back_when_a_constant_is_missing(self):
        self.assertEqual(
            budget_defaults(),
            {
                "cost_multiplier": Decimal("1.70"),
                "in_kind_multiplier": Decimal("1.70"),
                "margin": Decimal("0.3000"),
            },
        )


class TestCreate(ProjectTestMixin, TestCase):
    def test_creates_a_project_with_its_first_budget(self):
        row = create(self.project_data(), self.owner())

        project = Project.objects.get(pk=row["id"])
        budget = project.budgets.get()

        self.assertEqual(project.title, "Test Project")
        self.assertEqual(budget.status, Budget.Status.DRAFT)
        self.assertEqual(row["budget_id"], budget.id)
        self.assertEqual(row["budget_count"], 1)

    def test_seeds_the_budget_multipliers_from_the_constants(self):
        CalculationConstant.objects.create(
            name="full_cost_recovery_multiplier",
            value=Decimal("1.90"),
            version=current_version(),
        )

        row = create(self.project_data(), self.owner())
        budget = Project.objects.get(pk=row["id"]).budgets.get()

        self.assertEqual(budget.cost_multiplier, Decimal("1.90"))

    def test_seeds_the_budget_margin_from_the_constant(self):
        CalculationConstant.objects.create(
            name="default_margin",
            value=Decimal("0.25"),
            version=current_version(),
        )

        row = create(self.project_data(), self.owner())
        budget = Project.objects.get(pk=row["id"]).budgets.get()

        self.assertEqual(budget.margin, Decimal("0.2500"))

    def test_records_the_author(self):
        user = User.objects.create_user(email="researcher@unimelb.edu.au")

        row = create(self.project_data(), user)

        self.assertEqual(Project.objects.get(pk=row["id"]).created_by, user)

    def test_a_user_who_owns_a_project_cannot_be_deleted(self):
        user = User.objects.create_user(email="researcher@unimelb.edu.au")
        create(self.project_data(), user)

        with self.assertRaises(ProtectedError):
            user.delete()

    def test_the_new_project_has_a_reference(self):
        row = create(self.project_data(), self.owner())

        self.assertEqual(row["reference"], f"RCP-2026-{row['id']:04d}")


class TestListProjects(ProjectTestMixin, TestCase):
    def test_empty(self):
        self.assertEqual(list_projects(self.owner()), [])

    def test_reports_the_department_and_faculty_by_name(self):
        self.create_budget(self.create_project(self.create_department()))

        row = list_projects(self.owner())[0]

        self.assertEqual(row["department"], "Science")
        self.assertEqual(row["faculty"], "Science Faculty")

    def test_reports_the_most_recently_touched_budgets_status(self):
        project = self.create_project(self.create_department())
        older = self.create_budget(project, status=Budget.Status.APPROVED)
        newer = self.create_budget(project, status=Budget.Status.DRAFT)
        self.touch(older, datetime(2026, 1, 1, tzinfo=UTC))
        self.touch(newer, datetime(2026, 6, 1, tzinfo=UTC))

        row = list_projects(self.owner())[0]

        self.assertEqual(row["status"], Budget.Status.DRAFT)
        self.assertEqual(row["budget_id"], newer.id)
        self.assertEqual(row["budget_count"], 2)

    def test_reads_the_price_off_the_budget(self):
        project = self.create_project(self.create_department())
        self.create_budget(project, total_price_exc_gst=Decimal("12345.67"))

        self.assertEqual(
            list_projects(self.owner())[0]["total_price_exc_gst"],
            Decimal("12345.67"),
        )

    def test_renders_a_project_whose_budgets_are_gone(self):
        self.create_project(self.create_department())

        row = list_projects(self.owner())[0]

        self.assertIsNone(row["status"])
        self.assertIsNone(row["budget_id"])
        self.assertEqual(row["budget_count"], 0)
        self.assertEqual(row["total_price_exc_gst"], Decimal(0))

    def test_newest_activity_first(self):
        department = self.create_department()
        quiet = self.create_project(department, title="Quiet")
        busy = self.create_project(department, title="Busy")

        # Busy was made first in wall-clock terms once its budget moves ahead.
        self.touch(self.create_budget(quiet), datetime(2026, 1, 1, tzinfo=UTC))
        self.touch(self.create_budget(busy), datetime(2027, 1, 1, tzinfo=UTC))

        self.assertEqual(
            [row["title"] for row in list_projects(self.owner())],
            ["Busy", "Quiet"],
        )
