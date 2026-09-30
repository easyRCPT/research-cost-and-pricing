"""
Give NonStaffCostCategory a surrogate primary key and add lookup versioning.

The old table used `ledger_id` as its primary key. Once lookup versioning
was introduced, the same ledger ID needs to exist in multiple versions, so
it can no longer be the primary key.

This table contains reference data only. It is rebuilt rather than migrated:
`import_lookups` reads the workbook and `seed` restores the fixture. Existing
rows are not user data and do not need to be preserved.

The foreign key from NonStaffCostLine is removed while the primary key changes
and restored afterwards.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0030_cost_line_uuid_position"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="nonstaffcostline",
            name="category",
        ),
        migrations.DeleteModel(
            name="NonStaffCostCategory",
        ),
        migrations.CreateModel(
            name="NonStaffCostCategory",
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
                (
                    "ledger_id",
                    models.IntegerField(),
                ),
                (
                    "cost_category",
                    models.CharField(max_length=100),
                ),
                (
                    "cost_subcategory",
                    models.CharField(max_length=150),
                ),
                (
                    "excludes_additional_rate",
                    models.BooleanField(default=False),
                ),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="api.lookupversion",
                    ),
                ),
            ],
            options={
                "constraints": [
                    models.UniqueConstraint(
                        fields=("ledger_id", "version"),
                        name="unique_non_staff_category",
                    ),
                ],
            },
        ),
        migrations.AddField(
            model_name="nonstaffcostline",
            name="category",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="api.nonstaffcostcategory",
            ),
        ),
    ]
