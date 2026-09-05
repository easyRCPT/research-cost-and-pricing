from drf_spectacular.utils import PolymorphicProxySerializer
from rest_framework import serializers

FIELDS_BY_SECTION = {
    "project": {"title", "chief_investigator", "funder", "scheme", "additional_information",
                "start_year", "start_month", "end_year", "end_month",
                "department", "activity", "region"},
    "budget": {"comments", "mode", "status", "cost_multiplier", "in_kind_multiplier",
               "cash_co_contribution", "gst_applicable"},
    "staff": {"name_role", "classification", "employment_type", "category",
              "time_basis", "in_kind", "year_value"},
    "non_staff": {"description", "in_kind", "add_ten_percent",
                  "indirect_rate_multiplier", "category", "year_value"},
    "deliverable": {"description", "due_date", "sponsor", "number",
                    "dependency", "deliverable_type", "invoice_amount"},
}
SECTIONS = list(FIELDS_BY_SECTION)

# Named so ENUM_NAME_OVERRIDES can import them
PROJECT_FIELDS = sorted(FIELDS_BY_SECTION["project"])
BUDGET_FIELDS = sorted(FIELDS_BY_SECTION["budget"])
STAFF_FIELDS = sorted(FIELDS_BY_SECTION["staff"])
NON_STAFF_FIELDS = sorted(FIELDS_BY_SECTION["non_staff"])
DELIVERABLE_FIELDS = sorted(FIELDS_BY_SECTION["deliverable"])

class SectionSerializer(serializers.Serializer):
    section = serializers.ChoiceField(choices=SECTIONS)

# Shared base serialiser inherited by all 5 sections
#   _Update:        `value`, `field`
#   _RowUpdate:     `row_id`, `value`, `field`
#   _YearRowUpdate: `year`, `row_id`, `value`, `field`
class _Update(serializers.Serializer):
    value = serializers.JSONField()

class _RowUpdate(_Update):
    row_id = serializers.IntegerField()

class _YearRowUpdate(_RowUpdate):
    year = serializers.IntegerField(required=False)
    # TODO: annotate attrs/return as dict[str, Any] for strict pyright
    def validate(self, attrs):
        if (attrs["field"] == "year_value") != ("year" in attrs):
            raise serializers.ValidationError(
                {"year": "Required with year_value, not allowed otherwise."}
            )
        return attrs

# Serializers for each individual section so every `field` is typed with choices
class ProjectUpdateSerializer(_Update):
    field = serializers.ChoiceField(choices=PROJECT_FIELDS)

class BudgetFieldUpdateSerializer(_Update):
    field = serializers.ChoiceField(choices=BUDGET_FIELDS)

class StaffUpdateSerializer(_YearRowUpdate):
    field = serializers.ChoiceField(choices=STAFF_FIELDS)

class NonStaffUpdateSerializer(_YearRowUpdate):
    field = serializers.ChoiceField(choices=NON_STAFF_FIELDS)

class DeliverableUpdateSerializer(_RowUpdate):
    field = serializers.ChoiceField(choices=DELIVERABLE_FIELDS)

# Dictionary mapping section key to serializer
UPDATE_SERIALIZERS = {
    "project": ProjectUpdateSerializer,
    "budget": BudgetFieldUpdateSerializer,
    "staff": StaffUpdateSerializer,
    "non_staff": NonStaffUpdateSerializer,
    "deliverable": DeliverableUpdateSerializer,
}

BudgetUpdateSchema = PolymorphicProxySerializer(
    component_name="BudgetUpdate",
    serializers=UPDATE_SERIALIZERS,
    resource_type_field_name="section",
)
