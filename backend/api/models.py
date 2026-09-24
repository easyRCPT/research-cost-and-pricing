from decimal import Decimal
from typing import TYPE_CHECKING, ClassVar

from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

if TYPE_CHECKING:
    from django.db.models.fields.related_descriptors import RelatedManager


# ------------------- Schema for Lookup table data -------------
class LookupVersion(models.Model):
    if TYPE_CHECKING:
        id: int

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # TODO: replace with admin, initial version don't have editor
    updated_by = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )


class LookupConfiguration(models.Model):
    if TYPE_CHECKING:
        current_version_id: int
    # Singleton
    id = models.IntegerField(primary_key=True, default=1, editable=False)
    current_version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )
    # Whether current version is referenced by authorised budget.
    # Determines whether a new version should be created when updating current version.
    referenced = models.BooleanField(default=False)


class Faculty(models.Model):
    # A table rather than two CharFields on Department, because a dean is
    # assigned to a faculty and a string cannot be pointed at.
    if TYPE_CHECKING:
        departments: RelatedManager["Department"]

    code = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=150)

    class Meta:
        verbose_name_plural = "faculties"

    def __str__(self):
        return self.name


class Department(models.Model):
    code = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=150)
    school = models.CharField(max_length=150)
    school_code = models.CharField(max_length=20)
    faculty = models.ForeignKey(
        "Faculty", related_name="departments", on_delete=models.PROTECT
    )
    budget_unit = models.CharField(max_length=20, blank=True, default="")

    if TYPE_CHECKING:
        faculty_id: str

    def __str__(self):
        return self.name


class UserManager(BaseUserManager["User"]):
    """
    Creates users by email, since there is no username left to key on.

    Django's own manager takes a username first and would refuse every call
    once that field is gone.
    """

    use_in_migrations = True

    @classmethod
    def normalize_email(cls, email: str | None) -> str:
        """
        Lowercase the whole address, not just the domain.

        Django's own version leaves the local part alone, which is correct by
        the RFC and wrong here: the column is unique case-sensitively, so
        Ruth@ and ruth@ are two rows, while sign-in matches case-insensitively
        and would then find both. Nobody at the University means two people by
        those, and the pair locks one of them out.
        """
        return super().normalize_email(email).lower()

    def _create(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if extra.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")
        if extra.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")
        return self._create(email, password, **extra)


class User(AbstractUser):
    # Signed in by email, because that is what the University issues and what
    # every door asks for. AbstractUser's username is dropped rather than
    # filled with a copy of the email: two fields holding one fact are free to
    # disagree, and this is the fact people type.
    if TYPE_CHECKING:
        id: int
        org_assignments: RelatedManager["UserOrgAssignment"]

    username = None  # type: ignore[assignment]
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    if TYPE_CHECKING:
        # AbstractUser declares objects as Django's own UserManager, whose
        # create_user takes a username. Ours does not.
        objects: ClassVar[UserManager]  # type: ignore[assignment]
    else:
        objects = UserManager()

    department = models.ForeignKey(
        # models.PROTECT prevents a department from being deleted if it has users
        "Department",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )

    class Meta(AbstractUser.Meta):
        constraints = [
            # The manager lowercases on the way in, but objects.create, the
            # admin and a data import do not go through it. This is the line
            # that actually holds.
            models.UniqueConstraint(Lower("email"), name="user_email_unique_ci"),
        ]


class UserOrgAssignment(models.Model):
    # This person, in this part of the university, in this role.
    #
    # There is no hod or dean group, and there should not be one: a group says
    # which door someone comes in through, and a group alone cannot say *which*
    # department someone heads. The scope is the whole of the approval rule, so
    # the row that carries the scope is the only record of the fact.

    if TYPE_CHECKING:
        id: int
        department_id: str | None
        faculty_id: str | None

        def get_role_display(self) -> str: ...

    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        HOD = "hod", "Head of Department"
        DEAN = "dean", "Dean"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="org_assignments",
        on_delete=models.CASCADE,
    )
    role = models.CharField(max_length=20, choices=Role.choices)

    # Exactly one of these is set, and which one is decided by the role.
    department = models.ForeignKey(
        "Department",
        null=True,
        blank=True,
        related_name="org_assignments",
        on_delete=models.PROTECT,
    )
    faculty = models.ForeignKey(
        "Faculty",
        null=True,
        blank=True,
        related_name="org_assignments",
        on_delete=models.PROTECT,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # A dean is assigned to a faculty; everyone else to a department.
            # Spelled with string literals because a nested Meta cannot see the
            # names in the class body around it.
            models.CheckConstraint(
                condition=(
                    models.Q(
                        role__in=["member", "hod"],
                        department__isnull=False,
                        faculty__isnull=True,
                    )
                    | models.Q(
                        role="dean",
                        faculty__isnull=False,
                        department__isnull=True,
                    )
                ),
                name="org_assignment_scope_matches_role",
            ),
            # The same role twice over the same place is one fact recorded
            # twice. Two departments for one person is not, and stays allowed.
            models.UniqueConstraint(
                fields=["user", "role", "department"],
                name="unique_department_assignment",
            ),
            models.UniqueConstraint(
                fields=["user", "role", "faculty"],
                name="unique_faculty_assignment",
            ),
        ]

    def __str__(self):
        where = self.faculty or self.department
        return f"{self.user} — {self.get_role_display()} ({where})"


class SalaryRateMultiplier(models.Model):
    # tSalaryRateMultiplier. Converts a stored rate to the entered time basis:
    # FTE 1, Daily 1/220, Hourly 1. Hourly is 1 because Casual rows in
    # SalaryRate are already hourly rates, not because hourly needs no
    # conversion in general.
    if TYPE_CHECKING:
        id: int

    time_basis = models.CharField(max_length=20)
    multiplier = models.DecimalField(
        max_digits=20,
        decimal_places=18,
        validators=[MinValueValidator(Decimal(0))],
    )

    version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["time_basis", "version"],
                name="unique_salary_rate_multiplier",
            )
        ]

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
    year = models.PositiveSmallIntegerField()
    multiplier = models.DecimalField(
        max_digits=8,
        decimal_places=6,
        validators=[MinValueValidator(Decimal(0))],
    )

    version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["year", "version"],
                name="unique_eba",
            )
        ]


class SalaryRate(models.Model):
    """
    Base rates from the RCPT workbook's tSalaryRate table.
    """

    if TYPE_CHECKING:
        id: int

    class PayrollType(models.TextChoices):
        # MEMBER = value, label
        FORTNIGHT = "Fortnight", "Fortnight"
        CASUAL = "Casual", "Casual"

    class Category(models.TextChoices):
        ACADEMIC = "Academic", "Academic"
        PROFESSIONAL = "Professional", "Professional"

    payroll_type = models.CharField(max_length=20, choices=PayrollType.choices)
    category = models.CharField(max_length=20, choices=Category.choices)
    classification = models.CharField(max_length=20)
    rate = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        validators=[MinValueValidator(Decimal(0))],
    )

    version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            # Mirrors workbook's CONCATENATE(payroll_type, category, classification)
            # lookup key, without storing a duplicate concatenated string column.
            models.UniqueConstraint(
                fields=["payroll_type", "category", "classification", "version"],
                name="unique_salary_rate",
            )
        ]

    def __str__(self):
        return f"{self.payroll_type} {self.category} {self.classification}"


# Payroll tax is not here: it is a state tax on the employer with no
# employment type, read from the max_payroll_tax constant. If it ever needs a
# year-based rate it belongs in its own model.
class OnCostRate(models.Model):
    """
    On-cost percentages from the Excel's lookup tables.

    employment_type and year are both nullable; which one applies
    (or neither) depends on on_cost_type.
    """

    if TYPE_CHECKING:

        def get_on_cost_type_display(self) -> str: ...

    class OnCostType(models.TextChoices):
        SUPERANNUATION = (
            "superannuation",
            "Superannuation",
        )  # year + employment_type, year falls back to None
        WORKCOVER = "workcover", "WorkCover"  # employment_type only, year always None
        LEAVE_LOADING = (
            "leave_loading",
            "Leave Loading",
        )  # employment_type only, year always None
        LONG_SERVICE_LEAVE = (
            "long_service_leave",
            "Long Service Leave",
        )  # employment_type only; year always None
        PARENTAL_LEAVE = (
            "parental_leave",
            "Parental Leave",
        )  # employment_type only; year always None
        ANNUAL_LEAVE_PROVISION = (
            "annual_leave_provision",
            "Annual Leave Provision",
        )  # employment_type only; year always None

    class EmploymentType(models.TextChoices):
        CONTINUING = "Continuing", "Continuing"
        FIXED_TERM = "Fixed-Term", "Fixed-Term"
        CASUAL = "Casual", "Casual"

    on_cost_type = models.CharField(max_length=32, choices=OnCostType.choices)
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, null=True, blank=True
    )
    year = models.PositiveSmallIntegerField(null=True, blank=True)

    rate = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        validators=[MinValueValidator(Decimal(0))],
        help_text="Proportion, not percentage. E.g 0.1200 means 12%",
    )

    version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["on_cost_type", "employment_type", "year", "version"],
                name="unique_on_cost_rate",
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


class CalculationConstant(models.Model):
    # Standalone numbers the costing engine needs that don't belong to any
    # lookup table. Stored as rows rather than Python constants
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=200, blank=True)
    value = models.DecimalField(
        max_digits=12,
        decimal_places=6,
    )

    version = models.ForeignKey(
        "LookupVersion",
        on_delete=models.PROTECT,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "version"],
                name="unique_calculation_constant",
            )
        ]

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


class DeliverableType(models.Model):
    code = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class RevenueCategory(models.Model):
    budget_ledger_id = models.PositiveIntegerField(primary_key=True)
    external_party = models.CharField(max_length=20)
    description = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.description} ({self.budget_ledger_id})"


# TODO: Consider to add Post-Graduate Stipend rates if required. not used, but present in the Excel workbook

# ------------------- Schema for Data Derived From Application -------------


REFERENCE_PREFIX = "RCP"


def build_reference(year: int, project_id: int) -> str:
    # Human-readable handle for a project, allocated once at creation. The
    # project id makes it unique without a counter table or a race; the year
    # is what makes it readable to someone quoting it back to us.
    return f"{REFERENCE_PREFIX}-{year}-{project_id:04d}"


def build_account_string(
    company: str,
    cost_centre: str,
    activity: str | None,
    region: str | None,
) -> str:
    if not (activity and region):
        return ""
    return f"{company}-{cost_centre}-{activity}-{region}"


class Project(models.Model):
    if TYPE_CHECKING:
        id: int
        department_id: str
        activity_id: str | None
        region_id: str | None
        budgets: RelatedManager["Budget"]

    COMPANY_CODE = "C001"

    # Store the central data
    # Blank while a draft is being written: clearing the title to retype it
    # must not be an error. Completeness belongs at submission, not on the row.
    title = models.CharField(max_length=200, blank=True)
    department = models.ForeignKey("Department", on_delete=models.PROTECT)
    chief_investigator = models.CharField(max_length=100, blank=True)
    # Blank until Project Details names one: a project is created with only a
    # title and a department, so that costing can start straight away.
    funder = models.CharField(max_length=100, blank=True)
    other_funder = models.CharField(max_length=200, blank=True, default="")
    other_funder_category = models.CharField(max_length=100, blank=True, default="")
    scheme = models.CharField(max_length=200, blank=True)

    # Dictates potential year allocations for staff
    start_year = models.PositiveSmallIntegerField()
    start_month = models.PositiveSmallIntegerField(validators=[MaxValueValidator(12)])
    end_year = models.PositiveSmallIntegerField()
    end_month = models.PositiveSmallIntegerField(validators=[MaxValueValidator(12)])

    activity = models.ForeignKey(
        "Activity", null=True, blank=True, on_delete=models.PROTECT
    )
    region = models.ForeignKey(
        "Region", null=True, blank=True, on_delete=models.PROTECT
    )

    additional_information = models.TextField(blank=True)

    # PROTECT: a user who owns projects is deactivated, never deleted.
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    # Null only between the insert and the second write in save() below, which
    # is why this is nullable rather than blank: two blank strings would
    # collide on the unique constraint, two NULLs do not.
    reference = models.CharField(max_length=20, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Allocated here rather than in the service so that every path that
        # makes a project -- the API, the demo command, tests, the admin --
        # gets one.
        creating = self._state.adding
        super().save(*args, **kwargs)
        if creating and not self.reference:
            self.reference = build_reference(self.created_at.year, self.pk)
            super().save(update_fields=["reference"])

    # Account string computed fresh from existing fields
    @property
    def account_string(self):
        return build_account_string(
            self.COMPANY_CODE,
            self.department_id,
            self.activity_id,
            self.region_id,
        )

    def __str__(self):
        return self.title


# TODO: confirm whether there is a mode switch. Currently included in serializer.
class Budget(models.Model):
    # One costed attempt at a project. A project can carry several: a first
    # attempt, a revision after a rejection, a variant for a different funder,
    # which is the thing the workbook cannot do, since one file is one budget.
    #
    # The multipliers are stored per budget rather than read from
    # CalculationConstant at calculation time.

    if TYPE_CHECKING:

        def get_status_display(self) -> str: ...

    class Mode(models.TextChoices):
        SIMPLE = "simple", "Simple"
        FULL = "full", "Full"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        HOD_REVIEW = "hod_review", "Head of Department review"
        DEAN_REVIEW = "dean_review", "Dean review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    if TYPE_CHECKING:
        id: int
        lookup_version_id: int | None
        deliverables: RelatedManager["Deliverable"]
        staff_lines: RelatedManager["StaffCostLine"]
        non_staff_lines: RelatedManager["NonStaffCostLine"]
        approval_steps: RelatedManager["ApprovalStep"]

    # Null while the budget is a draft, which is what makes it price against
    # the live rates: an unauthorised budget is meant to pick up lookup changes
    # made after it was created. It is stamped with the current version at
    # submit, and from then on the budget is frozen against that one.
    lookup_version = models.ForeignKey(
        "LookupVersion",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )

    project = models.ForeignKey(
        "Project", related_name="budgets", on_delete=models.CASCADE
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.FULL)

    # Seeded from CalculationConstant when the budget is created, not by a
    # field default, because the current values live in the database.
    cost_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal(0))],
    )
    in_kind_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        validators=[MinValueValidator(Decimal(0))],
    )

    # A markup on cost, not a margin on price: the profit margin the project
    # earns over what it costs. Price = project_cost * (1 + margin), so the
    # default 0.30 prices a $100k project at $130k, not at $142,857. Settled
    # with RIC; the workbook's Summary of Price agrees.
    margin = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        validators=[MinValueValidator(Decimal(0))],
    )

    gst_applicable = models.BooleanField(default=True)

    cash_co_contribution = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal(0),
        validators=[MinValueValidator(Decimal(0))],
    )

    comments = models.TextField(blank=True, default="")

    justification = models.CharField(max_length=200, blank=True, default="")
    justification_notes = models.TextField(blank=True, default="")
    dean_exemption_reason = models.TextField(blank=True, default="")

    # Plain CharField rather than whatever it will be when
    # authentication comes in
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    # The engine's headline number, kept on the row so a list of projects is
    # one query rather than one pricing run per project. Written by
    # services/budget_details.py, which every path that changes a priced field
    # already goes through.
    total_price_exc_gst = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal(0),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def touch(self) -> None:
        """
        Mark the budget as edited.

        A budget's own columns do not change when a cost line is added or
        removed, so auto_now never fires for the edits people make most. The
        queryset update is deliberate: it writes the one column without
        touching anything else the caller holds in memory.
        """
        Budget.objects.filter(pk=self.pk).update(updated_at=timezone.now())

    def __str__(self):
        return f"{self.project} ({self.get_status_display()})"


class ApprovalStep(models.Model):
    # One review a budget has to pass. Created in pairs at submit: a department
    # step that is always required, and a faculty step that is marked
    # not_required when no dean trigger fired, so the history reads straight
    # either way rather than going quiet when no Dean was needed.
    #
    # There is no signature field, and there should not be one. The
    # authenticated login, the decision and the timestamp are the evidence;
    # nothing drawn, typed or uploaded is collected.

    if TYPE_CHECKING:
        id: int

        def get_level_display(self) -> str: ...

        def get_status_display(self) -> str: ...

    class Level(models.TextChoices):
        DEPARTMENT = "department", "Head of Department"
        FACULTY = "faculty", "Dean"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        NOT_REQUIRED = "not_required", "Not required"

    budget = models.ForeignKey(
        "Budget", related_name="approval_steps", on_delete=models.CASCADE
    )
    level = models.CharField(max_length=20, choices=Level.choices)
    required = models.BooleanField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # PROTECT rather than SET_NULL, deliberately unlike AuditLog.actor: accounts
    # are deactivated rather than deleted, and a decision that loses its decider
    # stops being evidence. An audit log has to survive anything; an approval
    # has to refuse it.
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    comment = models.TextField(blank=True, default="")

    class Meta:
        # Spelled with string literals rather than Status.APPROVED: a nested
        # Meta cannot see names in the class body around it.
        constraints = [
            # Two steps at one level are two answers to one question, with
            # nothing to say which one counted.
            models.UniqueConstraint(
                fields=["budget", "level"],
                name="unique_approval_step_per_level",
            ),
            # An approval nobody signed for is worth nothing at audit.
            models.CheckConstraint(
                condition=~models.Q(status__in=["approved", "rejected"])
                | models.Q(decided_by__isnull=False, decided_at__isnull=False),
                name="decided_approval_step_names_its_decider",
            ),
            # The mirror: a time on an undecided step means nothing and will be
            # read as though it meant something.
            models.CheckConstraint(
                condition=~models.Q(status__in=["pending", "not_required"])
                | models.Q(decided_by__isnull=True, decided_at__isnull=True),
                name="undecided_approval_step_names_nobody",
            ),
        ]

    def __str__(self):
        return f"{self.get_level_display()} ({self.get_status_display()})"


class Deliverable(models.Model):
    if TYPE_CHECKING:
        id: int

    budget = models.ForeignKey(
        "Budget", related_name="deliverables", on_delete=models.CASCADE
    )
    number = models.PositiveSmallIntegerField()
    description = models.CharField(max_length=200)
    deliverable_type = models.ForeignKey("DeliverableType", on_delete=models.PROTECT)
    invoice_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal(0))],
    )

    due_date = models.CharField(max_length=100, blank=True)
    dependency = models.PositiveSmallIntegerField(null=True, blank=True)
    sponsor = models.CharField(max_length=100, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["budget", "number"], name="unique_deliverable_number"
            )
        ]

    def __str__(self):
        return f"{self.number}. {self.description}"


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

    if TYPE_CHECKING:
        id: int
        allocations: RelatedManager["YearAllocation"]

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
    # Why the University is carrying this rather than charging it. The column
    # on Adjust Price promised somewhere to write this and had nowhere (#92):
    # a tick with no sentence beside it does not tell a reviewer who decided
    # the University would absorb the cost, or on what grounds.
    in_kind_reason = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        constraints = [
            # A reason belongs to a tick. Without this the column could carry
            # an explanation for a cost nobody is absorbing, which reads as
            # though the line were in-kind when it is not.
            models.CheckConstraint(
                condition=models.Q(in_kind=True) | models.Q(in_kind_reason=""),
                name="%(class)s_reason_needs_the_tick",
            ),
        ]

    def __str__(self):
        return f"{self.name_role} ({self.classification})"


class YearAllocation(models.Model):
    # How much time a staff line commits in one project year. Separate rows
    # rather than fixed year columns, so a project can run any number of years.

    staff_line = models.ForeignKey(
        "StaffCostLine", related_name="allocations", on_delete=models.CASCADE
    )
    year = models.PositiveSmallIntegerField()
    time = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        validators=[MinValueValidator(Decimal(0))],
    )

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


class NonStaffCostLine(models.Model):
    """
    A non-salary cost on a budget: equipment, travel etc.
    Amounts live in YearAmount, one row per project year.
    """

    if TYPE_CHECKING:
        id: int
        amounts: RelatedManager["YearAmount"]

    # Carries reference data, FK allows that data to be connected
    budget = models.ForeignKey(
        "Budget", related_name="non_staff_lines", on_delete=models.CASCADE
    )

    category = models.ForeignKey("NonStaffCostCategory", on_delete=models.PROTECT)

    description = models.CharField(max_length=200, blank=True)

    in_kind = models.BooleanField(default=False)
    # Why the University is carrying this rather than charging it. The column
    # on Adjust Price promised somewhere to write this and had nowhere (#92):
    # a tick with no sentence beside it does not tell a reviewer who decided
    # the University would absorb the cost, or on what grounds.
    in_kind_reason = models.CharField(max_length=200, blank=True, default="")

    # An estimate for extra cost
    add_ten_percent = models.BooleanField(default=False)

    indirect_rate_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal(0))],
    )

    class Meta:
        constraints = [
            # A reason belongs to a tick. Without this the column could carry
            # an explanation for a cost nobody is absorbing, which reads as
            # though the line were in-kind when it is not.
            models.CheckConstraint(
                condition=models.Q(in_kind=True) | models.Q(in_kind_reason=""),
                name="%(class)s_reason_needs_the_tick",
            ),
        ]

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
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal(0))],
    )

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
