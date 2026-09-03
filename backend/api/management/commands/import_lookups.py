"""
Imports lookup tables from RCPT excel workbook. 

Table ranges resolved through defined names where able to,
otherwise cell ranges are used. Names stay put even if tables may shift.

Re-running is safe since rows are matched on their
natural key. 

"""

from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from openpyxl import load_workbook
from openpyxl.cell.cell import Cell

from api.models import (
    CalculationConstant,
    Department,
    EbaIncrease,
    IncrementCap,
    NonStaffCostCategory,
    #MinimumCostRecoveryMultiplier
    OnCostRate,
    SalaryRate,
    SalaryRateMultiplier,
    Activity,
    Region,
    DeliverableType,
    RevenueCategory,
)

WORKBOOK_NAME = "Demo_Research-Costing-and-Pricing-Tool-v4.5.xlsm"

EMPLOYMENT_TYPES = {"Continuing", "Fixed-Term", "Casual"}

# Tables here are shaped (employment_type, rate) with no year
FLAT_ONCOSTS = {
    "tbLeaveLoading": OnCostRate.OnCostType.LEAVE_LOADING,
    "tbWorkCover": OnCostRate.OnCostType.WORKCOVER,
    "tbLongServiceLeave": OnCostRate.OnCostType.LONG_SERVICE_LEAVE,
    "tbParentalLeave": OnCostRate.OnCostType.PARENTAL_LEAVE,
    "tbAnnualLeaveProvision": OnCostRate.OnCostType.ANNUAL_LEAVE_PROVISION,
}

CONSTANTS = {
    "max_leave_loading": (
        "vl_Max_Leave_Loading",
        "Leave loading is capped at this many dollars per year"
    ),
    "working_days_per_year": (
        "vl_working_days_per_year",
        "Weekdays in a year. Used only for the annual leave deduction."
    ),
    "full_cost_recovery_multiplier": (
        "dfullrecovery",
        "Default cost recovery multiplier"
    ),
    "max_payroll_tax": (
        "vl_MaxPayrollTax",
        "Maximum payroll tax rate"
    ),
    "override_uom_oncosts": (
        "vl_overridden_uom_oncosts_per",
        "Override multiplier for UoM on-costs"
    ),
}

LITERAL_CONSTANTS = {
    "in_kind_multiplier": (
        Decimal("1.7"),
        "Matches full cost recovery."
    ),
    "gst_rate": (
        Decimal("0.10"), 
        "Goods and Services Tax Amount"
    )
}

def dec(value):
    """
    openpyxl provides float values. Using
    Decimal(value) inherits floating point errors,
    must go through str() first. 
    """

    return Decimal(str(value))

def rows(workbook, name):
    """
    Stores the values in the range pointed at by a defined
    name within the workbook
    """

    try: 
        destinations = list(workbook.defined_names[name].destinations)
    except KeyError:
        raise CommandError(f"Workbook has no defined name '{name}'")

    for sheet, coord in destinations:
        # Remove reference dollar signs for clean key lookup
        block = workbook[sheet][coord.replace("$","")]
        if isinstance(block, Cell):
            yield [block.value]
        else:
            # if it's not a cell, extract row values
            for row in block:
                yield [cell.value for cell in row]

def scalar(workbook, name):
    """
    The value of a defined name pointing at a single cell.
    """

    for row in rows(workbook, name):
        for value in row:
            return value

    raise CommandError(f"'{name}' resolved to no cells")

def is_number(value):
    return isinstance(value, (int, float)) and not isinstance (value, bool)

def import_departments(workbook):
    count = 0
    # AC3:AH207 is tb_Org_Units. Budget unit sits at AJ, past an empty AI,
    # so the range is widened rather than read through the defined name.
    for row in workbook["Lookup Tables"]["AC3:AJ207"]:
        # the spreadsheet's header row lavels
        # last two columns "faculty code" and
        # "faculty" when they should be swapped around
        # depending on the data stored
        dept_name, dept_code, school, school_code, faculty, faculty_code = (
            cell.value for cell in row[:6]
        )
        budget_unit = row[7].value

        # Skip headers
        if not dept_code or dept_code == "Dept code":
            continue

        # Store each department
        Department.objects.update_or_create(
            code=dept_code,
            defaults={
                "name":dept_name,
                "school": school,
                "school_code": school_code,
                "faculty": faculty,
                "faculty_code": faculty_code,
                "budget_unit": budget_unit or "",
            }
        )

        count += 1

    return count

def import_salary_rates(workbook):
    """
    Imports every salary rate, covering academic
    and professional staff at each clssification, split by
    fortnightly pay or casual pay. 
    """

    count = 0
    for row in rows(workbook, "tSalaryRate"):
        # first column is the next 3 concatenated 
        # for lookup purposes, can be skipped
        # since we can rebuild the key if needed
        key, payroll_type, category, classification, rate = row[:5]

        # Skip headers 
        if not classification or rate is None:
            continue

        # Store the salary rates 
        SalaryRate.objects.update_or_create(
            payroll_type=payroll_type,
            category=category,
            classification=classification,
            defaults={"rate": dec(rate)}  
        )

        count += 1

    return count

def import_increment_caps(workbook):
    """
    The highest step within each level. Continuing and fixed-term staff
    move up one step per project year. Take the scenario where 
    someone reaches the last level in their category, they stay at that level
    for the rest of the project.
    """

    count = 0
    for level, max_steps in rows(workbook, "tSalaryMax"):
        if not level or not is_number(max_steps):
            continue

        IncrementCap.objects.update_or_create(
            level=level, defaults={"max_steps": int(max_steps)}
        )

        count += 1

    return count

def import_eba_increases (workbook):

    """
    Salary inflation by calendar year, as a compounding multipler.
    """
    count = 0

    for year, _annual_rate, multiplier in rows(workbook, "tEBA"):
        # The middle column is the yearly percentaage 
        # the multiplier was built from. Engine only needs 
        # compounded figure, but it is nice to have 
        # the annual rate for sync purposes. 

        # Skip headers 
        if not is_number(year) or multiplier is None:
            continue
        # Store EBA Rates 
        EbaIncrease.objects.update_or_create(
            year=int(year), defaults={"multiplier": dec(multiplier)}
        )

        count += 1

    return count

def import_on_costs(workbook):
    """
    The employment costs added on top of salary:
    supperannuation, WorkCover, and the other leave provisions.

    Multiple workbook tables collapse into a single model,
    having the same shape. Some vary by employment type, some by year,
    one by neither. Each block below handles each shape. 
    """

    count = 0

    # First shape: one rate per employment type, the same in every year.
    # Casuals are zero for most of these, since they accrue no leave.
    for name, on_cost_type in FLAT_ONCOSTS.items():
        for employment_type, rate in rows(workbook, name):
            # Some ranges use a header row, skip blanks and headers
            if employment_type not in EMPLOYMENT_TYPES:
                continue

            # Store flat oncosts
            OnCostRate.objects.update_or_create(
                on_cost_type=on_cost_type,
                employment_type=employment_type,
                year=None,
                defaults={"rate": dec(rate)},
            )

            count += 1

    # Second shape: superannuation varies by both year and employment type.
    for _key, year, employment_type, rate in rows(workbook, "tbSuperannuation"):
        if employment_type not in EMPLOYMENT_TYPES or not is_number(rate):
            continue

        OnCostRate.objects.update_or_create(
            on_cost_type=OnCostRate.OnCostType.SUPERANNUATION,
            employment_type=employment_type,
            year=int(year),
            defaults={"rate": dec(rate)},
        )

        count += 1

    # Superannuation also falls back to flat rate without year-by-year tables.
    for employment_type, rate in rows(workbook, "tbSuperannuation2026onwards"):
        if employment_type not in EMPLOYMENT_TYPES:
            continue

        OnCostRate.objects.update_or_create(
            on_cost_type=OnCostRate.OnCostType.SUPERANNUATION,
            employment_type=employment_type,
            year=None,
            defaults={"rate": dec(rate)},
        )

        count += 1

    # Third shape: payroll tax is a state tax on the employer's 
    # wage, does not need employee. Keyed on year, with employee_type 
    # left null.
    for year, rate in rows(workbook, "tbPayrollTax"):
        if not is_number(year) or rate is None:
            continue

        OnCostRate.objects.update_or_create(
            on_cost_type=OnCostRate.OnCostType.PAYROLL_TAX,
            employment_type=None,
            year=int(year),
            defaults={"rate": dec(rate)},
        )

        count += 1

    # Payroll tax fallback for years the table does not list.
    # Both columns "null" means "whatever the year, whoever the employee"
    OnCostRate.objects.update_or_create(
        on_cost_type=OnCostRate.OnCostType.PAYROLL_TAX,
        employment_type=None,
        year=None,
        defaults={"rate": dec(scalar(workbook, "vl_MaxPayrollTax"))},
    )

    return count + 1


def import_non_staff_categories(workbook):
    """
    Import function for non-staff expense types and finance ledger IDs.
    """

    # The workbook different names for two out of the three 
    # columns
    categories = {}
    for category, subcategory in rows(workbook, "vl_nonstaff_costs_subcategory"):
        if category and subcategory:
            categories[subcategory] = category

    count = 0
    for subcategory, ledger_id in rows(workbook, "vl_non_staff_ledgerID_lookup"):
        if not is_number(ledger_id):
            continue

        # Avoids key errpr 
        if subcategory not in categories:
            raise CommandError(
                f"no cost category found for '{subcategory}' "
                f"(ledger {int(ledger_id)}) - the two lookup ranges disagree"
            )

        NonStaffCostCategory.objects.update_or_create(
            ledger_id=int(ledger_id),
            defaults={
                "cost_category": categories.get(subcategory, ""),
                "cost_subcategory": subcategory,
            },
        )

        count += 1

    return count

# Saved for sprint 2 (?), currently 2.2 on notebook
# Client said that the cost recovery multiplier (1.7) 
# should not be changed 
# def import_minimum_multipliers(workbook):

def import_salary_rate_multipliers(workbook):
    # Converts a stored rate to the entered time basis.
    # FTE 1, Daily 1/220, Hourly 1.
    count = 0
    for time_basis, multiplier in rows(workbook, "tSalaryRateMultiplier"):
        if not time_basis or multiplier is None:
            continue

        SalaryRateMultiplier.objects.update_or_create(
            time_basis=time_basis, defaults={"multiplier": dec(multiplier)}
        )

        count += 1

    return count


def import_constants(workbook):
    # Numbers that belong to no table. Leave loading cap,
    # working day count, default multiplier

    for name, (defined_name, description) in CONSTANTS.items():
        CalculationConstant.objects.update_or_create(
            name=name,
            defaults={
                "value": dec(scalar(workbook, defined_name)),
                "description": description,
            },
        )

    # Import literal constants 
    for name, (value, description) in LITERAL_CONSTANTS.items():
        CalculationConstant.objects.update_or_create(
            name=name,
            defaults={"value": value, "description": description}
        )

    return len(CONSTANTS) + len(LITERAL_CONSTANTS)

def import_activities(workbook):
    count = 0
    for name_cell, code_cell in workbook["Lookup Tables"]["O3:P7"]:
        name, code = name_cell.value, code_cell.value
        # The range covers the header and some spare rows
        
        if not code or not str(code).startswith("ACT_"):
            continue

        Activity.objects.update_or_create(code=code, defaults={"name": name})

        count += 1
    return count

def import_regions(workbook):
    count = 0
    for name_cell, code_cell in workbook["Lookup Tables"]["O10:P47"]:
        name, code = name_cell.value, code_cell.value
        if not code or not str(code).startswith("RE_"):
            continue

        Region.objects.update_or_create(code=code, defaults={"name":name})
        count += 1

    return count

def import_deliverable_types(workbook):
    count = 0
    # Code first, name second - the reverse of the activity and region tables.
    for code_cell, name_cell in workbook["Lookup Tables"]["O50:P60"]:
        code, name = code_cell.value, name_cell.value
        if not code or code == "Type":
            continue

        DeliverableType.objects.update_or_create(code=code, defaults={"name": name})
        count += 1

    return count

def import_revenue_categories(workbook):
    count = 0
    # The income-side counterpart to the non-staff ledger IDs.
    for party_cell, desc_cell, ledger_cell in workbook["Lookup Tables"]["AN2:AP20"]:
        party, description, ledger_id = (
            party_cell.value, desc_cell.value, ledger_cell.value
        )
        if not is_number(ledger_id):
            continue

        RevenueCategory.objects.update_or_create(
            budget_ledger_id=int(ledger_id),
            defaults={"external_party": party, "description": description},
        )
        count += 1

    return count


class Command(BaseCommand):
    help = "Import lookup tables from the RCPT workbook (idempotent; safe to re-run)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--workbook",
            metavar="PATH",
            help=f"Path to the .xlsm (default: {WORKBOOK_NAME} in the repo root).",
        )

    def handle(self, *args, **options):
        if options["workbook"]:
            path = Path(options["workbook"])
        else:
            path = Path(settings.BASE_DIR).parent / WORKBOOK_NAME

        if not path.is_file():
            raise CommandError(f"workbook not found: {path}")

        # data_only reads the values Excel cached on its last save, 
        # not the formukas. A workbook never opened Excel would read back
        # as none
        workbook = load_workbook(path, data_only=True, keep_vba=False)

        importers = (
            ("departments", import_departments),
            ("salary rates", import_salary_rates),
            ("increment caps", import_increment_caps),
            ("EBA increases", import_eba_increases),
            ("on-cost rates", import_on_costs),
            ("non-staff categories", import_non_staff_categories),
            #("minimum multipliers", import_minimum_multipliers),
            ("salary rate multipliers", import_salary_rate_multipliers),
            ("regions", import_regions),
            ("activities", import_activities),
            ("deliverable types", import_deliverable_types),
            ("revenue categories", import_revenue_categories),
            ("constants", import_constants),
        )

        # One transaction, a failure halfway leaves no partial lookup
        # tables 
        with transaction.atomic():
            for label, importer in importers:
                self.stdout.write(f"  {label} ... ", ending="")
                self.stdout.flush()
                count = importer(workbook)
                self.stdout.write(self.style.SUCCESS(str(count)))

        self.stdout.write(self.style.SUCCESS("Lookup tables imported."))

