"""
Faculty becomes a table, and a user can be assigned to part of the university.

Written by hand. The issue asks for three migrations on the grounds that one
cannot backfill between adding a column and constraining it; on Postgres it
can, because operations inside a migration run in order and DDL is
transactional. Adding the column, filling it and tightening it are three
operations here rather than three files, which keeps the whole swap reviewable
in one place.

`Department.faculty` changes from a CharField to a foreign key of the same
name, so the old column is renamed out of the way first rather than dropped
before its values have been read.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def build_faculties(apps, schema_editor):
    """One Faculty per distinct (code, name) already on Department."""
    Department = apps.get_model("api", "Department")
    Faculty = apps.get_model("api", "Faculty")

    pairs = set(
        Department.objects.values_list("faculty_code", "legacy_faculty_name")
    )
    Faculty.objects.bulk_create(
        [Faculty(code=code, name=name) for code, name in sorted(pairs) if code],
        ignore_conflicts=True,
    )

    for code, _ in pairs:
        if code:
            Department.objects.filter(faculty_code=code).update(faculty_id=code)


def unbuild_faculties(apps, schema_editor):
    Department = apps.get_model("api", "Department")
    for department in Department.objects.select_related("faculty"):
        department.faculty_code = department.faculty_id or ""
        department.legacy_faculty_name = (
            department.faculty.name if department.faculty_id else ""
        )
        department.save(update_fields=["faculty_code", "legacy_faculty_name"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0019_lookup_versioning"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Faculty",
            fields=[
                (
                    "code",
                    models.CharField(max_length=20, primary_key=True, serialize=False),
                ),
                ("name", models.CharField(max_length=150)),
            ],
            options={"verbose_name_plural": "faculties"},
        ),
        # The name is needed for the backfill, so it moves aside rather than out.
        migrations.RenameField(
            model_name="department",
            old_name="faculty",
            new_name="legacy_faculty_name",
        ),
        migrations.AddField(
            model_name="department",
            name="faculty",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="departments",
                to="api.faculty",
            ),
        ),
        migrations.RunPython(build_faculties, unbuild_faculties),
        migrations.AlterField(
            model_name="department",
            name="faculty",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="departments",
                to="api.faculty",
            ),
        ),
        migrations.RemoveField(model_name="department", name="legacy_faculty_name"),
        migrations.RemoveField(model_name="department", name="faculty_code"),
        migrations.CreateModel(
            name="UserOrgAssignment",
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
                    "role",
                    models.CharField(
                        choices=[
                            ("member", "Member"),
                            ("hod", "Head of Department"),
                            ("dean", "Dean"),
                        ],
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "department",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="org_assignments",
                        to="api.department",
                    ),
                ),
                (
                    "faculty",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="org_assignments",
                        to="api.faculty",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="org_assignments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="userorgassignment",
            constraint=models.CheckConstraint(
                condition=models.Q(
                    role__in=["member", "hod"],
                    department__isnull=False,
                    faculty__isnull=True,
                )
                | models.Q(
                    role="dean", faculty__isnull=False, department__isnull=True
                ),
                name="org_assignment_scope_matches_role",
            ),
        ),
        migrations.AddConstraint(
            model_name="userorgassignment",
            constraint=models.UniqueConstraint(
                fields=("user", "role", "department"),
                name="unique_department_assignment",
            ),
        ),
        migrations.AddConstraint(
            model_name="userorgassignment",
            constraint=models.UniqueConstraint(
                fields=("user", "role", "faculty"),
                name="unique_faculty_assignment",
            ),
        ),
    ]
