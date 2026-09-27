"""
Cost lines come back in the order they were added, and keep the id the browser
gave them (#93).
"""

from unittest.mock import patch
from uuid import uuid4

from django.test import TestCase

from api.models import NonStaffCostCategory
from api.serializers.staff_line_serializer import StaffLineSerializer
from api.services import budget_update, non_staff_line, staff_line
from api.services.data_loader import load_budget_data

from .test_staff_line import StaffLineTestMixin

STAFF = {
    "employment_type": "Continuing",
    "category": "Academic",
    "classification": "Level A",
    "time_basis": "FTE",
}


@patch("api.services.staff_line.budget_details.get_budget_details")
@patch("api.services.non_staff_line.budget_details.get_budget_details")
class TestLineOrder(StaffLineTestMixin, TestCase):
    def setUp(self):
        self.budget = self.create_budget()

    def add_staff(self, name: str, **data):
        staff_line.create(self.budget, {"name_role": name, **STAFF, **data})

    def names(self) -> list[str]:
        info = load_budget_data(self.budget)["staff_table"]["info_table"]
        return [row["name_role"] for row in info.values()]

    def test_lines_take_the_next_position(self, *_):
        for name in ("first", "second", "third"):
            self.add_staff(name)

        positions = list(self.budget.staff_lines.values_list("position", flat=True))
        self.assertEqual(positions, [0, 1, 2])

    def test_an_edit_does_not_reorder(self, *_):
        for name in ("first", "second", "third"):
            self.add_staff(name)
        first = self.budget.staff_lines.get(name_role="first")

        budget_update.update_field(
            self.budget,
            {
                "section": "staff",
                "row_id": first.id,
                "field": "name_role",
                "value": "edited",
            },
        )

        self.assertEqual(self.names(), ["edited", "second", "third"])

    def test_a_delete_keeps_the_rest_in_order(self, *_):
        for name in ("first", "second", "third"):
            self.add_staff(name)

        staff_line.delete(self.budget, self.budget.staff_lines.get(name_role="first"))
        self.add_staff("fourth")

        self.assertEqual(self.names(), ["second", "third", "fourth"])

    def test_position_can_be_written(self, *_):
        for name in ("first", "second"):
            self.add_staff(name)
        second = self.budget.staff_lines.get(name_role="second")

        budget_update.update_field(
            self.budget,
            {"section": "staff", "row_id": second.id, "field": "position", "value": 0},
        )
        first = self.budget.staff_lines.get(name_role="first")
        budget_update.update_field(
            self.budget,
            {"section": "staff", "row_id": first.id, "field": "position", "value": 1},
        )

        self.assertEqual(self.names(), ["second", "first"])

    def test_keeps_the_id_the_browser_minted(self, *_):
        line_id = uuid4()

        self.add_staff("first", id=line_id)

        self.assertTrue(self.budget.staff_lines.filter(id=line_id).exists())

    def test_refuses_an_id_already_in_use(self, *_):
        line_id = uuid4()
        self.add_staff("first", id=line_id)

        serializer = StaffLineSerializer(
            data={"id": str(line_id), "name_role": "again", **STAFF},
            context={"budget": self.budget},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("id", serializer.errors)

    def test_non_staff_lines_are_ordered_too(self, *_):
        category = NonStaffCostCategory.objects.create(
            ledger_id=1, cost_category="Travel", cost_subcategory="Domestic"
        )
        for description in ("first", "second"):
            non_staff_line.create(
                self.budget, {"category": category, "description": description}
            )

        info = load_budget_data(self.budget)["non_staff_table"]["info_table"]
        self.assertEqual(
            [(row["position"], row["description"]) for row in info.values()],
            [(0, "first"), (1, "second")],
        )
