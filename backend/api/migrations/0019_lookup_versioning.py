"""
Lookup tables gain a version, and a budget gains the version it was priced on.

Written by hand rather than generated. Three tables lose a natural primary key
(`CalculationConstant.name`, `EbaIncrease.year`,
`SalaryRateMultiplier.time_basis`) so that a row can exist once per version,
and Postgres will not hold two primary keys at once while that is swapped in
place. They are dropped and rebuilt instead, which is safe because every row
in them is reference data: `import_lookups` reads it from the workbook and
`seed` loads it, so nothing here is anyone's work.

The two tables that keep their primary key are emptied for the same reason,
so the non-null version column arrives without a version having to be invented
for rows that predate the idea of one.
"""

from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

REBUILT = ["CalculationConstant", "EbaIncrease", "SalaryRateMultiplier"]
EMPTIED = ["SalaryRate", "OnCostRate"]


def empty_the_versioned_tables(apps, schema_editor):
    for name in EMPTIED + REBUILT:
        apps.get_model("api", name).objects.all().delete()


def create_the_first_version(apps, schema_editor):
    version = apps.get_model("api", "LookupVersion").objects.create()
    apps.get_model("api", "LookupConfiguration").objects.create(
        id=1, current_version=version, referenced=False
    )


def drop_the_first_version(apps, schema_editor):
    apps.get_model("api", "LookupConfiguration").objects.all().delete()
    apps.get_model("api", "LookupVersion").objects.all().delete()


def version_fk():
    return models.ForeignKey(
        on_delete=django.db.models.deletion.PROTECT, to="api.lookupversion"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0018_alter_budget_status_approvalstep"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(
            empty_the_versioned_tables, migrations.RunPython.noop
        ),
        migrations.CreateModel(
            name="LookupVersion",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="LookupConfiguration",
            fields=[
                (
                    "id",
                    models.IntegerField(
                        default=1,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("referenced", models.BooleanField(default=False)),
                (
                    "current_version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="api.lookupversion",
                    ),
                ),
            ],
        ),
        migrations.DeleteModel(name="MinimumCostRecoveryMultiplier"),
        # --- kept tables: empty, so a non-null version column is free -------
        migrations.RemoveConstraint(
            model_name="salaryrate", name="unique_salary_rate"
        ),
        migrations.AddField(
            model_name="salaryrate", name="version", field=version_fk()
        ),
        migrations.AddConstraint(
            model_name="salaryrate",
            constraint=models.UniqueConstraint(
                fields=("payroll_type", "category", "classification", "version"),
                name="unique_salary_rate",
            ),
        ),
        migrations.RemoveConstraint(
            model_name="oncostrate", name="unique_on_cost_rate"
        ),
        migrations.AddField(
            model_name="oncostrate", name="version", field=version_fk()
        ),
        migrations.AddConstraint(
            model_name="oncostrate",
            constraint=models.UniqueConstraint(
                fields=("on_cost_type", "employment_type", "year", "version"),
                name="unique_on_cost_rate",
                nulls_distinct=False,
            ),
        ),
        # --- rebuilt tables: the primary key moves ---------------------------
        migrations.DeleteModel(name="CalculationConstant"),
        migrations.CreateModel(
            name="CalculationConstant",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=50)),
                ("description", models.CharField(blank=True, max_length=200)),
                ("value", models.DecimalField(decimal_places=6, max_digits=12)),
                ("version", version_fk()),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("name", "version"),
                        name="unique_calculation_constant",
                    )
                ]
            },
        ),
        migrations.DeleteModel(name="EbaIncrease"),
        migrations.CreateModel(
            name="EbaIncrease",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("year", models.PositiveSmallIntegerField()),
                (
                    "multiplier",
                    models.DecimalField(
                        decimal_places=6,
                        max_digits=8,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0"))
                        ],
                    ),
                ),
                ("version", version_fk()),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("year", "version"), name="unique_eba"
                    )
                ]
            },
        ),
        migrations.DeleteModel(name="SalaryRateMultiplier"),
        migrations.CreateModel(
            name="SalaryRateMultiplier",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("time_basis", models.CharField(max_length=20)),
                (
                    "multiplier",
                    models.DecimalField(
                        decimal_places=18,
                        max_digits=20,
                        validators=[
                            django.core.validators.MinValueValidator(Decimal("0"))
                        ],
                    ),
                ),
                ("version", version_fk()),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("time_basis", "version"),
                        name="unique_salary_rate_multiplier",
                    )
                ]
            },
        ),
        # --- a budget remembers the version it was priced on -----------------
        migrations.AddField(
            model_name="budget",
            name="lookup_version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="api.lookupversion",
            ),
        ),
        migrations.RunPython(create_the_first_version, drop_the_first_version),
    ]
