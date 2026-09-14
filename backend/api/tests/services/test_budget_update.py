from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase
from rest_framework.exceptions import ValidationError

from api.models import (
    Activity,
    Budget,
    Deliverable,
    DeliverableType,
    Department,
    NonStaffCostCategory,
    NonStaffCostLine,
    Project,
    Region,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)
from api.services import budget_update


class BudgetUpdateTestMixin:
    @staticmethod
    def create_department():
        return Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty="Science Faculty",
            faculty_code="SCI",
        )

    def create_project(self):
        return Project.objects.create(
            title="Test Project",
            department=self.create_department(),
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2026,
            end_month=12,
        )

    def create_budget(self):
        return Budget.objects.create(
            project=self.create_project(),
            cost_multiplier=Decimal("1.0"),
            in_kind_multiplier=Decimal("1.0"),
            margin=Decimal("0.30"),
            gst_applicable=True,
            cash_co_contribution=Decimal(0),
        )

    def create_staff_line(self, budget=None):
        if budget is None:
            budget = self.create_budget()

        return StaffCostLine.objects.create(
            budget=budget,
            name_role="Researcher",
            employment_type="Continuing",
            category="Academic",
            classification="Level A.1",
            time_basis="FTE",
            in_kind=False,
        )

    @staticmethod
    def create_non_staff_category():
        return NonStaffCostCategory.objects.create(
            ledger_id=1001,
            cost_category="Equipment",
            cost_subcategory="Equipment",
        )

    def create_non_staff_line(self, budget=None):
        if budget is None:
            budget = self.create_budget()

        return NonStaffCostLine.objects.create(
            budget=budget,
            category=self.create_non_staff_category(),
            description="Equipment",
            in_kind=False,
            add_ten_percent=False,
            indirect_rate_multiplier=None,
        )

    @staticmethod
    def create_deliverable_type():
        return DeliverableType.objects.create(
            code="REPORT",
            name="Report",
        )

    def create_deliverable(self, budget=None):
        if budget is None:
            budget = self.create_budget()

        return Deliverable.objects.create(
            budget=budget,
            number=1,
            description="Final report",
            deliverable_type=self.create_deliverable_type(),
            invoice_amount=Decimal(1000),
        )


class TestUpdateField(TestCase):
    @patch("api.services.budget_update.update_project")
    def test_updates_project_section(self, mock_update_project):
        mock_update_project.return_value = False

        budget = Mock(spec=Budget)
        data = {
            "section": "project",
            "field": "title",
            "value": "New Title",
        }

        result = budget_update.update_field(budget, data)

        mock_update_project.assert_called_once_with(
            budget,
            "title",
            "New Title",
        )
        self.assertIsNone(result)

    @patch("api.services.budget_update.update_budget")
    def test_returns_budget_details_when_calculation_is_required(
        self,
        mock_update_budget,
    ):
        mock_update_budget.return_value = True

        budget = Mock(spec=Budget)
        data = {
            "section": "budget",
            "field": "margin",
            "value": Decimal("0.25"),
        }

        with patch(
            "api.services.budget_update.get_budget_details"
        ) as mock_get_budget_details:
            mock_get_budget_details.return_value = {"result": "details"}

            result = budget_update.update_field(budget, data)

        mock_update_budget.assert_called_once_with(
            budget,
            "margin",
            Decimal("0.25"),
        )
        mock_get_budget_details.assert_called_once_with(budget)
        self.assertEqual(result, {"result": "details"})

    def test_requires_row_id_for_staff(self):
        budget = Mock(spec=Budget)
        data = {
            "section": "staff",
            "field": "name_role",
            "value": "Researcher",
        }

        with self.assertRaisesMessage(
            ValidationError,
            "row_id is required for staff.",
        ):
            budget_update.update_field(budget, data)

    def test_requires_row_id_for_non_staff(self):
        budget = Mock(spec=Budget)
        data = {
            "section": "non_staff",
            "field": "description",
            "value": "Equipment",
        }

        with self.assertRaisesMessage(
            ValidationError,
            "row_id is required for non_staff.",
        ):
            budget_update.update_field(budget, data)

    def test_requires_row_id_for_deliverable(self):
        budget = Mock(spec=Budget)
        data = {
            "section": "deliverable",
            "field": "description",
            "value": "Report",
        }

        with self.assertRaisesMessage(
            ValidationError,
            "row_id is required for deliverable.",
        ):
            budget_update.update_field(budget, data)

    def test_rejects_invalid_section(self):
        budget = Mock(spec=Budget)
        data = {
            "section": "invalid",
            "field": "title",
            "value": "Test",
        }

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid section: invalid",
        ):
            budget_update.update_field(budget, data)


class TestUpdateProject(SimpleTestCase):
    def setUp(self):
        self.project = Mock(spec=Project)
        self.budget = Mock(spec=Budget)
        self.budget.project = self.project

    def test_updates_non_calculation_field(self):
        result = budget_update.update_project(
            self.budget,
            "title",
            "New Title",
        )

        self.assertFalse(result)
        self.assertEqual(self.project.title, "New Title")
        self.project.full_clean.assert_called_once()
        self.project.save.assert_called_once_with(update_fields=["title"])

    def test_updates_calculation_field(self):
        result = budget_update.update_project(
            self.budget,
            "start_year",
            2026,
        )

        self.assertTrue(result)
        self.assertEqual(self.project.start_year, 2026)
        self.project.full_clean.assert_called_once()
        self.project.save.assert_called_once_with(update_fields=["start_year"])

    @patch("api.services.budget_update.Department.objects.get")
    def test_updates_department(self, mock_get):
        department = Mock(spec=Department)
        mock_get.return_value = department

        result = budget_update.update_project(
            self.budget,
            "department",
            "SCI",
        )

        self.assertFalse(result)
        mock_get.assert_called_once_with(pk="SCI")
        self.assertIs(self.project.department, department)
        self.project.save.assert_called_once_with(update_fields=["department"])

    @patch("api.services.budget_update.Department.objects.get")
    def test_rejects_invalid_department(self, mock_get):
        mock_get.side_effect = Department.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid department.",
        ):
            budget_update.update_project(
                self.budget,
                "department",
                "INVALID",
            )

    def test_rejects_non_string_department(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'department' must be a string.",
        ):
            budget_update.update_project(
                self.budget,
                "department",
                123,
            )

    @patch("api.services.budget_update.Activity.objects.get")
    def test_updates_activity(self, mock_get):
        activity = Mock(spec=Activity)
        mock_get.return_value = activity

        result = budget_update.update_project(
            self.budget,
            "activity",
            "ACT01",
        )

        self.assertFalse(result)
        self.assertIs(self.project.activity, activity)
        self.project.save.assert_called_once_with(update_fields=["activity"])

    def test_clears_activity(self):
        result = budget_update.update_project(
            self.budget,
            "activity",
            None,
        )

        self.assertFalse(result)
        self.assertIsNone(self.project.activity)
        self.project.save.assert_called_once_with(update_fields=["activity"])

    @patch("api.services.budget_update.Region.objects.get")
    def test_updates_region(self, mock_get):
        region = Mock(spec=Region)
        mock_get.return_value = region

        result = budget_update.update_project(
            self.budget,
            "region",
            "REG01",
        )

        self.assertFalse(result)
        self.assertIs(self.project.region, region)
        self.project.save.assert_called_once_with(update_fields=["region"])

    def test_rejects_invalid_project_field(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'invalid' cannot be updated.",
        ):
            budget_update.update_project(
                self.budget,
                "invalid",
                "value",
            )


class TestUpdateBudget(SimpleTestCase):
    def setUp(self):
        self.budget = Mock(spec=Budget)

    def test_updates_non_calculation_field(self):
        result = budget_update.update_budget(
            self.budget,
            "comments",
            "Updated comments",
        )

        self.assertFalse(result)
        self.assertEqual(
            self.budget.comments,
            "Updated comments",
        )
        self.budget.full_clean.assert_called_once()
        self.budget.save.assert_called_once_with(update_fields=["comments"])

    def test_updates_calculation_field(self):
        result = budget_update.update_budget(
            self.budget,
            "margin",
            Decimal("0.25"),
        )

        self.assertTrue(result)
        self.assertEqual(
            self.budget.margin,
            Decimal("0.25"),
        )
        self.budget.full_clean.assert_called_once()
        self.budget.save.assert_called_once_with(update_fields=["margin"])

    def test_rejects_invalid_field(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'invalid' cannot be updated.",
        ):
            budget_update.update_budget(
                self.budget,
                "invalid",
                "value",
            )


class TestUpdateStaff(SimpleTestCase):
    def setUp(self):
        self.budget = Mock(spec=Budget)
        self.staff_line = Mock(spec=StaffCostLine)
        self.budget.staff_lines.get.return_value = self.staff_line

    def test_updates_non_calculation_field(self):
        result = budget_update.update_staff(
            self.budget,
            1,
            "name_role",
            "Senior Researcher",
            None,
        )

        self.assertFalse(result)
        self.assertEqual(
            self.staff_line.name_role,
            "Senior Researcher",
        )
        self.staff_line.full_clean.assert_called_once()
        self.staff_line.save.assert_called_once_with(update_fields=["name_role"])

    def test_updates_calculation_field(self):
        result = budget_update.update_staff(
            self.budget,
            1,
            "classification",
            "Level A.2",
            None,
        )

        self.assertTrue(result)
        self.assertEqual(
            self.staff_line.classification,
            "Level A.2",
        )

    @patch("api.services.budget_update.update_year_allocation")
    def test_updates_year_value(self, mock_update):
        result = budget_update.update_staff(
            self.budget,
            1,
            "year_value",
            Decimal("0.5"),
            2025,
        )

        self.assertTrue(result)
        mock_update.assert_called_once_with(
            self.staff_line,
            2025,
            Decimal("0.5"),
        )

    def test_requires_year_for_year_value(self):
        with self.assertRaisesMessage(
            ValidationError,
            "year is required for year_value.",
        ):
            budget_update.update_staff(
                self.budget,
                1,
                "year_value",
                Decimal("0.5"),
                None,
            )

    def test_staff_line_not_found(self):
        self.budget.staff_lines.get.side_effect = StaffCostLine.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Staff cost line not found.",
        ):
            budget_update.update_staff(
                self.budget,
                1,
                "name_role",
                "Researcher",
                None,
            )

    def test_rejects_invalid_field(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'invalid' cannot be updated.",
        ):
            budget_update.update_staff(
                self.budget,
                1,
                "invalid",
                "value",
                None,
            )


class TestUpdateNonStaff(SimpleTestCase):
    def setUp(self):
        self.budget = Mock(spec=Budget)
        self.non_staff_line = Mock(spec=NonStaffCostLine)
        self.budget.non_staff_lines.get.return_value = self.non_staff_line

    def test_updates_non_calculation_field(self):
        result = budget_update.update_non_staff(
            self.budget,
            1,
            "description",
            "New description",
            None,
        )

        self.assertFalse(result)
        self.assertEqual(
            self.non_staff_line.description,
            "New description",
        )

    def test_updates_calculation_field(self):
        result = budget_update.update_non_staff(
            self.budget,
            1,
            "add_ten_percent",
            True,
            None,
        )

        self.assertTrue(result)
        self.assertTrue(self.non_staff_line.add_ten_percent)

    @patch("api.services.budget_update.NonStaffCostCategory.objects.get")
    def test_updates_category(self, mock_get):
        category = Mock(spec=NonStaffCostCategory)
        mock_get.return_value = category

        result = budget_update.update_non_staff(
            self.budget,
            1,
            "category",
            "1001",
            None,
        )

        self.assertTrue(result)
        mock_get.assert_called_once_with(pk="1001")
        self.assertIs(
            self.non_staff_line.category,
            category,
        )
        self.non_staff_line.save.assert_called_once_with(update_fields=["category"])

    def test_rejects_non_string_category(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'category' must be a string.",
        ):
            budget_update.update_non_staff(
                self.budget,
                1,
                "category",
                1001,
                None,
            )

    @patch("api.services.budget_update.NonStaffCostCategory.objects.get")
    def test_rejects_invalid_category(self, mock_get):
        mock_get.side_effect = NonStaffCostCategory.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid category.",
        ):
            budget_update.update_non_staff(
                self.budget,
                1,
                "category",
                "9999",
                None,
            )

    @patch("api.services.budget_update.update_year_amount")
    def test_updates_year_value(self, mock_update):
        result = budget_update.update_non_staff(
            self.budget,
            1,
            "year_value",
            Decimal(1000),
            2025,
        )

        self.assertTrue(result)
        mock_update.assert_called_once_with(
            self.non_staff_line,
            2025,
            Decimal(1000),
        )

    def test_requires_year_for_year_value(self):
        with self.assertRaisesMessage(
            ValidationError,
            "year is required for year_value.",
        ):
            budget_update.update_non_staff(
                self.budget,
                1,
                "year_value",
                Decimal(1000),
                None,
            )

    def test_non_staff_line_not_found(self):
        self.budget.non_staff_lines.get.side_effect = NonStaffCostLine.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Non-staff cost line not found.",
        ):
            budget_update.update_non_staff(
                self.budget,
                1,
                "description",
                "Equipment",
                None,
            )

    def test_rejects_invalid_field(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'invalid' cannot be updated.",
        ):
            budget_update.update_non_staff(
                self.budget,
                1,
                "invalid",
                "value",
                None,
            )


class TestUpdateDeliverable(SimpleTestCase):
    def setUp(self):
        self.budget = Mock(spec=Budget)
        self.deliverable = Mock(spec=Deliverable)
        self.budget.deliverables.get.return_value = self.deliverable

    def test_updates_non_calculation_field(self):
        result = budget_update.update_deliverable(
            self.budget,
            1,
            "description",
            "Updated report",
        )

        self.assertFalse(result)
        self.assertEqual(
            self.deliverable.description,
            "Updated report",
        )
        self.deliverable.full_clean.assert_called_once()
        self.deliverable.save.assert_called_once_with(update_fields=["description"])

    @patch("api.services.budget_update.DeliverableType.objects.get")
    def test_updates_deliverable_type(self, mock_get):
        deliverable_type = Mock(spec=DeliverableType)
        mock_get.return_value = deliverable_type

        result = budget_update.update_deliverable(
            self.budget,
            1,
            "deliverable_type",
            "REPORT",
        )

        self.assertFalse(result)
        mock_get.assert_called_once_with(pk="REPORT")
        self.assertIs(
            self.deliverable.deliverable_type,
            deliverable_type,
        )
        self.deliverable.save.assert_called_once_with(
            update_fields=["deliverable_type"]
        )

    def test_rejects_non_string_deliverable_type(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'deliverable_type' must be a string.",
        ):
            budget_update.update_deliverable(
                self.budget,
                1,
                "deliverable_type",
                123,
            )

    @patch("api.services.budget_update.DeliverableType.objects.get")
    def test_rejects_invalid_deliverable_type(self, mock_get):
        mock_get.side_effect = DeliverableType.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid deliverable type.",
        ):
            budget_update.update_deliverable(
                self.budget,
                1,
                "deliverable_type",
                "INVALID",
            )

    def test_deliverable_not_found(self):
        self.budget.deliverables.get.side_effect = Deliverable.DoesNotExist

        with self.assertRaisesMessage(
            ValidationError,
            "Deliverable not found.",
        ):
            budget_update.update_deliverable(
                self.budget,
                1,
                "description",
                "Report",
            )

    def test_rejects_invalid_field(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Field 'invalid' cannot be updated.",
        ):
            budget_update.update_deliverable(
                self.budget,
                1,
                "invalid",
                "value",
            )


class TestValidateYearAndConvertValue(SimpleTestCase):
    def setUp(self):
        self.project = Mock(spec=Project)
        self.project.start_year = 2025
        self.project.end_year = 2026

        self.line = Mock(spec=StaffCostLine)
        self.line.budget.project = self.project

    def test_converts_value_to_decimal(self):
        result = budget_update._validate_year_and_convert_value(
            self.line,
            2025,
            "100.50",
        )

        self.assertEqual(result, Decimal("100.50"))

    def test_accepts_decimal_value(self):
        result = budget_update._validate_year_and_convert_value(
            self.line,
            2025,
            Decimal("100.50"),
        )

        self.assertEqual(result, Decimal("100.50"))

    def test_returns_none_for_none_value(self):
        result = budget_update._validate_year_and_convert_value(
            self.line,
            2025,
            None,
        )

        self.assertIsNone(result)

    def test_rejects_year_before_project_start(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Year must be between 2025 and 2026.",
        ):
            budget_update._validate_year_and_convert_value(
                self.line,
                2024,
                "100",
            )

    def test_rejects_year_after_project_end(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Year must be between 2025 and 2026.",
        ):
            budget_update._validate_year_and_convert_value(
                self.line,
                2027,
                "100",
            )

    def test_rejects_invalid_number(self):
        with self.assertRaisesMessage(
            ValidationError,
            "Value for 2025 must be a valid number.",
        ):
            budget_update._validate_year_and_convert_value(
                self.line,
                2025,
                "invalid",
            )


class TestUpdateYearAllocation(BudgetUpdateTestMixin, TestCase):
    @patch("api.services.budget_update.check_time")
    def test_creates_year_allocation(self, mock_check_time):
        line = self.create_staff_line()

        budget_update.update_year_allocation(
            line,
            2025,
            "0.5",
        )

        allocation = YearAllocation.objects.get(
            staff_line=line,
            year=2025,
        )

        self.assertEqual(
            allocation.time,
            Decimal("0.5"),
        )
        mock_check_time.assert_called_once_with(
            line.time_basis,
            Decimal("0.5"),
        )

    @patch("api.services.budget_update.check_time")
    def test_updates_existing_year_allocation(
        self,
        mock_check_time,
    ):
        line = self.create_staff_line()

        allocation = YearAllocation.objects.create(
            staff_line=line,
            year=2025,
            time=Decimal("0.5"),
        )

        budget_update.update_year_allocation(
            line,
            2025,
            "0.8",
        )

        allocation.refresh_from_db()

        self.assertEqual(
            allocation.time,
            Decimal("0.8"),
        )
        mock_check_time.assert_called_once_with(
            line.time_basis,
            Decimal("0.8"),
        )

    def test_deletes_year_allocation_when_value_is_none(self):
        line = self.create_staff_line()

        YearAllocation.objects.create(
            staff_line=line,
            year=2025,
            time=Decimal("0.5"),
        )

        budget_update.update_year_allocation(
            line,
            2025,
            None,
        )

        self.assertFalse(
            YearAllocation.objects.filter(
                staff_line=line,
                year=2025,
            ).exists()
        )

    @patch("api.services.budget_update.check_time")
    def test_validates_time(self, mock_check_time):
        mock_check_time.side_effect = ValidationError("Invalid time.")

        line = self.create_staff_line()

        with self.assertRaisesMessage(
            ValidationError,
            "Invalid time.",
        ):
            budget_update.update_year_allocation(
                line,
                2025,
                "2",
            )

        self.assertFalse(
            YearAllocation.objects.filter(
                staff_line=line,
                year=2025,
            ).exists()
        )

    def test_rejects_year_outside_project_duration(self):
        line = self.create_staff_line()

        with self.assertRaisesMessage(
            ValidationError,
            "Year must be between 2025 and 2026.",
        ):
            budget_update.update_year_allocation(
                line,
                2027,
                "0.5",
            )


class TestUpdateYearAmount(BudgetUpdateTestMixin, TestCase):
    def test_creates_year_amount(self):
        line = self.create_non_staff_line()

        budget_update.update_year_amount(
            line,
            2025,
            "1000.50",
        )

        amount = YearAmount.objects.get(
            non_staff_line=line,
            year=2025,
        )

        self.assertEqual(
            amount.amount,
            Decimal("1000.50"),
        )

    def test_updates_existing_year_amount(self):
        line = self.create_non_staff_line()

        amount = YearAmount.objects.create(
            non_staff_line=line,
            year=2025,
            amount=Decimal(1000),
        )

        budget_update.update_year_amount(
            line,
            2025,
            "1500",
        )

        amount.refresh_from_db()

        self.assertEqual(
            amount.amount,
            Decimal(1500),
        )

    def test_deletes_year_amount_when_value_is_none(self):
        line = self.create_non_staff_line()

        YearAmount.objects.create(
            non_staff_line=line,
            year=2025,
            amount=Decimal(1000),
        )

        budget_update.update_year_amount(
            line,
            2025,
            None,
        )

        self.assertFalse(
            YearAmount.objects.filter(
                non_staff_line=line,
                year=2025,
            ).exists()
        )

    def test_rejects_year_outside_project_duration(self):
        line = self.create_non_staff_line()

        with self.assertRaisesMessage(
            ValidationError,
            "Year must be between 2025 and 2026.",
        ):
            budget_update.update_year_amount(
                line,
                2027,
                "1000",
            )
