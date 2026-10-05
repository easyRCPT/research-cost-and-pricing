"""
A staff line can be marked as the chief investigator's (#166).

The CI's line used to be whichever row was first, so naming a CI took over row
one whatever it held. Existing costings keep what was meant, not what was
assumed: the first line is marked only where its saved name is already the
CI's, so no one else's costing is attributed to the CI.
"""

from django.db import migrations, models


def mark_existing_ci_lines(apps, schema_editor):
    Budget = apps.get_model("api", "Budget")
    StaffCostLine = apps.get_model("api", "StaffCostLine")
    for budget in Budget.objects.select_related("project").iterator():
        ci = (budget.project.chief_investigator or "").strip().casefold()
        if not ci:
            continue
        first = (
            StaffCostLine.objects.filter(budget=budget)
            .order_by("position", "created_at")
            .first()
        )
        if first is not None and first.name_role.strip().casefold() == ci:
            first.is_ci = True
            first.save(update_fields=["is_ci"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0043_remove_indirect_rate_multiplier"),
    ]

    operations = [
        migrations.AddField(
            model_name="staffcostline",
            name="is_ci",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(mark_existing_ci_lines, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="staffcostline",
            constraint=models.UniqueConstraint(
                condition=models.Q(("is_ci", True)),
                fields=("budget",),
                name="one_ci_line_per_budget",
            ),
        ),
    ]
