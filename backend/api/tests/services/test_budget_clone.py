from decimal import Decimal

from django.db import transaction
from django.test import TestCase

from api.exceptions import Conflict
from api.models import (
    AuditLog,
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    Faculty,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    StaffCostLine,
    User,
    YearAllocation,
    YearAmount,
)
from api.services.budget_clone import clone_budget

from .test_submission import ForceRollbackError


class BudgetCloneTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create_user(
            email="owner@example.com",
            password="password",
        )

        cls.faculty = Faculty.objects.create(
            code="SCI",
            name="Science Faculty",
        )

        cls.department = Department.objects.create(
            code="SCI-01",
            name="Science Department",
            school="Science School",
            school_code="SCI",
            faculty=cls.faculty,
        )

        cls.project = Project.objects.create(
            title="Test Project",
            department=cls.department,
            start_year=2026,
            start_month=1,
            end_year=2027,
            end_month=12,
            created_by=cls.owner,
        )

        cls.non_staff_category = NonStaffCostCategory.objects.create(
            ledger_id=1001,
            cost_category="Travel",
            cost_subcategory="Domestic Travel",
        )

        cls.deliverable_type = DeliverableType.objects.create(
            code="REPORT",
            name="Report",
        )

    def create_budget(
        self,
        *,
        status: str,
    ) -> Budget:
        return Budget.objects.create(
            project=self.project,
            status=status,
            cost_multiplier=Decimal("1.00"),
            in_kind_multiplier=Decimal("1.00"),
            margin=Decimal("0.3000"),
        )

    def test_clone_rejected_budget_creates_new_draft(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        clone = clone_budget(self.owner, source)

        self.assertNotEqual(
            clone.id,
            source.id,
        )

        self.assertEqual(
            clone.project,
            source.project,
        )

        self.assertEqual(
            clone.status,
            Budget.Status.DRAFT,
        )

        self.assertEqual(
            clone.cloned_from,
            source,
        )

        self.assertIsNone(
            clone.lookup_version,
        )

    def test_clone_copies_budget_fields(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        source.cost_multiplier = Decimal("1.20")
        source.in_kind_multiplier = Decimal("0.80")
        source.margin = Decimal("0.25")
        source.gst_applicable = False
        source.cash_co_contribution = Decimal(1000)
        source.comments = "test comment"

        source.save()

        clone = clone_budget(self.owner, source)

        self.assertEqual(
            clone.cost_multiplier,
            source.cost_multiplier,
        )

        self.assertEqual(
            clone.in_kind_multiplier,
            source.in_kind_multiplier,
        )

        self.assertEqual(
            clone.margin,
            source.margin,
        )

        self.assertEqual(
            clone.gst_applicable,
            source.gst_applicable,
        )

        self.assertEqual(
            clone.cash_co_contribution,
            source.cash_co_contribution,
        )

        self.assertEqual(
            clone.comments,
            source.comments,
        )

    def test_clone_copies_staff_lines_and_allocations(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        staff_line = StaffCostLine.objects.create(
            budget=source,
            name_role="Researcher",
            employment_type="Continuing",
            category="Academic",
            classification="Level B",
            time_basis=StaffCostLine.TimeBasis.FTE,
        )

        YearAllocation.objects.create(
            staff_line=staff_line,
            year=2026,
            time=Decimal("0.5000"),
        )

        clone = clone_budget(self.owner, source)

        cloned_line = clone.staff_lines.get()

        self.assertEqual(
            cloned_line.name_role,
            staff_line.name_role,
        )

        self.assertEqual(
            cloned_line.allocations.count(),
            1,
        )

        allocation = cloned_line.allocations.get()

        self.assertEqual(
            allocation.year,
            2026,
        )

        self.assertEqual(
            allocation.time,
            Decimal("0.5000"),
        )

    def test_clone_copies_non_staff_lines_and_amounts(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        non_staff_line = NonStaffCostLine.objects.create(
            budget=source,
            category=self.non_staff_category,
            description="Travel",
            in_kind=False,
            add_ten_percent=True,
            indirect_rate_multiplier=Decimal("1.10"),
        )

        YearAmount.objects.create(
            non_staff_line=non_staff_line,
            year=2026,
            amount=Decimal(500),
        )

        clone = clone_budget(self.owner, source)

        cloned_line = clone.non_staff_lines.get()

        self.assertEqual(
            cloned_line.description,
            non_staff_line.description,
        )

        self.assertEqual(
            cloned_line.amounts.count(),
            1,
        )

        amount = cloned_line.amounts.get()

        self.assertEqual(
            amount.year,
            2026,
        )

        self.assertEqual(
            amount.amount,
            Decimal(500),
        )

    def test_clone_copies_deliverables(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        deliverable = Deliverable.objects.create(
            budget=source,
            number=1,
            description="Final report",
            deliverable_type=self.deliverable_type,
            invoice_amount=Decimal(1000),
            due_date="2026-12",
            dependency=None,
            sponsor="Sponsor",
        )

        clone = clone_budget(self.owner, source)

        cloned = clone.deliverables.get()

        self.assertEqual(
            cloned.number,
            deliverable.number,
        )

        self.assertEqual(
            cloned.description,
            deliverable.description,
        )

        self.assertEqual(
            cloned.invoice_amount,
            deliverable.invoice_amount,
        )

    def test_clone_lines_are_independent(self) -> None:
        source = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        StaffCostLine.objects.create(
            budget=source,
            name_role="Original",
            employment_type="Continuing",
            category="Academic",
            classification="Level A",
            time_basis=StaffCostLine.TimeBasis.FTE,
        )

        clone = clone_budget(self.owner, source)

        cloned_line = clone.staff_lines.get()

        cloned_line.name_role = "Changed"
        cloned_line.save()

        source_line = source.staff_lines.get()

        self.assertEqual(
            source_line.name_role,
            "Original",
        )

    def test_cannot_clone_draft_budget(self) -> None:
        budget = self.create_budget(
            status=Budget.Status.DRAFT,
        )

        with self.assertRaises(Conflict):
            clone_budget(self.owner, budget)

    def test_cannot_clone_approved_budget(self) -> None:
        budget = self.create_budget(
            status=Budget.Status.APPROVED,
        )

        with self.assertRaises(Conflict):
            clone_budget(self.owner, budget)

    def test_clone_budget_creates_audit_log(self) -> None:
        source_budget = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        cloned_budget = clone_budget(
            user=self.owner,
            budget=source_budget,
        )

        audit = AuditLog.objects.get(
            action="budget.clone",
            object_type="budget",
            object_id=str(cloned_budget.id),
        )

        self.assertEqual(
            audit.actor,
            self.owner,
        )

        self.assertEqual(
            audit.detail["cloned_from"],
            source_budget.id,
        )

        self.assertEqual(
            audit.detail["after"]["status"],
            Budget.Status.DRAFT,
        )

    def test_failed_clone_does_not_create_audit_log(self) -> None:
        source_budget = self.create_budget(
            status=Budget.Status.REJECTED,
        )

        with self.assertRaises(ForceRollbackError), transaction.atomic():
            clone_budget(
                user=self.owner,
                budget=source_budget,
            )
            raise ForceRollbackError("force rollback")

        self.assertFalse(
            AuditLog.objects.filter(
                action="budget.clone",
            ).exists()
        )
