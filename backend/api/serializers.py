from decimal import ROUND_HALF_UP, Decimal

from rest_framework import serializers

# ------------------------------------------------------------------
# Rounding
# ------------------------------------------------------------------


class CostDecimalField(serializers.DecimalField):
    """
    Decimal field for cost values.

    Calculation keeps the original Decimal precision.
    The value is rounded to 2 decimal places only when serialized.
    """

    def to_representation(self, value):
        if value is not None:
            value = value.quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )

        return super().to_representation(value)


# ------------------------------------------------------------------
# Project
# ------------------------------------------------------------------


class ProjectInfoSerializer(serializers.Serializer):
    title = serializers.CharField()
    chief_investigator = serializers.CharField(allow_blank=True)
    funder = serializers.CharField()
    department = serializers.CharField()
    faculty = serializers.CharField()
    scheme = serializers.CharField(allow_blank=True)

    start_year = serializers.IntegerField()
    start_month = serializers.IntegerField()
    end_year = serializers.IntegerField()
    end_month = serializers.IntegerField()

    company = serializers.CharField()
    cost_centre = serializers.CharField()
    activity = serializers.CharField(allow_null=True)
    region = serializers.CharField(allow_null=True)
    additional_information = serializers.CharField(allow_blank=True)


# ------------------------------------------------------------------
# Budget
# ------------------------------------------------------------------


class DeliverableResultSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    description = serializers.CharField()
    deliverable_type = serializers.CharField()
    invoice_amount = CostDecimalField(
        max_digits=12,
        decimal_places=2,
        allow_null=True,
    )
    due_date = serializers.CharField(allow_blank=True)
    dependency = serializers.IntegerField(allow_null=True)
    sponsor = serializers.CharField(allow_blank=True)


class BudgetInfoSerializer(serializers.Serializer):
    mode = serializers.CharField()

    cost_multiplier = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
    )

    in_kind_multiplier = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
    )

    gst_applicable = serializers.BooleanField()

    cash_co_contribution = CostDecimalField(
        max_digits=12,
        decimal_places=2,
    )

    comments = serializers.CharField(allow_blank=True)
    status = serializers.CharField()

    deliverables = DeliverableResultSerializer(many=True)


# ------------------------------------------------------------------
# Staff cost
# ------------------------------------------------------------------


class StaffYearSerializer(serializers.Serializer):
    year = serializers.IntegerField()

    time = serializers.DecimalField(
        max_digits=8,
        decimal_places=4,
    )

    cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StaffLineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name_role = serializers.CharField()
    employment_type = serializers.CharField()
    category = serializers.CharField()
    classification = serializers.CharField()
    time_basis = serializers.CharField()
    in_kind = serializers.BooleanField()

    rate_2025 = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
    )

    by_year = StaffYearSerializer(many=True)

    total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StaffTotalYearSerializer(serializers.Serializer):
    year = serializers.IntegerField()

    cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StaffTotalSerializer(serializers.Serializer):
    by_year = StaffTotalYearSerializer(many=True)

    total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StaffCostSerializer(serializers.Serializer):
    lines = StaffLineSerializer(many=True)
    column_total = StaffTotalSerializer()


# ------------------------------------------------------------------
# Non-staff cost
# ------------------------------------------------------------------


class NonStaffYearSerializer(serializers.Serializer):
    year = serializers.IntegerField()

    amount = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class NonStaffLineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cost_group = serializers.CharField()
    expense_type = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    in_kind = serializers.BooleanField()
    add_ten_percent = serializers.BooleanField()

    indirect_rate_multiplier = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        allow_null=True,
    )

    by_year = NonStaffYearSerializer(many=True)

    total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    direct_total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class NonStaffTotalYearSerializer(serializers.Serializer):
    year = serializers.IntegerField()

    cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class NonStaffTotalSerializer(serializers.Serializer):
    by_year = NonStaffTotalYearSerializer(many=True)

    total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class NonStaffCostSerializer(serializers.Serializer):
    lines = NonStaffLineSerializer(many=True)

    direct_total = NonStaffTotalSerializer()
    indirect_total = NonStaffTotalSerializer()
    column_total = NonStaffTotalSerializer()


# ------------------------------------------------------------------
# Budget summary
# ------------------------------------------------------------------


class PriceSummarySerializer(serializers.Serializer):
    staff_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    non_staff_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    project_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    in_kind_staff_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    in_kind_non_staff_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    in_kind_project_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    staff_cost_percentage = serializers.DecimalField(
        max_digits=8,
        decimal_places=6,
    )

    non_staff_cost_percentage = serializers.DecimalField(
        max_digits=8,
        decimal_places=6,
    )

    total_project_cost = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_price_exc_gst = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_price_inc_gst = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    cash_benefit = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_in_kind_contribution = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_cash_co_contribution = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    university_position = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class StaffBudgetSerializer(serializers.Serializer):
    category_totals = serializers.DictField(child=CostDecimalField(max_digits=14, decimal_places=2))

    cost_before_recovery = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    cost_recovery = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    cost_recovery_multiplier = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
    )

    total_staff_costs = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class NonStaffBudgetSerializer(serializers.Serializer):
    category_totals = serializers.DictField(child=CostDecimalField(max_digits=14, decimal_places=2))

    direct_total = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    indirect_cost_recovery = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )

    total_non_staff_costs = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class InKindCostsSerializer(serializers.Serializer):
    in_kind_staff_budget = StaffBudgetSerializer()
    in_kind_non_staff_budget = NonStaffBudgetSerializer()

    total_in_kind_costs = CostDecimalField(
        max_digits=14,
        decimal_places=2,
    )


class BudgetSummarySerializer(serializers.Serializer):
    price_summary = PriceSummarySerializer()
    staff_budget = StaffBudgetSerializer()
    non_staff_budget = NonStaffBudgetSerializer()
    in_kind_costs = InKindCostsSerializer()


# ------------------------------------------------------------------
# Project detail response
# ------------------------------------------------------------------


class ProjectDetailSerializer(serializers.Serializer):
    project_info = ProjectInfoSerializer()
    budget_info = BudgetInfoSerializer()

    years = serializers.ListField(child=serializers.IntegerField())

    staff_cost = StaffCostSerializer()
    staff_in_kind_cost = StaffCostSerializer()

    non_staff_cost = NonStaffCostSerializer()
    non_staff_in_kind_cost = NonStaffCostSerializer()

    budget_summary = BudgetSummarySerializer()

    def to_representation(self, instance):
        staff_table = instance["staff_table"]
        non_staff_table = instance["non_staff_table"]

        years = list(
            range(
                instance["project_info"]["start_year"],
                instance["project_info"]["end_year"] + 1,
            )
        )

        data = {
            "project_info": instance["project_info"],
            "budget_info": instance["budget_info"],
            "years": years,
            "staff_cost": {
                "lines": self._build_staff_lines(
                    staff_table["cost_results"],
                    years,
                ),
                "column_total": self._build_staff_totals(staff_table["cost_results"]),
            },
            "staff_in_kind_cost": {
                "lines": self._build_staff_lines(
                    staff_table["in_kind_cost_results"],
                    years,
                ),
                "column_total": self._build_staff_totals(
                    staff_table["in_kind_cost_results"]
                ),
            },
            "non_staff_cost": {
                "lines": self._build_non_staff_lines(
                    non_staff_table["cost_results"],
                    years,
                ),
                **self._build_non_staff_totals(non_staff_table["cost_results"]),
            },
            "non_staff_in_kind_cost": {
                "lines": self._build_non_staff_lines(
                    non_staff_table["in_kind_cost_results"],
                    years,
                ),
                **self._build_non_staff_totals(non_staff_table["in_kind_cost_results"]),
            },
            "budget_summary": instance["budget_summary"],
        }

        return super().to_representation(data)

    @staticmethod
    def _build_staff_lines(results, years):
        return [
            {
                "id": row_id,
                "name_role": row["info"]["name_role"],
                "employment_type": row["info"]["employment_type"],
                "category": row["info"]["category"],
                "classification": row["info"]["classification"],
                "time_basis": row["info"]["time_basis"],
                "in_kind": row["info"]["in_kind"],
                "rate_2025": row["rate_2025"],
                "by_year": [
                    {
                        "year": year,
                        "time": row["numeric"].get(year, {}).get("input", Decimal(0)),
                        "cost": row["numeric"].get(year, {}).get("result", Decimal(0)),
                    }
                    for year in years
                ],
                "total": row["total"],
            }
            for row_id, row in results.items()
            if row_id != "column_total"
        ]

    @staticmethod
    def _build_staff_totals(results):
        column_total = results["column_total"]

        return {
            "by_year": [
                {
                    "year": year,
                    "cost": cost,
                }
                for year, cost in column_total["results"].items()
            ],
            "total": column_total["total"],
        }

    @staticmethod
    def _build_non_staff_lines(results, years):
        return [
            {
                "id": row_id,
                "cost_group": row["info"]["cost_group"],
                "expense_type": row["info"]["expense_type"],
                "description": row["info"]["description"],
                "in_kind": row["info"]["in_kind"],
                "add_ten_percent": row["info"]["add_ten_percent"],
                "indirect_rate_multiplier": row["info"]["indirect_rate_multiplier"],
                "by_year": [
                    {
                        "year": year,
                        "amount": row["numeric"].get(year, Decimal(0)),
                    }
                    for year in years
                ],
                "total": row["total"],
                "direct_total": row["direct_total"],
            }
            for row_id, row in results.items()
            if row_id
            not in {
                "direct_total",
                "indirect_total",
                "column_total",
            }
        ]

    @staticmethod
    def _build_non_staff_totals(results):
        return {
            "direct_total": {
                "by_year": [
                    {"year": year, "cost": amount}
                    for year, amount in results["direct_total"]["numeric"].items()
                ],
                "total": results["direct_total"]["total"],
            },
            "indirect_total": {
                "by_year": [
                    {"year": year, "cost": amount}
                    for year, amount in results["indirect_total"]["numeric"].items()
                ],
                "total": results["indirect_total"]["total"],
            },
            "column_total": {
                "by_year": [
                    {"year": year, "cost": amount}
                    for year, amount in results["column_total"]["numeric"].items()
                ],
                "total": results["column_total"]["total"],
            },
        }
