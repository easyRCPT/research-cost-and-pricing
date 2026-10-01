"""
Give IncrementCap a surrogate primary key and add lookup versioning.

The old table used `level` as its primary key. Once lookup versioning
was introduced, the same level needs to exist in multiple versions, so
it can no longer be the primary key.

This table contains reference data only. It is rebuilt rather than
migrated: `import_lookups` reads the workbook and `seed` restores the
fixture. Existing rows are not user data and do not need to be preserved.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0033_remove_ebaincrease_unique_eba_increase_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="IncrementCap",
        ),
        migrations.CreateModel(
            name="IncrementCap",
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
                    "level",
                    models.CharField(max_length=20),
                ),
                (
                    "max_steps",
                    models.PositiveSmallIntegerField(),
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
                        fields=("level", "version"),
                        name="unique_increment_cap",
                    ),
                ],
            },
        ),
    ]
