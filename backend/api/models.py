from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class Department(models.Model):
    code = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=150)
    school = models.CharField(max_length=150)
    school_code = models.CharField(max_length=20)
    faculty = models.CharField(max_length=150)
    faculty_code = models.CharField(max_length=20)

    def __str__(self):
        return self.name

class User(AbstractUser):
    department = models.ForeignKey(
        # models.PROTECT prevents a department from being deleted if it has users
        "Department", null=True, blank=True, on_delete=models.PROTECT
    )

# Defines the Salary Cap
class IncrementCap(models.Model):
    level = models.CharField(max_length=20, primary_key=True)
    max_steps = models.PositiveSmallIntegerField()

# Salary increases by EBA miltiplier 
class EbaIncrease(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    multiplier = models.DecimalField(max_digits=8, decimal_places=6)

class SalaryRate(models.Model):
    """
    Base rates from the RCPT workbook's tSalaryRate table.

    `rate` holds two different units. Fortnight rows are ANNUAL salaries; 
    Casual rows are HOURLY rates. The engine converts based on the line's time
    basis: FTE uses the annual figure directly, Daily divides it by the
    daily_rate_divisor constant (220), and Hourly needs no conversion
    because Casual rows are already hourly.
    """

    class PayrollType(models.TextChoices):
        # MEMBER = value, label
        FORTNIGHT = "Fortnight", "Fortnight"
        CASUAL = "Casual", "Casual"

    class Category(models.TextChoices):
        ACADEMIC = "Academic", "Academic"
        PROFESSIONAL = "Professional", "Professional"

    payroll_type = models.CharField(max_length = 20, choices = PayrollType.choices)
    category = models.CharField(max_length=20, choices=Category.choices)
    classification = models.CharField(max_length=20)
    rate = models.DecimalField(max_digits=12,decimal_places=4)

    class Meta:
        constraints = [
            # Mirrors workbook's CONCATENATE(payroll_type, category, classification)
            # lookup key, without storing a duplicate concatenated string column.
            models.UniqueConstraint(
                fields=["payroll_type", "category", "classification"],
                name="unique_salary_rate",
            )
        ]

    def __str__(self):
        return f"{self.payroll_type} {self.category} {self.classification}"

class OnCostRate(models.Model):
    """
    On-cost percentages from the excel's lookup tables.

    employment_type and year are both nullable; which one applies
    (or neither) depends on on_cost_type.
    """

    class OnCostType(models.TextChoices):
        SUPERANNUATION = "superannuation", "Superannuation" # year + employment_type, year falls back to None
        PAYROLL_TAX = "payroll_tax", "Payroll Tax" #year only, employment_type always None
        WORKCOVER = "workcover", "WorkCover" # employment_type only, year always None
        LEAVE_LOADING = "leave_loading", "Leave Loading" # employment_type only, year always None
        LONG_SERVICE_LEAVE = "long_service_leave", "Long Service Leave"  # employment_type only; year always None
        PARENTAL_LEAVE = "parental_leave", "Parental Leave"  # employment_type only; year always None
        ANNUAL_LEAVE_PROVISION = "annual_leave_provision", "Annual Leave Provision"  # employment_type only; year always None

    class EmploymentType(models.TextChoices):
        CONTINUING = "Continuing", "Continuing"
        FIXED_TERM = "Fixed-Term", "Fixed-Term"
        CASUAL = "Casual", "Casual"

    on_cost_type = models.CharField(max_length=32, choices=OnCostType.choices)
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, null=True, blank=True
    )
    year = models.PositiveSmallIntegerField(null=True,blank=True)

    rate = models.DecimalField(
        max_digits=6, decimal_places=4,
        help_text="Proportion, not percentage. E.g 0.1200 means 12%"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields = ["on_cost_type", "employment_type", "year"],
                name= "unique_on_cost_rate",
                nulls_distinct=False,
            )
        ]

    def __str__(self):
        scope = self.year if self.year is not None else "all years"
        return f"{self.get_on_cost_type_display()} - {self.employment_type or 'any'} ({scope})"


class NonStaffCostCategory(models.Model):
    # The expense types a non-staff cost line can be booked against. Each one
    # carries the finance ledger ID that ends up on the budget form, which is
    # what lets Finance code the spend. Source: Lookup Tables H132:J149.
    ledger_id = models.PositiveIntegerField(primary_key=True)
    cost_category = models.CharField(max_length=100)
    cost_subcategory = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.cost_subcategory} ({self.ledger_id})"


class MinimumCostRecoveryMultiplier(models.Model):
    # The lowest cost recovery multiplier a budget can use before it needs
    # Dean sign-off as well as Head of Department. The approval workflow reads
    # this to decide whether a submitted budget gets routed to a Dean.

    year = models.PositiveSmallIntegerField(primary_key=True)
    multiplier = models.DecimalField(max_digits=4, decimal_places=2)

    def __str__(self):
        return f"{self.year}: {self.multiplier}"


class CalculationConstant(models.Model):
    # Standalone numbers the costing engine needs that don't belong to any
    # lookup table. Stored as rows rather than Python constants
    name = models.CharField(max_length=50, primary_key=True)
    description = models.CharField(max_length=200, blank=True)
    value = models.DecimalField(max_digits=12, decimal_places=6)

    def __str__(self):
        return f"{self.name} = {self.value}"
