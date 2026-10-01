from collections.abc import Iterable
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command

from api.models import Budget, Department, Faculty, Project, User
from api.services.project import budget_defaults


def seed_lookups() -> None:
    call_command(
        "loaddata",
        str(Path(settings.BASE_DIR) / "seeds" / "lookups.json"),
        verbosity=0,
    )


def make_user(
    email: str = "owner@unimelb.edu.au", *, groups: Iterable[str] = (), **extra
) -> User:
    user = User.objects.create_user(email=email, **extra)
    user.groups.set(Group.objects.filter(name__in=groups))
    return user


def make_faculty(code: str = "SCI", name: str | None = None) -> Faculty:
    return Faculty.objects.get_or_create(
        code=code, defaults={"name": name or f"{code} Faculty"}
    )[0]


def make_department(
    code: str = "SCI", faculty: Faculty | None = None, **fields
) -> Department:
    faculty = faculty or make_faculty(code)
    return Department.objects.create(
        **{
            "code": code,
            "name": code,
            "school": f"{code} School",
            "school_code": code,
            "faculty": faculty,
            **fields,
        }
    )


def make_project(
    owner: User | None = None, department: Department | None = None, **fields
) -> Project:
    return Project.objects.create(
        **{
            "title": "Test Project",
            "start_year": 2026,
            "start_month": 1,
            "end_year": 2028,
            "end_month": 12,
            **fields,
            "created_by": owner or make_user(),
            "department": department or make_department(),
        }
    )


def make_budget(project: Project | None = None, **fields) -> Budget:
    return Budget.objects.create(
        **{**budget_defaults(), **fields, "project": project or make_project()}
    )
