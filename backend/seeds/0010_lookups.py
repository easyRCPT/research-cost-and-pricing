"""
Seeds RCPT lookup table data.

Run `manage.py import_lookups` against the
excel wotkbook, then re-export with 'dumpdata'.

"""

from pathlib import Path

from django.core.management import call_command


def run():
    call_command("loaddata", str(Path(__file__).parent / "lookups.json"))
