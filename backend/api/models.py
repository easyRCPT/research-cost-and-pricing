from django.db import models

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

# Defines the Salary Cap
class IncrementCap(models.Model):
    level = models.CharField(max_length=20, primary_key=True)
    max_steps = models.PositiveSmallIntegerField()

class EbaIncrease(models.Model):
    year = models.PositiveSmallIntegerField(primary_key=True)
    multiplier = models.DecimalField(max_digits=8, decimal_places=6)

class SalaryRate(models.Model):
    """
    Base rates from the RCPT workbook's tSalaryRate table.
    'rate` holds two different units. Fortnight rows are ANNUAL salaries
    (e.g. Level B.6 = 148023.42); Casual rows are HOURLY rates
    (e.g. UOM 7.1 = 72.3078). The time basis multiplier converts as needed.
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
    
    
