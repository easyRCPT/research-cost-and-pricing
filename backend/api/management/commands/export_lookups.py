"""
Export all lookup data from the database as a seed fixture.

This command exports the current database state, so the database must
be completely reset before running it. Otherwise, existing or stale
data may be included in the generated fixture.
"""

from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import BaseCommand, call_command

from api.models import LookupConfiguration, LookupVersion
from api.services.lookup_definitions import LOOKUP_DEFINITIONS


class Command(BaseCommand):
    help = "Export lookup tables to the seed fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="seeds/lookups.json",
            help="Path to the output fixture, relative to BASE_DIR.",
        )

    def handle(self, *args, **options):
        models = [
            LookupVersion._meta.label_lower,
            LookupConfiguration._meta.label_lower,
            *(
                definition.model._meta.label_lower
                for definition in LOOKUP_DEFINITIONS.values()
            ),
        ]

        output = StringIO()

        call_command(
            "dumpdata",
            *models,
            format="json",
            indent=2,
            stdout=output,
        )

        path = Path(settings.BASE_DIR) / options["output"]
        path.write_text(
            output.getvalue(),
            encoding="utf-8",
            newline="\n",
        )

        self.stdout.write(self.style.SUCCESS(f"Lookup fixture exported to {path}"))
