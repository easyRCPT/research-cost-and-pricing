from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Budget, Department, Project, User
from api.services.project import budget_defaults

TITLE = "Demo Project"
OWNER = "researcher@unimelb.edu.au"


class Command(BaseCommand):
    help = "Create a demo project and budget to develop against (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--start-year", type=int, default=2026)
        parser.add_argument("--end-year", type=int, default=2028)

    @transaction.atomic
    def handle(self, *args, **options):
        department = Department.objects.order_by("code").first()
        if department is None:
            raise CommandError("No departments. Run `make seed` first.")

        owner = User.objects.filter(email=OWNER).first()
        if owner is None:
            raise CommandError(f"No {OWNER}. Run `make demo-users` first.")

        project, _ = Project.objects.get_or_create(
            title=TITLE,
            defaults={
                "department": department,
                "chief_investigator": "A. Researcher",
                "funder": "Demo Funder",
                "start_year": options["start_year"],
                "start_month": 1,
                "end_year": options["end_year"],
                "end_month": 12,
                "created_by": owner,
            },
        )

        budget = project.budgets.order_by("id").first()
        if budget is None:
            budget = Budget.objects.create(project=project, **budget_defaults())

        self.stdout.write(
            self.style.SUCCESS(f"Budget {budget.id} on project {project.id} ready.")
        )
