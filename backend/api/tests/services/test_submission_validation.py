from decimal import Decimal

from django.test import TestCase

from api.models import (
    LookupVersion,
    NonStaffCostCategory,
    NonStaffCostLine,
    StaffCostLine,
    YearAllocation,
    YearAmount,
)
from api.services.submission_validation import validate_submission
from api.tests.factories import make_budget, make_department, make_project, make_user


class ValidateSubmissionTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = make_user("test@example.com")
        cls.department = make_department("TEST")

        cls.non_staff_category = NonStaffCostCategory.objects.create(
            ledger_id=1000,
            cost_category="Test Category",
            cost_subcategory="Test Subcategory",
            version=LookupVersion.objects.create(),
        )

    def create_project(self, **overrides):
        return make_project(
            self.user,
            self.department,
            **{
                "chief_investigator": "Test Investigator",
                "funder": "ARC",
                "scheme": "Discovery Projects",
                "end_year": 2027,
                **overrides,
            },
        )

    def create_budget(self, project=None, **overrides):
        return make_budget(
            project or self.create_project(), **{"gst_applicable": True, **overrides}
        )

    def create_staff_line(self, budget, **overrides):
        data = {
            "budget": budget,
            "name_role": "Research Assistant",
            "employment_type": "Continuing",
            "category": "Academic",
            "classification": "Level A.1",
            "time_basis": StaffCostLine.TimeBasis.FTE,
            "in_kind": False,
            "in_kind_reason": "",
        }
        data.update(overrides)
        return StaffCostLine.objects.create(**data)

    def create_non_staff_line(self, budget, **overrides):
        data = {
            "budget": budget,
            "category": self.non_staff_category,
            "description": "Test expense",
            "in_kind": False,
            "in_kind_reason": "",
            "add_ten_percent": False,
        }
        data.update(overrides)
        return NonStaffCostLine.objects.create(**data)

    def test_valid_budget_returns_no_reasons(self):
        budget = self.create_budget()

        staff_line = self.create_staff_line(budget)

        YearAllocation.objects.create(
            staff_line=staff_line,
            year=2026,
            time=Decimal("0.5"),
        )

        reasons = validate_submission(budget)

        self.assertEqual(reasons, [])

    def test_missing_project_title(self):
        budget = self.create_budget(
            project=self.create_project(title=""),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Project title is required.",
            reasons,
        )

    def test_missing_chief_investigator(self):
        budget = self.create_budget(
            project=self.create_project(chief_investigator=""),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Chief investigator is required.",
            reasons,
        )

    def test_missing_funder(self):
        budget = self.create_budget(
            project=self.create_project(funder=""),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Funder is required.",
            reasons,
        )

    def test_other_funder_requires_other_funder_details(self):
        budget = self.create_budget(
            project=self.create_project(
                funder="Other",
                other_funder="",
                other_funder_category="",
            ),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Specify other funder and category.",
            reasons,
        )

    def test_other_funder_is_case_insensitive(self):
        budget = self.create_budget(
            project=self.create_project(
                funder="other",
                other_funder="",
                other_funder_category="",
            ),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Specify other funder and category.",
            reasons,
        )

    def test_other_funder_with_details_is_valid(self):
        budget = self.create_budget(
            project=self.create_project(
                funder="Other",
                other_funder="Test Funder",
                other_funder_category="Government",
            ),
        )

        staff_line = self.create_staff_line(budget)

        YearAllocation.objects.create(
            staff_line=staff_line,
            year=2026,
            time=Decimal(1),
        )

        reasons = validate_submission(budget)

        self.assertNotIn(
            "Specify other funder and category.",
            reasons,
        )

    def test_end_date_before_start_date(self):
        budget = self.create_budget(
            project=self.create_project(
                start_year=2027,
                start_month=6,
                end_year=2027,
                end_month=5,
            ),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "The project end date must not be before the project start date.",
            reasons,
        )

    def test_missing_end_date(self):
        budget = self.create_budget(
            project=self.create_project(end_year=None, end_month=None),
        )

        reasons = validate_submission(budget)

        self.assertIn("Project end date is required.", reasons)

    def test_missing_department(self):
        project = self.create_project()
        project.department = None
        project.save()
        budget = self.create_budget(project=project)

        reasons = validate_submission(budget)

        self.assertIn("Department is required.", reasons)

    def test_same_year_and_month_is_valid(self):
        budget = self.create_budget(
            project=self.create_project(
                start_year=2027,
                start_month=6,
                end_year=2027,
                end_month=6,
            ),
        )

        staff_line = self.create_staff_line(budget)

        YearAllocation.objects.create(
            staff_line=staff_line,
            year=2027,
            time=Decimal(1),
        )

        reasons = validate_submission(budget)

        self.assertEqual(reasons, [])

    def test_no_cost_lines(self):
        budget = self.create_budget()

        reasons = validate_submission(budget)

        self.assertIn(
            "At least one staff or non-staff cost line is required.",
            reasons,
        )

    def test_staff_line_requires_name_role(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            name_role="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every staff cost line must have a name or role.",
            reasons,
        )

    def test_staff_line_requires_employment_type(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            employment_type="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every staff cost line must have an employment type.",
            reasons,
        )

    def test_staff_line_requires_category(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            category="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every staff cost line must have a category.",
            reasons,
        )

    def test_staff_line_requires_classification(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            classification="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every staff cost line must have a classification.",
            reasons,
        )

    def test_staff_line_requires_time_basis(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            time_basis="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every staff cost line must have a time basis.",
            reasons,
        )

    def test_in_kind_staff_line_requires_reason(self):
        budget = self.create_budget()

        self.create_staff_line(
            budget,
            in_kind=True,
            in_kind_reason="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every in-kind staff cost line must have a reason.",
            reasons,
        )

    def test_staff_cost_requires_value(self):
        budget = self.create_budget()

        self.create_staff_line(budget)

        reasons = validate_submission(budget)

        self.assertIn(
            "Staff cost must have at least one value.",
            reasons,
        )

    def test_staff_cost_with_value_is_valid(self):
        budget = self.create_budget()

        staff_line = self.create_staff_line(budget)

        YearAllocation.objects.create(
            staff_line=staff_line,
            year=2026,
            time=Decimal(1),
        )

        reasons = validate_submission(budget)

        self.assertNotIn(
            "Staff cost must have at least one value.",
            reasons,
        )

    def test_in_kind_non_staff_line_requires_reason(self):
        budget = self.create_budget()

        self.create_non_staff_line(
            budget,
            in_kind=True,
            in_kind_reason="",
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Every in-kind non-staff cost line must have a reason.",
            reasons,
        )

    def test_non_staff_cost_requires_value(self):
        budget = self.create_budget()

        self.create_non_staff_line(budget)

        reasons = validate_submission(budget)

        self.assertIn(
            "Non-staff cost must have at least one value.",
            reasons,
        )

    def test_non_staff_cost_with_value_is_valid(self):
        budget = self.create_budget()

        non_staff_line = self.create_non_staff_line(budget)

        YearAmount.objects.create(
            non_staff_line=non_staff_line,
            year=2026,
            amount=Decimal(1000),
        )

        reasons = validate_submission(budget)

        self.assertNotIn(
            "Non-staff cost must have at least one value.",
            reasons,
        )

    def test_multiple_submission_errors_are_returned(self):
        budget = self.create_budget(
            project=self.create_project(
                title="",
                chief_investigator="",
                funder="",
                start_year=2027,
                start_month=6,
                end_year=2027,
                end_month=5,
            ),
        )

        reasons = validate_submission(budget)

        self.assertIn(
            "Project title is required.",
            reasons,
        )
        self.assertIn(
            "Chief investigator is required.",
            reasons,
        )
        self.assertIn(
            "Funder is required.",
            reasons,
        )
        self.assertIn(
            "The project end date must not be before the project start date.",
            reasons,
        )
        self.assertIn(
            "At least one staff or non-staff cost line is required.",
            reasons,
        )
