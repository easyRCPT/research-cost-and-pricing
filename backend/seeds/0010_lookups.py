"""
Seeds RCPT lookup table data.

Run `manage.py import_lookups` against the
excel wotkbook, then re-export with 'dumpdata'.

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
