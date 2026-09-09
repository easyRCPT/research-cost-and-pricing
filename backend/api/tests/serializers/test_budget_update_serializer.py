from django.test import SimpleTestCase

from api.serializers.budget_update_serializer import (
    BUDGET_FIELDS,
    DELIVERABLE_FIELDS,
    NON_STAFF_FIELDS,
    PROJECT_FIELDS,
    STAFF_FIELDS,
    BudgetFieldUpdateSerializer,
    DeliverableUpdateSerializer,
    NonStaffUpdateSerializer,
    ProjectUpdateSerializer,
    SectionSerializer,
    StaffUpdateSerializer,
)


class SectionSerializerTestCase(SimpleTestCase):
    def test_accepts_valid_section(self):
        serializer = SectionSerializer(
            data={"section": "project"},
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["section"],
            "project",
        )

    def test_rejects_invalid_section(self):
        serializer = SectionSerializer(
            data={"section": "invalid"},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("section", serializer.errors)


class ProjectUpdateSerializerTestCase(SimpleTestCase):
    def test_accepts_valid_field(self):
        serializer = ProjectUpdateSerializer(
            data={
                "field": "title",
                "value": "New Project",
            },
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["field"],
            "title",
        )

    def test_rejects_invalid_field(self):
        serializer = ProjectUpdateSerializer(
            data={
                "field": "invalid",
                "value": "value",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("field", serializer.errors)

    def test_accepts_json_value(self):
        serializer = ProjectUpdateSerializer(
            data={
                "field": "start_year",
                "value": 2026,
            },
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["value"],
            2026,
        )


class BudgetFieldUpdateSerializerTestCase(SimpleTestCase):
    def test_accepts_valid_field(self):
        serializer = BudgetFieldUpdateSerializer(
            data={
                "field": "margin",
                "value": "0.30",
            },
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_invalid_field(self):
        serializer = BudgetFieldUpdateSerializer(
            data={
                "field": "title",
                "value": "Invalid",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("field", serializer.errors)


class StaffUpdateSerializerTestCase(SimpleTestCase):
    def test_accepts_field_without_year(self):
        serializer = StaffUpdateSerializer(
            data={
                "field": "classification",
                "row_id": 1,
                "value": "Level A",
            },
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_year_value_with_year(self):
        serializer = StaffUpdateSerializer(
            data={
                "field": "year_value",
                "row_id": 1,
                "year": 2026,
                "value": "0.5",
            },
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["year"],
            2026,
        )

    def test_rejects_year_value_without_year(self):
        serializer = StaffUpdateSerializer(
            data={
                "field": "year_value",
                "row_id": 1,
                "value": "0.5",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["year"][0],
            "Required with year_value, not allowed otherwise.",
        )

    def test_rejects_year_with_non_year_value_field(self):
        serializer = StaffUpdateSerializer(
            data={
                "field": "classification",
                "row_id": 1,
                "year": 2026,
                "value": "Level A",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["year"][0],
            "Required with year_value, not allowed otherwise.",
        )

    def test_rejects_invalid_field(self):
        serializer = StaffUpdateSerializer(
            data={
                "field": "invalid",
                "row_id": 1,
                "value": "value",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("field", serializer.errors)


class NonStaffUpdateSerializerTestCase(SimpleTestCase):
    def test_accepts_field_without_year(self):
        serializer = NonStaffUpdateSerializer(
            data={
                "field": "description",
                "row_id": 1,
                "value": "Travel expenses",
            },
        )

        self.assertTrue(serializer.is_valid())

    def test_accepts_year_value_with_year(self):
        serializer = NonStaffUpdateSerializer(
            data={
                "field": "year_value",
                "row_id": 1,
                "year": 2026,
                "value": "1000.00",
            },
        )

        self.assertTrue(serializer.is_valid())
        self.assertEqual(
            serializer.validated_data["year"],
            2026,
        )

    def test_rejects_year_value_without_year(self):
        serializer = NonStaffUpdateSerializer(
            data={
                "field": "year_value",
                "row_id": 1,
                "value": "1000.00",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["year"][0],
            "Required with year_value, not allowed otherwise.",
        )

    def test_rejects_year_with_non_year_value_field(self):
        serializer = NonStaffUpdateSerializer(
            data={
                "field": "description",
                "row_id": 1,
                "year": 2026,
                "value": "Travel expenses",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["year"][0],
            "Required with year_value, not allowed otherwise.",
        )


class DeliverableUpdateSerializerTestCase(SimpleTestCase):
    def test_accepts_valid_field(self):
        serializer = DeliverableUpdateSerializer(
            data={
                "field": "description",
                "row_id": 1,
                "value": "Final report",
            },
        )

        self.assertTrue(serializer.is_valid())

    def test_rejects_invalid_field(self):
        serializer = DeliverableUpdateSerializer(
            data={
                "field": "year_value",
                "row_id": 1,
                "value": "value",
            },
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("field", serializer.errors)


class FieldConfigurationTestCase(SimpleTestCase):
    def test_project_fields_match_defined_fields(self):
        self.assertEqual(
            set(PROJECT_FIELDS),
            {
                "title",
                "chief_investigator",
                "funder",
                "other_funder",
                "other_funder_category",
                "scheme",
                "additional_information",
                "start_year",
                "start_month",
                "end_year",
                "end_month",
                "department",
                "activity",
                "region",
            },
        )

    def test_budget_fields_match_defined_fields(self):
        self.assertEqual(
            set(BUDGET_FIELDS),
            {
                "comments",
                "justification",
                "justification_notes",
                "dean_exemption_reason",
                "mode",
                "status",
                "cost_multiplier",
                "in_kind_multiplier",
                "margin",
                "cash_co_contribution",
                "gst_applicable",
            },
        )

    def test_staff_fields_include_year_value(self):
        self.assertIn("year_value", STAFF_FIELDS)

    def test_non_staff_fields_include_year_value(self):
        self.assertIn("year_value", NON_STAFF_FIELDS)

    def test_deliverable_fields_do_not_include_year_value(self):
        self.assertNotIn("year_value", DELIVERABLE_FIELDS)
