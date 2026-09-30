"""
Replace EBA multiplier with annual rate.

EBA increases are lookup data imported from the workbook. The old multiplier
column is removed because the calculation engine now derives the compounded
multiplier from the annual rate. Existing rows are rebuilt by
`import_lookups` and do not need to be preserved.

"""

from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0031_nonstaffcostcategory_excludes_additional_rate_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="EbaIncrease",
        ),
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
                (
                    "year",
                    models.IntegerField(),
                ),
                (
                    "rate",
                    models.DecimalField(
                        decimal_places=6,
                        max_digits=8,
                        validators=[
                            django.core.validators.MinValueValidator(
                                Decimal("0")
                            )
                        ],
                    ),
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
                        fields=("year", "version"),
                        name="unique_eba_increase",
                    ),
                ],
            },
        ),
        migrations.AlterField(
            model_name="nonstaffcostline",
            name="indirect_rate_multiplier",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=4,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(
                        Decimal("1")
                    )
                ],
            ),
        ),
    ]
