"""
The reason an in-kind cost is absorbed (#92).

The column on Adjust Price promised somewhere to write this and rendered an
em-dash on every row. A tick with no sentence beside it does not tell a
reviewer who decided the University would carry the cost, or on what grounds.
"""

from django.db.utils import IntegrityError
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    Budget,
    Department,
    Faculty,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    StaffCostLine,
    User,
)
from api.services.budget_update import update_non_staff, update_staff
from api.services.project import budget_defaults

REASON = "Absorbed from the school's research support fund."


class InKindReasonTestCase(TestCase):
    def setUp(self):
        faculty, _ = Faculty.objects.get_or_create(
            code="SCI", defaults={"name": "Science Faculty"}
        )
        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=faculty,
        )
        project = Project.objects.create(
            title="In kind",
            department=department,
            start_year=2026,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=User.objects.get_or_create(email="owner@unimelb.edu.au")[0],
        )
        self.budget = Budget.objects.create(project=project, **budget_defaults())
        self.staff = StaffCostLine.objects.create(
            budget=self.budget,
            name_role="Dr A",
            employment_type="Continuing",
            category="Academic",
            classification="Level A.1",
            time_basis="FTE",
        )
        self.category = NonStaffCostCategory.objects.create(
            ledger_id="9000",
            cost_category="Equipment",
            cost_subcategory="General",
        )
        self.non_staff = NonStaffCostLine.objects.create(
            budget=self.budget, category=self.category
        )

    def tick(self, line, on: bool = True) -> None:
        update = update_staff if isinstance(line, StaffCostLine) else update_non_staff
        update(self.budget, line.id, "in_kind", on, None)
        line.refresh_from_db()

    def set_reason(self, line, reason: str) -> None:
        update = update_staff if isinstance(line, StaffCostLine) else update_non_staff
        update(self.budget, line.id, "in_kind_reason", reason, None)
        line.refresh_from_db()

    # ------------------------------------------------------------ both lines

    def test_a_ticked_line_can_be_given_a_reason(self):
        for line in (self.staff, self.non_staff):
            with self.subTest(line=type(line).__name__):
                self.tick(line)

                self.set_reason(line, REASON)

                self.assertEqual(line.in_kind_reason, REASON)

    def test_an_unticked_line_cannot(self):
        for line in (self.staff, self.non_staff):
            with self.subTest(line=type(line).__name__):
                self.assertFalse(line.in_kind)

                with self.assertRaises(ValidationError):
                    self.set_reason(line, REASON)

                line.refresh_from_db()
                self.assertEqual(line.in_kind_reason, "")

    def test_unticking_clears_the_reason(self):
        for line in (self.staff, self.non_staff):
            with self.subTest(line=type(line).__name__):
                self.tick(line)
                self.set_reason(line, REASON)

                self.tick(line, on=False)

                # Not merely hidden: a reason for absorbing a cost nobody is
                # absorbing would read as though the line were still in-kind.
                self.assertEqual(line.in_kind_reason, "")

    def test_re_ticking_does_not_bring_the_old_reason_back(self):
        self.tick(self.staff)
        self.set_reason(self.staff, REASON)
        self.tick(self.staff, on=False)

        self.tick(self.staff)

        self.assertEqual(self.staff.in_kind_reason, "")

    def test_the_database_refuses_the_pair_whatever_the_service_does(self):
        # The services go through _set_in_kind, but the admin, a shell and a
        # data import do not. This is the line that actually holds.
        with self.assertRaises(IntegrityError):
            StaffCostLine.objects.create(
                budget=self.budget,
                name_role="Dr B",
                employment_type="Continuing",
                category="Academic",
                classification="Level A.1",
                time_basis="FTE",
                in_kind=False,
                in_kind_reason=REASON,
            )

    def test_the_reason_is_on_the_budget_read(self):
        from api.services.data_loader import build_staff_info_table

        self.tick(self.staff)
        self.set_reason(self.staff, REASON)

        table = build_staff_info_table([self.staff])

        self.assertEqual(table[self.staff.id]["in_kind_reason"], REASON)
