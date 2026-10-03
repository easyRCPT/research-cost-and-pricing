"""
In-kind staff are costed at the full cost recovery multiplier (#149).

The separate in_kind_multiplier constant is removed from every version: nothing
reads it any more, and a row an administrator could edit to no effect would
read as though it still set the in-kind rate. The multiplier's description
says what it now covers.
"""

from django.db import migrations

DESCRIPTION = "The full cost recovery multiplier, for staff and in-kind staff."
OLD_DESCRIPTION = "Default cost recovery multiplier"


def retire(apps, schema_editor):
    CalculationConstant = apps.get_model("api", "CalculationConstant")
    CalculationConstant.objects.filter(name="in_kind_multiplier").delete()
    CalculationConstant.objects.filter(
        name="full_cost_recovery_multiplier", description=OLD_DESCRIPTION
    ).update(description=DESCRIPTION)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0034_fill_eba_rates_and_salary_rate_year"),
    ]

    operations = [
        # Reversing doesn't put the rows back. Code from before this would
        # need them; reapply the seed or re-import if it must run again.
        migrations.RunPython(retire, migrations.RunPython.noop),
    ]
