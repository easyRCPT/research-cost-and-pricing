"""
Seeds RCPT lookup table data.

To update the lookup fixture, run:
    make fixture

This resets the database, imports lookup data from the Excel workbook,
and regenerates `lookups.json`.
"""

from pathlib import Path

from django.core.management import call_command

from api.services.lookup_definitions import LOOKUP_DEFINITIONS


def run():
    # Empty databases only. The fixture carries the version pointer and fixed
    # primary keys, so reloading it would undo every admin edit since.
    if any(
        definition.model.objects.exists() for definition in LOOKUP_DEFINITIONS.values()
    ):
        return

    call_command("loaddata", str(Path(__file__).parent / "lookups.json"))
