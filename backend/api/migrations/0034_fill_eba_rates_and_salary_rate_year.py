"""
Give every lookup version the rows the engine now requires.

- `salary_rate_year` is a required calculation constant (lookup_loader's
  REQUIRED_CONSTANTS). No version that predates it has one, and the seed only
  loads into an empty database, so without this every costing fails to price.
- The first cut of 0032 emptied the EBA table in every version. A database that
  ran it has no EBA rate anywhere, and the engine treats a missing rate as no
  increase, so every year after 2025 would be priced at 2025 salaries.

Both are filled with the workbook's values, the same ones the seed carries:
salary rates as at 2025, rising 3% a year from 2026. A version that already has
the rows is left alone.

So is a version with no rates at all. A new database gets an empty first version
from 0019, and the seed loads only while every lookup table is empty: filling
that version here would stop the seed loading.
"""

from decimal import Decimal

from django.db import migrations

SALARY_RATE_YEAR = Decimal("2025")
SALARY_RATE_YEAR_DESCRIPTION = (
    "The year of recorded salary rate that eba increase starts from."
)
FIRST_EBA_YEAR = 2026
EBA_RATE = Decimal("0.03")


def fill(apps, schema_editor):
    LookupVersion = apps.get_model("api", "LookupVersion")
    CalculationConstant = apps.get_model("api", "CalculationConstant")
    EbaIncrease = apps.get_model("api", "EbaIncrease")

    for version in LookupVersion.objects.all():
        if not CalculationConstant.objects.filter(version=version).exists():
            continue

        CalculationConstant.objects.get_or_create(
            version=version,
            name="salary_rate_year",
            defaults={
                "value": SALARY_RATE_YEAR,
                "description": SALARY_RATE_YEAR_DESCRIPTION,
            },
        )

        if not EbaIncrease.objects.filter(version=version).exists():
            EbaIncrease.objects.create(
                version=version, year=FIRST_EBA_YEAR, rate=EBA_RATE
            )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0033_remove_ebaincrease_unique_eba_increase_and_more"),
    ]

    operations = [
        # Reversing leaves the rows in place: the schema before this is the
        # same, and they are valid there.
        migrations.RunPython(fill, migrations.RunPython.noop),
    ]
