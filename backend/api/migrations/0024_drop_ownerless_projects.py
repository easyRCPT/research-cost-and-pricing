"""Delete projects with no owner before 0025 requires one. They were all test data."""

from django.db import migrations


def drop(apps, schema_editor):
    apps.get_model("api", "Project").objects.filter(created_by__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [("api", "0023_in_kind_reason")]

    operations = [migrations.RunPython(drop, migrations.RunPython.noop)]
