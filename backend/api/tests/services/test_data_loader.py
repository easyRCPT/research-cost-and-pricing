from datetime import date
from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from api.models import (
    Activity,
    Budget,
    Department,
    Deliverable,
    DeliverableType,
    NonStaffCostLine,
    Project,
    Region,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)
from api.services.data_loader import (
    build_budget_info,
    build_non_staff_info_table,
    build_non_staff_numeric_table,
    build_project_info,
    build_staff_info_table,
    build_staff_numeric_table,
    load_budget_data,
)


class TestBuildProjectInfo(SimpleTestCase):
    def setUp(self):
        self.department = Mock(spec=Department)
        self.department.name = "Science"
        self.department.faculty = "Science Faculty"
        self.department.code = "SCI"

        self.activity = Mock(spec=Activity)
        self.activity.code = "ACT01"

        self.region = Mock(spec=Region)
        self.region.code = "REG01"

        self.project = Mock(spec=Project)
        self.project.title = "Test Project"
        self.project.chief_investigator = "John Smith"
        self.project.funder = "Test Funder"
        self.project.department = self.department
        self.project.scheme = "Research Scheme"
        self.project.start_year = 2025
        self.project.start_month = 1
        self.project.end_year = 2026
        self.project.end_month = 12
        self.project.COMPANY_CODE = "C001"
        self.project.activity = self.activity
        self.project.region = self.region
        self.project.additional_information = "Additional information"
        self.project.other_funder = "Other Funder"
        self.project.other_funder_category = "Other Category"
        self.project.account_string = "C001-SCI"

    def test_builds_project_info(self):
        result = build_project_info(self.project)

        self.assertEqual(
            result,
            {
                "title": "Test Project",
                "chief_investigator": "John Smith",
                "funder": "Test Funder",
                "department": "Science",
                "faculty": "Science Faculty",
                "scheme": "Research Scheme",
                "start_year": 2025,
                "start_month": 1,
                "end_year": 2026,
                "end_month": 12,
                "company": "C001",
                "cost_centre": "SCI",
                "account_string": "C001-SCI",
                "activity": "ACT01",
                "region": "REG01",
                "additional_information": "Additional information",
                "other_funder": "Other Funder",
                "other_funder_category": "Other Category",
            },
        )

    def test_handles_missing_activity_and_region(self):
        self.project.activity = None
        self.project.region = None

        result = build_project_info(self.project)

        self.assertIsNone(result["activity"])
        self.assertIsNone(result["region"])


class TestBuildStaffInfoTable(SimpleTestCase):
    def test_builds_staff_info_table(self):
        line_1 = Mock(spec=StaffCostLine)
        line_1.id = 1
        line_1.name_role = "Researcher"
        line_1.employment_type = "Continuing"
        line_1.category = "Academic"
        line_1.classification = "Level A.1"
        line_1.time_basis = "FTE"
        line_1.in_kind = False

        line_2 = Mock(spec=StaffCostLine)
        line_2.id = 2
        line_2.name_role = "Research Assistant"
        line_2.employment_type = "Casual"
        line_2.category = "Professional"
        line_2.classification = "Level B.1"
        line_2.time_basis = "Hourly"
        line_2.in_kind = True

        result = build_staff_info_table([line_1, line_2])

        self.assertEqual(
            result,
            {
                1: {
                    "name_role": "Researcher",
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level A.1",
                    "time_basis": "FTE",
                    "in_kind": False,
                },
                2: {
                    "name_role": "Research Assistant",
                    "employment_type": "Casual",
                    "category": "Professional",
                    "classification": "Level B.1",
                    "time_basis": "Hourly",
                    "in_kind": True,
                },
            },
        )

    def test_returns_empty_table_for_no_staff_lines(self):
        result = build_staff_info_table([])

        self.assertEqual(result, {})


class TestBuildStaffNumericTable(SimpleTestCase):
    def test_builds_staff_numeric_table(self):
        allocation_1 = Mock(spec=YearAllocation)
        allocation_1.year = 2025
        allocation_1.time = Decimal("0.5")

        allocation_2 = Mock(spec=YearAllocation)
        allocation_2.year = 2026
        allocation_2.time = Decimal("1.0")

        line = Mock(spec=StaffCostLine)
        line.id = 1
        line.allocations.all.return_value = [
            allocation_1,
            allocation_2,
        ]

        result = build_staff_numeric_table([line])

        self.assertEqual(
            result,
            {
                1: {
                    2025: Decimal("0.5"),
                    2026: Decimal("1.0"),
                }
            },
        )

    def test_returns_empty_data_when_no_allocations(self):
        line = Mock(spec=StaffCostLine)
        line.id = 1
        line.allocations.all.return_value = []

        result = build_staff_numeric_table([line])

        self.assertEqual(result, {1: {}})

    def test_returns_empty_table_for_no_staff_lines(self):
        result = build_staff_numeric_table([])

        self.assertEqual(result, {})


class TestBuildNonStaffInfoTable(SimpleTestCase):
    def test_builds_non_staff_info_table(self):
        category = Mock()
        category.cost_category = "Equipment"
        category.cost_subcategory = "Equipment"

        line = Mock(spec=NonStaffCostLine)
        line.id = 1
        line.category = category
        line.description = "Computer"
        line.in_kind = False
        line.add_ten_percent = True
        line.indirect_rate_multiplier = Decimal("1.2")

        result = build_non_staff_info_table([line])

        self.assertEqual(
            result,
            {
                1: {
                    "cost_group": "Equipment",
                    "expense_type": "Equipment",
                    "description": "Computer",
                    "in_kind": False,
                    "add_ten_percent": True,
                    "indirect_rate_multiplier": Decimal("1.2"),
                }
            },
        )

    def test_returns_empty_table_for_no_non_staff_lines(self):
        result = build_non_staff_info_table([])

        self.assertEqual(result, {})


class TestBuildNonStaffNumericTable(SimpleTestCase):
    def test_builds_non_staff_numeric_table(self):
        amount_1 = Mock(spec=YearAmount)
        amount_1.year = 2025
        amount_1.amount = Decimal("1000")

        amount_2 = Mock(spec=YearAmount)
        amount_2.year = 2026
        amount_2.amount = Decimal("2000")

        line = Mock(spec=NonStaffCostLine)
        line.id = 1
        line.amounts.all.return_value = [
            amount_1,
            amount_2,
        ]

        result = build_non_staff_numeric_table([line])

        self.assertEqual(
            result,
            {
                1: {
                    2025: Decimal("1000"),
                    2026: Decimal("2000"),
                }
            },
        )

    def test_returns_empty_data_when_no_amounts(self):
        line = Mock(spec=NonStaffCostLine)
        line.id = 1
        line.amounts.all.return_value = []

        result = build_non_staff_numeric_table([line])

        self.assertEqual(result, {1: {}})

    def test_returns_empty_table_for_no_non_staff_lines(self):
        result = build_non_staff_numeric_table([])

        self.assertEqual(result, {})


class TestBuildBudgetInfo(SimpleTestCase):
    def setUp(self):
        self.deliverable_type = Mock(spec=DeliverableType)
        self.deliverable_type.name = "Report"

        self.deliverable = Mock(spec=Deliverable)
        self.deliverable.number = 1
        self.deliverable.description = "Final report"
        self.deliverable.deliverable_type = self.deliverable_type
        self.deliverable.invoice_amount = Decimal("1000")
        self.deliverable.due_date = date(2026, 12, 31)
        self.deliverable.dependency = "Project completion"
        self.deliverable.sponsor = "Test Sponsor"

        self.budget = Mock(spec=Budget)
        self.budget.mode = "full"
        self.budget.cost_multiplier = Decimal("1.0")
        self.budget.in_kind_multiplier = Decimal("1.0")
        self.budget.margin = Decimal("0.30")
        self.budget.gst_applicable = True
        self.budget.cash_co_contribution = Decimal("500")
        self.budget.comments = "Comments"
        self.budget.justification = "Justification"
        self.budget.justification_notes = "Notes"
        self.budget.dean_exemption_reason = ""
        self.budget.status = "draft"
        self.budget.deliverables.all.return_value = [
            self.deliverable
        ]

    def test_builds_budget_info(self):
        result = build_budget_info(self.budget)

        self.assertEqual(
            result,
            {
                "mode": "full",
                "cost_multiplier": Decimal("1.0"),
                "in_kind_multiplier": Decimal("1.0"),
                "margin": Decimal("0.30"),
                "gst_applicable": True,
                "cash_co_contribution": Decimal("500"),
                "comments": "Comments",
                "justification": "Justification",
                "justification_notes": "Notes",
                "dean_exemption_reason": "",
                "status": "draft",
                "deliverables": [
                    {
                        "number": 1,
                        "description": "Final report",
                        "deliverable_type": "Report",
                        "invoice_amount": Decimal("1000"),
                        "due_date": date(2026, 12, 31),
                        "dependency": "Project completion",
                        "sponsor": "Test Sponsor",
                    }
                ],
            },
        )

    def test_handles_no_deliverables(self):
        self.budget.deliverables.all.return_value = []

        result = build_budget_info(self.budget)

        self.assertEqual(result["deliverables"], [])


class TestLoadBudgetData(SimpleTestCase):
    @patch("api.services.data_loader.build_budget_info")
    @patch("api.services.data_loader.build_non_staff_numeric_table")
    @patch("api.services.data_loader.build_non_staff_info_table")
    @patch("api.services.data_loader.build_staff_numeric_table")
    @patch("api.services.data_loader.build_staff_info_table")
    @patch("api.services.data_loader.build_project_info")
    def test_loads_and_combines_budget_data(
        self,
        mock_build_project_info,
        mock_build_staff_info_table,
        mock_build_staff_numeric_table,
        mock_build_non_staff_info_table,
        mock_build_non_staff_numeric_table,
        mock_build_budget_info,
    ):
        budget = Mock(spec=Budget)
        project = Mock(spec=Project)
        staff_line = Mock(spec=StaffCostLine)
        non_staff_line = Mock(spec=NonStaffCostLine)

        budget.project = project
        budget.staff_lines.all.return_value = [staff_line]
        budget.non_staff_lines.all.return_value = [non_staff_line]

        project_info = {
            "title": "Test Project",
            "start_year": 2025,
            "start_month": 1,
            "end_year": 2026,
            "end_month": 12,
        }
        staff_info = {"staff": "info"}
        staff_numeric = {"staff": "numeric"}
        non_staff_info = {"non_staff": "info"}
        non_staff_numeric = {"non_staff": "numeric"}
        budget_info = {"budget": "info"}

        mock_build_project_info.return_value = project_info
        mock_build_staff_info_table.return_value = staff_info
        mock_build_staff_numeric_table.return_value = staff_numeric
        mock_build_non_staff_info_table.return_value = non_staff_info
        mock_build_non_staff_numeric_table.return_value = non_staff_numeric
        mock_build_budget_info.return_value = budget_info

        result = load_budget_data(budget)

        mock_build_project_info.assert_called_once_with(project)
        mock_build_staff_info_table.assert_called_once_with(
            [staff_line]
        )
        mock_build_staff_numeric_table.assert_called_once_with(
            [staff_line]
        )
        mock_build_non_staff_info_table.assert_called_once_with(
            [non_staff_line]
        )
        mock_build_non_staff_numeric_table.assert_called_once_with(
            [non_staff_line]
        )
        mock_build_budget_info.assert_called_once_with(budget)

        self.assertEqual(
            result,
            {
                "project_info": project_info,
                "project_duration": {
                    "start_year": 2025,
                    "start_month": 1,
                    "end_year": 2026,
                    "end_month": 12,
                },
                "staff_table": {
                    "info_table": staff_info,
                    "numeric_table": staff_numeric,
                },
                "non_staff_table": {
                    "info_table": non_staff_info,
                    "numeric_table": non_staff_numeric,
                },
                "budget_info": budget_info,
            },
        )
