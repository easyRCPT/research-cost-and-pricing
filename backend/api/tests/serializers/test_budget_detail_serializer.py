from decimal import Decimal

from django.test import SimpleTestCase

from api.serializers.budget_detail_serializer import (
    BudgetDetailSerializer,
    CostDecimalField,
)


class CostDecimalFieldTestCase(SimpleTestCase):
    def setUp(self):
        self.field = CostDecimalField(
            max_digits=14,
            decimal_places=2,
        )

    def test_rounds_using_half_up(self):
        self.assertEqual(
            self.field.to_representation(Decimal("10.125")),
            Decimal("10.13"),
        )

    def test_rounds_to_two_decimal_places(self):
        self.assertEqual(
            self.field.to_representation(Decimal("10.124")),
            Decimal("10.12"),
        )

    def test_none_remains_none(self):
        self.assertIsNone(
            self.field.to_representation(None),
        )


class BudgetDetailSerializerTestCase(SimpleTestCase):
    def setUp(self):
        self.instance = self._build_instance()

    @staticmethod
    def _build_instance():
        return {
            "project_info": {
                "title": "Test Project",
                "chief_investigator": "",
                "funder": "Test Funder",
                "department": "Science",
                "faculty": "Science Faculty",
                "scheme": "",
                "start_year": 2025,
                "start_month": 1,
                "end_year": 2027,
                "end_month": 12,
                "company": "C001",
                "cost_centre": "SCI",
                "activity": None,
                "region": None,
                "account_string": "",
                "additional_information": "",
                "other_funder": "",
                "other_funder_category": "",
            },
            "budget_info": {
                "mode": "full",
                "cost_multiplier": Decimal("1.00"),
                "in_kind_multiplier": Decimal("1.00"),
                "margin": Decimal("0.3000"),
                "gst_applicable": True,
                "cash_co_contribution": Decimal("100.00"),
                "comments": "",
                "justification": "",
                "justification_notes": "",
                "dean_exemption_reason": "",
                "status": "draft",
                "deliverables": [],
            },
            "staff_table": {
                "cost_results": {
                    1: {
                        "info": {
                            "name_role": "Research Assistant",
                            "employment_type": "Continuing",
                            "category": "Academic",
                            "classification": "Level A",
                            "time_basis": "FTE",
                            "in_kind": False,
                        },
                        "rate_2025": Decimal("50000.0000"),
                        "numeric": {
                            2025: {
                                "input": Decimal("0.5000"),
                                "result": Decimal("25000.125"),
                            },
                            2027: {
                                "input": Decimal("0.2500"),
                                "result": Decimal("12500.456"),
                            },
                        },
                        "total": Decimal("37500.581"),
                    },
                    "column_total": {
                        "results": {
                            2025: Decimal("25000.125"),
                            2026: Decimal("0"),
                            2027: Decimal("12500.456"),
                        },
                        "total": Decimal("37500.581"),
                    },
                },
                "in_kind_cost_results": {
                    "column_total": {
                        "results": {},
                        "total": Decimal("0"),
                    },
                },
            },
            "non_staff_table": {
                "cost_results": {
                    1: {
                        "info": {
                            "cost_group": "Travel",
                            "expense_type": "Domestic",
                            "description": "Travel expenses",
                            "in_kind": False,
                            "add_ten_percent": False,
                            "indirect_rate_multiplier": Decimal("1.00"),
                        },
                        "numeric": {
                            2025: Decimal("1000.125"),
                            2027: Decimal("2000.456"),
                        },
                        "total": Decimal("3000.581"),
                        "direct_total": Decimal("3000.581"),
                    },
                    "direct_total": {
                        "numeric": {
                            2025: Decimal("1000.125"),
                            2026: Decimal("0"),
                            2027: Decimal("2000.456"),
                        },
                        "total": Decimal("3000.581"),
                    },
                    "indirect_total": {
                        "numeric": {
                            2025: Decimal("100.125"),
                            2026: Decimal("0"),
                            2027: Decimal("200.456"),
                        },
                        "total": Decimal("300.581"),
                    },
                    "column_total": {
                        "numeric": {
                            2025: Decimal("1100.250"),
                            2026: Decimal("0"),
                            2027: Decimal("2200.912"),
                        },
                        "total": Decimal("3301.162"),
                    },
                },
                "in_kind_cost_results": {
                    "direct_total": {
                        "numeric": {},
                        "total": Decimal("0"),
                    },
                    "indirect_total": {
                        "numeric": {},
                        "total": Decimal("0"),
                    },
                    "column_total": {
                        "numeric": {},
                        "total": Decimal("0"),
                    },
                },
            },
            "budget_summary": {
                "price_summary": {
                    "margin": Decimal("0.3000"),
                    "margin_amount": Decimal("1000.125"),
                    "staff_cost": Decimal("37500.125"),
                    "non_staff_cost": Decimal("3000.456"),
                    "project_cost": Decimal("40500.581"),
                    "in_kind_staff_cost": Decimal("0"),
                    "in_kind_non_staff_cost": Decimal("0"),
                    "in_kind_project_cost": Decimal("0"),
                    "staff_cost_percentage": Decimal("0.925000"),
                    "non_staff_cost_percentage": Decimal("0.075000"),
                    "total_project_cost": Decimal("40500.581"),
                    "total_price_exc_gst": Decimal("52500.125"),
                    "total_price_inc_gst": Decimal("57750.137"),
                    "cash_benefit": Decimal("1000.125"),
                    "total_in_kind_contribution": Decimal("0"),
                    "total_cash_co_contribution": Decimal("100.00"),
                    "university_position": Decimal("41500.456"),
                },
                "staff_budget": {
                    "category_totals": {
                        "Academic": Decimal("37500.125"),
                    },
                    "cost_before_recovery": Decimal("37500.125"),
                    "cost_recovery": Decimal("5000.125"),
                    "cost_recovery_multiplier": Decimal("1.00"),
                    "total_staff_costs": Decimal("42500.250"),
                },
                "non_staff_budget": {
                    "category_totals": {
                        "Travel": Decimal("3000.456"),
                    },
                    "direct_total": Decimal("3000.456"),
                    "indirect_cost_recovery": Decimal("300.581"),
                    "total_non_staff_costs": Decimal("3301.037"),
                },
                "in_kind_costs": {
                    "in_kind_staff_budget": {
                        "category_totals": {},
                        "cost_before_recovery": Decimal("0"),
                        "cost_recovery": Decimal("0"),
                        "cost_recovery_multiplier": Decimal("1.00"),
                        "total_staff_costs": Decimal("0"),
                    },
                    "in_kind_non_staff_budget": {
                        "category_totals": {},
                        "direct_total": Decimal("0"),
                        "indirect_cost_recovery": Decimal("0"),
                        "total_non_staff_costs": Decimal("0"),
                    },
                    "total_in_kind_costs": Decimal("0"),
                },
                "dean_required": False,
            },
        }

    def serialize(self):
        return BudgetDetailSerializer().to_representation(self.instance)

    def test_generates_years_from_project_period(self):
        data = self.serialize()

        self.assertEqual(
            data["years"],
            [2025, 2026, 2027],
        )

    def test_builds_staff_lines(self):
        data = self.serialize()

        self.assertEqual(
            data["staff_cost"]["lines"],
            [
                {
                    "id": 1,
                    "name_role": "Research Assistant",
                    "employment_type": "Continuing",
                    "category": "Academic",
                    "classification": "Level A",
                    "time_basis": "FTE",
                    "in_kind": False,
                    "rate_2025": Decimal("50000.0000"),
                    "by_year": [
                        {
                            "year": 2025,
                            "time": Decimal("0.5000"),
                            "cost": Decimal("25000.13"),
                        },
                        {
                            "year": 2026,
                            "time": Decimal("0.0000"),
                            "cost": Decimal("0.00"),
                        },
                        {
                            "year": 2027,
                            "time": Decimal("0.2500"),
                            "cost": Decimal("12500.46"),
                        },
                    ],
                    "total": Decimal("37500.58"),
                },
            ],
        )

    def test_builds_staff_column_total(self):
        data = self.serialize()

        self.assertEqual(
            data["staff_cost"]["column_total"],
            {
                "by_year": [
                    {
                        "year": 2025,
                        "cost": Decimal("25000.13"),
                    },
                    {
                        "year": 2026,
                        "cost": Decimal("0.00"),
                    },
                    {
                        "year": 2027,
                        "cost": Decimal("12500.46"),
                    },
                ],
                "total": Decimal("37500.58"),
            },
        )

    def test_builds_non_staff_lines(self):
        data = self.serialize()

        self.assertEqual(
            data["non_staff_cost"]["lines"],
            [
                {
                    "id": 1,
                    "cost_group": "Travel",
                    "expense_type": "Domestic",
                    "description": "Travel expenses",
                    "in_kind": False,
                    "add_ten_percent": False,
                    "indirect_rate_multiplier": Decimal("1.00"),
                    "by_year": [
                        {
                            "year": 2025,
                            "amount": Decimal("1000.13"),
                        },
                        {
                            "year": 2026,
                            "amount": Decimal("0.00"),
                        },
                        {
                            "year": 2027,
                            "amount": Decimal("2000.46"),
                        },
                    ],
                    "total": Decimal("3000.58"),
                    "direct_total": Decimal("3000.58"),
                },
            ],
        )

    def test_builds_non_staff_totals(self):
        data = self.serialize()

        self.assertEqual(
            data["non_staff_cost"]["direct_total"],
            {
                "by_year": [
                    {
                        "year": 2025,
                        "cost": Decimal("1000.13"),
                    },
                    {
                        "year": 2026,
                        "cost": Decimal("0.00"),
                    },
                    {
                        "year": 2027,
                        "cost": Decimal("2000.46"),
                    },
                ],
                "total": Decimal("3000.58"),
            },
        )

        self.assertEqual(
            data["non_staff_cost"]["indirect_total"],
            {
                "by_year": [
                    {
                        "year": 2025,
                        "cost": Decimal("100.13"),
                    },
                    {
                        "year": 2026,
                        "cost": Decimal("0.00"),
                    },
                    {
                        "year": 2027,
                        "cost": Decimal("200.46"),
                    },
                ],
                "total": Decimal("300.58"),
            },
        )

        self.assertEqual(
            data["non_staff_cost"]["column_total"],
            {
                "by_year": [
                    {
                        "year": 2025,
                        "cost": Decimal("1100.25"),
                    },
                    {
                        "year": 2026,
                        "cost": Decimal("0.00"),
                    },
                    {
                        "year": 2027,
                        "cost": Decimal("2200.91"),
                    },
                ],
                "total": Decimal("3301.16"),
            },
        )

    def test_builds_budget_summary(self):
        data = self.serialize()

        price_summary = data["budget_summary"]["price_summary"]

        self.assertEqual(
            price_summary["margin"],
            Decimal("0.3000"),
        )
        self.assertEqual(
            price_summary["margin_amount"],
            Decimal("1000.13"),
        )
        self.assertEqual(
            price_summary["total_price_exc_gst"],
            Decimal("52500.13"),
        )
        self.assertEqual(
            price_summary["total_price_inc_gst"],
            Decimal("57750.14"),
        )

        self.assertEqual(
            data["budget_summary"]["dean_required"],
            False,
        )
