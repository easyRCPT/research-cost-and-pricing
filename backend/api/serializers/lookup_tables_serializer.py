from rest_framework import serializers


class LookupTablesSerializer(serializers.Serializer):
    """
    Serialize lookup data returned by get_constants() into a frontend-friendly format.
    """

    def to_representation(self, instance):
        # On-cost table: rows are on-cost types, columns are employment types.
        on_cost_components = instance["on_cost_components"]
        on_cost_types = next(iter(on_cost_components.values())).keys()

        on_cost_rows = [
            {
                "on_cost_type": on_cost_type,
                **{
                    employment_type: components[on_cost_type]
                    for employment_type, components in on_cost_components.items()
                },
            }
            for on_cost_type in on_cost_types
        ]

        return {
            "salary_rate": [
                {
                    "payroll_type": payroll_type,
                    "category": category,
                    "classification": classification,
                    "rate": rate,
                }
                for (
                    payroll_type,
                    category,
                    classification,
                ), rate in instance["salary_rate"].items()
            ],
            "salary_rate_multiplier": [
                {
                    "time_basis": time_basis,
                    "multiplier": multiplier,
                }
                for time_basis, multiplier in instance["salary_rate_multiplier"].items()
            ],
            "eba": [
                {
                    "year": year,
                    "multiplier": multiplier,
                }
                for year, multiplier in instance["eba"].items()
            ],
            "on_cost_components": on_cost_rows,
            "constants": [
                {
                    "name": name,
                    "description": data["description"],
                    "value": data["value"],
                }
                for name, data in instance["constants"].items()
            ],
            "departments": [
                {
                    "code": code,
                    **data,
                }
                for code, data in instance["departments"].items()
            ],
            "non_staff_cost_categories": [
                {
                    "ledger_id": ledger_id,
                    **data,
                }
                for ledger_id, data in instance["non_staff_cost_categories"].items()
            ],
            "activities": [
                {
                    "code": code,
                    "name": name,
                }
                for code, name in instance["activities"].items()
            ],
            "regions": [
                {
                    "code": code,
                    "name": name,
                }
                for code, name in instance["regions"].items()
            ],
            "deliverable_types": [
                {
                    "code": code,
                    "name": name,
                }
                for code, name in instance["deliverable_types"].items()
            ],
            "revenue_categories": [
                {
                    "budget_ledger_id": budget_ledger_id,
                    **data,
                }
                for budget_ledger_id, data in instance["revenue_categories"].items()
            ],
        }
