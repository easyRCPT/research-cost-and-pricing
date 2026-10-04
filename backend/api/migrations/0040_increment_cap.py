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

INCREMENT_CAPS = (
    ("Level A", 8),
    ("Level B", 6),
    ("Level C", 6),
    ("Level D", 4),
    ("Level E", 1),
    ("RA Grade 1", 3),
    ("UOM 1", 3),
    ("UOM 2", 3),
    ("UOM 3", 6),
    ("UOM 4", 4),
    ("UOM 5", 8),
    ("UOM 6", 5),
    ("UOM 7", 5),
    ("UOM 8", 5),
    ("UOM 9", 3),
    ("UOM 10", 0),
)

CATEGORY_MAPPING = {
    "Academic": {"Level", "RA Grade"},
    "Professional": {"UOM"},
}


def category_for(level):
    for category, prefixes in CATEGORY_MAPPING.items():
        if any(level.startswith(prefix) for prefix in prefixes):
            return category
    raise ValueError(f"No category mapping for level: {level}")


def fill_increment_caps(apps, schema_editor):
    LookupVersion = apps.get_model("api", "LookupVersion")
    CalculationConstant = apps.get_model("api", "CalculationConstant")
    IncrementCap = apps.get_model("api", "IncrementCap")

    for version in LookupVersion.objects.all():
        # The initial version created by 0019 is empty and will be
        # populated by the lookup seed.
        if not CalculationConstant.objects.filter(version=version).exists():
            continue

        IncrementCap.objects.bulk_create(
            [
                IncrementCap(
                    category=category_for(level),
                    level=level,
                    max_steps=max_steps,
                    version=version,
                )
                for level, max_steps in INCREMENT_CAPS
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0039_seed_currencies"),
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
                    "category",
                    models.CharField(max_length=30),
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
                        fields=("category", "level", "version"),
                        name="unique_increment_cap",
                    ),
                ],
            },
        ),
        migrations.RunPython(
            fill_increment_caps,
            migrations.RunPython.noop,
        ),
    ]
