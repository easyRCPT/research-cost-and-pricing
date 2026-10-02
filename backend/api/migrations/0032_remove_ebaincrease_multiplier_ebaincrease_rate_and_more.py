"""
Replace EBA multiplier with annual rate.

The calculation engine now derives the compounded multiplier from the annual
rate, so each row holds the increase over the year before, and only the years
where the rate changes are kept: the engine reads the closest earlier year.

Every version's rows are converted rather than dropped. A submitted costing is
priced on the version it was stamped with (#52), so emptying those versions
would reprice every approved costing with no EBA increase at all, and the seed
only reloads into an empty database. Databases that ran the first cut of this
migration, which did drop them, are refilled by 0034.
"""

from decimal import ROUND_HALF_UP, Decimal

import django.core.validators
from django.db import migrations, models

# The multipliers were stored to six places, so a rate worked back from two of
# them carries noise in the sixth (1.652848 / 1.604706 is 3.00005%). An EBA rate
# is set to a hundredth of a percent at most, so four places drops the noise
# without moving any real rate.
RATE_PLACES = Decimal("0.0001")


def check_constraints_now(schema_editor):
    # Postgres won't alter a table with foreign key checks still queued from
    # rows changed earlier in the same transaction, and the next operation here
    # alters this one. Running them as each statement ends leaves none queued.
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("SET CONSTRAINTS ALL IMMEDIATE")


def multipliers_to_rates(apps, schema_editor):
    check_constraints_now(schema_editor)
    EbaIncrease = apps.get_model("api", "EbaIncrease")

    by_version = {}
    for row in EbaIncrease.objects.order_by("version_id", "year"):
        by_version.setdefault(row.version_id, []).append(row)

    for rows in by_version.values():
        kept_rate = None
        previous = rows[0]
        # The first year is the base the multipliers compound from (2025 at
        # 1.000000), so it has no increase of its own.
        previous.delete()

        for row in rows[1:]:
            gap = row.year - previous.year
            ratio = row.multiplier / previous.multiplier
            if gap > 1:
                ratio = Decimal(float(ratio) ** (1 / gap))
            rate = (ratio - 1).quantize(RATE_PLACES, rounding=ROUND_HALF_UP)
            previous = row

            if rate == kept_rate:
                row.delete()
                continue

            row.rate = rate
            row.save(update_fields=["rate"])
            kept_rate = rate


def drop_every_row(apps, schema_editor):
    # Undoing this puts back a non-null multiplier column, which an existing
    # row could not satisfy. The first cut of this migration dropped the rows
    # in both directions; reversing still does.
    check_constraints_now(schema_editor)
    apps.get_model("api", "EbaIncrease").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0031_nonstaffcostcategory_excludes_additional_rate_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="ebaincrease",
            name="unique_eba",
        ),
        migrations.AlterField(
            model_name="ebaincrease",
            name="year",
            field=models.IntegerField(),
        ),
        migrations.AddField(
            model_name="ebaincrease",
            name="rate",
            field=models.DecimalField(
                decimal_places=6,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
            ),
        ),
        migrations.RunPython(multipliers_to_rates, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="ebaincrease",
            name="multiplier",
        ),
        migrations.RunPython(migrations.RunPython.noop, drop_every_row),
        migrations.AlterField(
            model_name="ebaincrease",
            name="rate",
            field=models.DecimalField(
                decimal_places=6,
                max_digits=8,
                validators=[django.core.validators.MinValueValidator(Decimal("0"))],
            ),
        ),
        migrations.AddConstraint(
            model_name="ebaincrease",
            constraint=models.UniqueConstraint(
                fields=("year", "version"),
                name="unique_eba_increase",
            ),
        ),
        migrations.AlterField(
            model_name="nonstaffcostline",
            name="indirect_rate_multiplier",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=4,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("1"))],
            ),
        ),
    ]
