from dataclasses import dataclass

from django.db import models
from rest_framework import serializers

from api.models import (
    Activity,
    CalculationConstant,
    DeliverableType,
    Department,
    EbaIncrease,
    Faculty,
    IncrementCap,
    NonStaffCostCategory,
    OnCostRate,
    Region,
    RevenueCategory,
    SalaryRate,
    SalaryRateMultiplier,
)
from api.serializers.lookup_model_serializer import (
    ActivitySerializer,
    CalculationConstantSerializer,
    DeliverableTypeSerializer,
    DepartmentSerializer,
    EbaIncreaseSerializer,
    FacultySerializer,
    IncrementCapSerializer,
    NonStaffCostCategorySerializer,
    OnCostRateSerializer,
    RegionSerializer,
    RevenueCategorySerializer,
    SalaryRateMultiplierSerializer,
    SalaryRateSerializer,
)


@dataclass(frozen=True)
class LookupDefinition:
    model: type[models.Model]
    serializer: type[serializers.Serializer]
    versioned: bool
    order_by: tuple[str, ...]


LOOKUP_DEFINITIONS = {
    "faculties": LookupDefinition(
        model=Faculty,
        serializer=FacultySerializer,
        versioned=False,
        order_by=("code",),
    ),
    "departments": LookupDefinition(
        model=Department,
        serializer=DepartmentSerializer,
        versioned=False,
        order_by=("code",),
    ),
    "salary_rates": LookupDefinition(
        model=SalaryRate,
        serializer=SalaryRateSerializer,
        versioned=True,
        order_by=(
            "payroll_type",
            "category",
            "classification",
        ),
    ),
    "salary_rate_multipliers": LookupDefinition(
        model=SalaryRateMultiplier,
        serializer=SalaryRateMultiplierSerializer,
        versioned=True,
        order_by=("time_basis",),
    ),
    "increment_caps": LookupDefinition(
        model=IncrementCap,
        serializer=IncrementCapSerializer,
        versioned=False,
        order_by=("level",),
    ),
    "eba_increases": LookupDefinition(
        model=EbaIncrease,
        serializer=EbaIncreaseSerializer,
        versioned=True,
        order_by=("year",),
    ),
    "on_cost_rates": LookupDefinition(
        model=OnCostRate,
        serializer=OnCostRateSerializer,
        versioned=True,
        order_by=(
            "on_cost_type",
            "employment_type",
            "year",
        ),
    ),
    "non_staff_cost_categories": LookupDefinition(
        model=NonStaffCostCategory,
        serializer=NonStaffCostCategorySerializer,
        versioned=True,
        order_by=(
            "cost_category",
            "cost_subcategory",
        ),
    ),
    "calculation_constants": LookupDefinition(
        model=CalculationConstant,
        serializer=CalculationConstantSerializer,
        versioned=True,
        order_by=("name",),
    ),
    "activities": LookupDefinition(
        model=Activity,
        serializer=ActivitySerializer,
        versioned=False,
        order_by=("code",),
    ),
    "regions": LookupDefinition(
        model=Region,
        serializer=RegionSerializer,
        versioned=False,
        order_by=("code",),
    ),
    "deliverable_types": LookupDefinition(
        model=DeliverableType,
        serializer=DeliverableTypeSerializer,
        versioned=False,
        order_by=("code",),
    ),
    "revenue_categories": LookupDefinition(
        model=RevenueCategory,
        serializer=RevenueCategorySerializer,
        versioned=False,
        order_by=("budget_ledger_id",),
    ),
}
