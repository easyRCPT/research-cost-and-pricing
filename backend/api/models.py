from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings 

# Create your models here.

#------------------- Schema for Lookup table data -------------
# TODO: Add 'budget_unit'. Not used, but present in the Excel workbook
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

class SalaryRateMultiplier(models.Model):
    # tSalaryRateMultiplier. Converts a stored rate to the entered time basis:
    # FTE 1, Daily 1/220, Hourly 1. Hourly is 1 because Casual rows in
    # SalaryRate are already hourly rates, not because hourly needs no
    # conversion in general.
    time_basis = models.CharField(max_length=20, primary_key=True)
    multiplier = models.DecimalField(max_digits=20, decimal_places=18)

    def __str__(self):
        return f"{self.time_basis} x{self.multiplier}"


# TODO: Consider to remove. Not used in calculation. Max steps are maintained and checked in SalaryRate.
# Defines the Salary Cap
class IncrementCap(models.Model):
    level = models.CharField(max_length=20, primary_key=True)
    max_steps = models.PositiveSmallIntegerField()

# TODO: (later sprint) Consider storing annual increase rate eg. 3%, and calculate the multiplier in engine rather than storing the multiplier directly.
# Salary increases by EBA miltiplier 
class EbaIncrease(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    multiplier = models.DecimalField(max_digits=8, decimal_places=6)

class SalaryRate(models.Model):
    """
    Base rates from the RCPT workbook's tSalaryRate table.
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

# TODO: Remove 'payroll_tax' and 'year'. Store payroll tax rate in constants if fixed, otherwise use separate model.
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

# TODO: Check if there is a contingency category when import. eg. (some ledger id like 0000, contingency, contingency)
class NonStaffCostCategory(models.Model):
    # The expense types a non-staff cost line can be booked against. Each one
    # carries the finance ledger ID that ends up on the budget form, which is
    # what lets Finance code the spend. Source: Lookup Tables H132:J149.
    ledger_id = models.PositiveIntegerField(primary_key=True)
    cost_category = models.CharField(max_length=100)
    cost_subcategory = models.CharField(max_length=150)

    def __str__(self):
        return f"{self.cost_subcategory} ({self.ledger_id})"

# TODO: Consider whether this should be stored as a calculation constant
# Calculation engine uses multiplier stored in Budget not this
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

class Activity(models.Model):
    code = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Region(models.Model):
    code = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

# TODO: Consider to add Post-Graduate Stipend rates if required. not used, but present in the Excel workbook

#------------------- Schema for Data Derived From Application -------------

class Project(models.Model):
    COMPANY_CODE = "C001"

    # Store the central data
    title = models.CharField(max_length=200)
    department = models.ForeignKey("Department", on_delete=models.PROTECT)
    chief_investigator = models.CharField(max_length=100, blank=True)
    funder = models.CharField(max_length=100)
    scheme = models.CharField(max_length=200, blank=True)

    # Dictates potential year allocations for staff
    start_year = models.PositiveSmallIntegerField()
    start_month = models.PositiveSmallIntegerField()
    end_year = models.PositiveSmallIntegerField()
    end_month = models.PositiveSmallIntegerField()

    activity = models.ForeignKey(
        "Activity", null=True, blank=True, on_delete=models.PROTECT
    )
    region = models.ForeignKey(
        "Region", null=True, blank=True, on_delete=models.PROTECT
    )

    additional_information = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Account string computed fresh from existing fields
    @property
    def account_string(self):
        if not (self.activity_id and self.region_id):
            return ""
        return "-".join(
            (self.COMPANY_CODE, self.department_id, self.activity_id, self.region_id)
        )

    def __str__(self):
        return self.title


# TODO: Add cash co-contribution and a deliverables table (separate model)
class Budget(models.Model):
    # One costed attempt at a project. A project can carry several: a first
    # attempt, a revision after a rejection, a variant for a different funder,
    # which is the thing the workbook cannot do, since one file is one budget.
    #
    # The multipliers are stored per budget rather than read from
    # CalculationConstant at calculation time. 
    class Mode(models.TextChoices):
        SIMPLE = "simple", "Simple"
        FULL = "full", "Full"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        HOD_REVIEW = "hod_review", "Head of Department review"
        DEAN_REVIEW = "dean_review", "Dean review"
        APPROVED = "approved", "Approved"
        WITHDRAWN = "withdrawn", "Withdrawn"

    project = models.ForeignKey(
        "Project", related_name="budgets", on_delete=models.CASCADE
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.FULL)

    # Seeded from CalculationConstant when the budget is created, not by a
    # field default, because the current values live in the database.
    cost_multiplier = models.DecimalField(max_digits=4, decimal_places=2)
    in_kind_multiplier = models.DecimalField(max_digits=4, decimal_places=2)

    gst_applicable = models.BooleanField(default=True)

    # Plain CharField rather than whatever it will be when 
    # authentication comes in
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project} ({self.get_status_display()})"


class StaffCostLine(models.Model):
    # One person/one role, on a budget. Holds who they are and how their
    # time is measured; the time itself lives in YearAllocation, one row per
    # project year.
    #
    # Classification is the starting step. Continuing and fixed-term staff
    # advance a step per year worked, capped by IncrementCap, so the rate
    # actually charged is resolved per year rather than stored here.

    class TimeBasis(models.TextChoices):
        FTE = "FTE", "FTE"
        DAILY = "Daily", "Daily"
        HOURLY = "Hourly", "Hourly"

    budget = models.ForeignKey(
        "Budget", related_name="staff_lines", on_delete=models.CASCADE
    )
    name_role = models.CharField(max_length=100)

    # Reused from the lookup models so the valid values cannot drift apart.
    employment_type = models.CharField(
        max_length=20, choices=OnCostRate.EmploymentType.choices
    )
    category = models.CharField(max_length=20, choices=SalaryRate.Category.choices)
    classification = models.CharField(max_length=20)
    time_basis = models.CharField(max_length=10, choices=TimeBasis.choices)

    # In-kind lines add to the project's cost but never to its price, and are
    # costed at the in-kind multiplier rather than the project's.
    in_kind = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name_role} ({self.classification})"


class YearAllocation(models.Model):
    # How much time a staff line commits in one project year. Separate rows
    # rather than fixed year columns, so a project can run any number of years.

    staff_line = models.ForeignKey(
        "StaffCostLine", related_name="allocations", on_delete=models.CASCADE
    )
    year = models.PositiveSmallIntegerField()
    time = models.DecimalField(max_digits=8, decimal_places=4)

    # If a Staff line disappears, so too should a year allocation.
    # Also, there should not be an allocation sharing the same year
    # for a single Staff line.
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["staff_line", "year"], name="unique_year_allocation"
            )
        ]

    def __str__(self):
        return f"{self.staff_line} {self.year}: {self.time}"

# TODO: Add category (foreign key)
class NonStaffCostLine(models.Model):
    """
    A non-salary cost on a budget: equipment, travel etc.
    Amounts live in YearAmount, one row per project year.
    """

    # Carries reference data, FK allows that data to be connected
    budget = models.ForeignKey("Budget", related_name="non_staff_lines",
                               on_delete=models.CASCADE)

    description = models.CharField(max_length=200, blank=True)

    in_kind = models.BooleanField(default=False)

    # An estimate for extra cost
    add_ten_percent = models.BooleanField(default=False)

    indirect_rate_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True 
    )

    def __str__(self):
        return f"{self.category} - {self.description}"

class YearAmount(models.Model):
    """
    What a non-staff line costs in one project year. 
    Holds actual cost directly, compared to Year Allocation which
    holds time.
    """

    # YearAmount does not exist without a NonStaffCostLine
    non_staff_line = models.ForeignKey(
        "NonStaffCostLine", related_name="amounts", on_delete=models.CASCADE
    )

    year = models.PositiveSmallIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    # Unique on non_staff_line and year so there isn't another year
    # for a single line
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["non_staff_line", "year"], name="unique_year_amount"
            )
        ]

    def __str__(self):
        return f"{self.non_staff_line} {self.year}: {self.amount}"


    

