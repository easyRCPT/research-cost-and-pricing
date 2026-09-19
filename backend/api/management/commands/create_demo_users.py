"""
The four accounts a demo is walked through.

Never runs on its own: seeds are automatic, this is not. It writes a known
password, so it belongs in a command someone has to type.

The roles follow #40 rather than the prototype's seed. A group is which door
someone comes in through, and there is no hod or dean group: a head of
department is a `staff` account holding an assignment that names the
department, and a dean is a `staff` account holding one that names the faculty.
The prototype carried both a group and an assignment, which is one fact in two
places, free to disagree.
"""

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Department, Faculty, User, UserOrgAssignment

PASSWORD = "demo1234"

HOD_DEPARTMENT = "CCH_H1_5_39"  # School of Computing and Information Systems
DEAN_FACULTY = "CCH_H1_3_06"  # Faculty of Engineering and Information Technology

PEOPLE = [
    {
        "email": "researcher@unimelb.edu.au",
        "first_name": "Ruth",
        "last_name": "Researcher",
        "groups": ["researcher"],
    },
    {
        "email": "hod@unimelb.edu.au",
        "first_name": "Hana",
        "last_name": "Head",
        "groups": ["staff"],
        "assignment": ("hod", "department"),
    },
    {
        "email": "dean@unimelb.edu.au",
        "first_name": "Dana",
        "last_name": "Dean",
        "groups": ["staff"],
        "assignment": ("dean", "faculty"),
    },
    {
        "email": "admin@unimelb.edu.au",
        "first_name": "Sam",
        "last_name": "Admin",
        "groups": ["staff", "superadmin"],
        "staff_flags": True,
    },
]


class Command(BaseCommand):
    help = f"Create the four demo accounts, all with the password {PASSWORD!r}."

    @transaction.atomic
    def handle(self, *args, **options):
        if not Group.objects.filter(name="researcher").exists():
            raise CommandError("Groups are not seeded. Run migrate first.")

        try:
            department = Department.objects.get(code=HOD_DEPARTMENT)
            faculty = Faculty.objects.get(code=DEAN_FACULTY)
        except (Department.DoesNotExist, Faculty.DoesNotExist) as missing:
            raise CommandError(f"Reference data is not seeded: {missing}") from missing

        for person in PEOPLE:
            user, created = User.objects.get_or_create(
                username=person["email"],
                defaults={
                    "email": person["email"],
                    "first_name": person["first_name"],
                    "last_name": person["last_name"],
                },
            )
            # Re-running resets the password rather than leaving a stale one.
            user.set_password(PASSWORD)
            if person.get("staff_flags"):
                # So the same account reaches the Django admin, which is where
                # lookup rows and org assignments are edited until D4.
                user.is_staff = True
                user.is_superuser = True
            user.save()

            user.groups.set(Group.objects.filter(name__in=person["groups"]))

            role, scope = person.get("assignment", (None, None))
            if role:
                UserOrgAssignment.objects.get_or_create(
                    user=user,
                    role=role,
                    department=department if scope == "department" else None,
                    faculty=faculty if scope == "faculty" else None,
                )

            self.stdout.write(
                f"  {person['email']:<28} "
                f"{'created' if created else 'updated'}  "
                f"groups={','.join(person['groups'])}"
                + (f"  {role} of {scope}" if role else "")
            )

        self.stdout.write(
            self.style.SUCCESS(f"Four demo accounts ready. Password: {PASSWORD}")
        )
