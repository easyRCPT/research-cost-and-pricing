"""
The three groups every role check in Phase A reads.

A group is which door someone comes in through, and nothing else. There is no
hod or dean group: being a head of department is this person, in this
department, in that role, which is a UserOrgAssignment. A group cannot say
*which* department, so it never decided anything on its own.

get_or_create on the name, so re-running this on a database that already has
the rows does nothing.
"""

from django.db import migrations

GROUPS = ["researcher", "staff", "superadmin"]


def seed(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in GROUPS:
        Group.objects.get_or_create(name=name)


def unseed(apps, schema_editor):
    apps.get_model("auth", "Group").objects.filter(name__in=GROUPS).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0020_faculty_and_org_assignments"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [migrations.RunPython(seed, unseed)]
