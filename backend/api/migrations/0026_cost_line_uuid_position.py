"""
Cost lines get a UUID primary key, a position and timestamps (#93).

Written by hand. Django alters an integer key to a UUID with a cast Postgres
refuses, so the key is swapped in SQL and the state is told it happened. Saved
lines are kept: each gets a fresh UUID, its year rows follow it, and position
records the order they were created in, which is the order the table showed.
"""

import uuid

import django.utils.timezone
from django.db import migrations, models


def number_positions(apps, schema_editor):
    for name in ("StaffCostLine", "NonStaffCostLine"):
        model = apps.get_model("api", name)
        position = {}
        for line in model.objects.order_by("budget_id", "id"):
            line.position = position.get(line.budget_id, 0)
            position[line.budget_id] = line.position + 1
            line.save(update_fields=["position"])


def swap_to_uuid(line_table, child_table, child_column, unique_name):
    return f"""
    ALTER TABLE {line_table} ADD COLUMN new_id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE {child_table} ADD COLUMN new_{child_column} uuid;
    UPDATE {child_table} child SET new_{child_column} = line.new_id
        FROM {line_table} line WHERE child.{child_column} = line.id;

    -- Takes the foreign key, its index and the unique constraint with it.
    ALTER TABLE {child_table} DROP COLUMN {child_column};
    ALTER TABLE {child_table} RENAME COLUMN new_{child_column} TO {child_column};
    ALTER TABLE {child_table} ALTER COLUMN {child_column} SET NOT NULL;

    ALTER TABLE {line_table} DROP COLUMN id;
    ALTER TABLE {line_table} RENAME COLUMN new_id TO id;
    ALTER TABLE {line_table} ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE {line_table} ADD PRIMARY KEY (id);

    ALTER TABLE {child_table} ADD CONSTRAINT {child_table}_{child_column}_fk
        FOREIGN KEY ({child_column}) REFERENCES {line_table} (id)
        DEFERRABLE INITIALLY DEFERRED;
    CREATE INDEX {child_table}_{child_column}_idx ON {child_table} ({child_column});
    ALTER TABLE {child_table} ADD CONSTRAINT {unique_name}
        UNIQUE ({child_column}, year);
    """


def uuid_key():
    return models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
    )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0025_project_owner_required"),
    ]

    operations = [
        migrations.AddField(
            model_name="staffcostline",
            name="position",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="nonstaffcostline",
            name="position",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(number_positions, migrations.RunPython.noop),
        migrations.AddField(
            model_name="staffcostline",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="staffcostline",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="nonstaffcostline",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True, default=django.utils.timezone.now
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="nonstaffcostline",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterModelOptions(
            name="staffcostline",
            options={"ordering": ["position", "created_at"]},
        ),
        migrations.AlterModelOptions(
            name="nonstaffcostline",
            options={"ordering": ["position", "created_at"]},
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    swap_to_uuid(
                        "api_staffcostline",
                        "api_yearallocation",
                        "staff_line_id",
                        "unique_year_allocation",
                    )
                ),
                migrations.RunSQL(
                    swap_to_uuid(
                        "api_nonstaffcostline",
                        "api_yearamount",
                        "non_staff_line_id",
                        "unique_year_amount",
                    )
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="staffcostline", name="id", field=uuid_key()
                ),
                migrations.AlterField(
                    model_name="nonstaffcostline", name="id", field=uuid_key()
                ),
            ],
        ),
    ]
