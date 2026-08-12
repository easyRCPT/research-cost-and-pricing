"""
Loads reference data from backend/seeds/ into the database.

Lookup tables — funding schemes, salary scales, indexation rates — are data
rather than schema, but they are not *sample* data either: the application is
wrong without them, and they have to exist in every environment. That rules out
Django fixtures, which are aimed at test scaffolding, and it rules out doing it
by hand.

Two file types, both run in filename order:

    backend/seeds/0010_funding_bodies.sql   raw SQL, for bulk reference data
    backend/seeds/0020_salary_scales.py     Python, when it needs logic

Numbered prefixes because order is the only way to express a foreign key: a
table must be seeded after whatever it points at. The numbers leave gaps on
purpose so a later file can be slotted between two existing ones.

**Every seed file must be idempotent.** This command is not a migration and
keeps no record of what it has run — it is re-run in full on every `make
db-reset`, on every environment, as often as anyone likes. Write upserts
(`INSERT ... ON CONFLICT DO UPDATE`, or `update_or_create`), never bare inserts.
The contract is deliberately "safe to run twice" rather than "runs once",
because the alternative is a second migration-like ledger to keep in step with
the real one.

Each file runs in its own transaction, so a failure rolls that file back rather
than leaving the table half-populated.
"""

import importlib.util
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

SEED_DIR_NAME = "seeds"
SUFFIXES = (".sql", ".py")


def seed_dir() -> Path:
    return Path(settings.BASE_DIR) / SEED_DIR_NAME


def discover():
    """Every seed file, in the order it should run."""
    directory = seed_dir()
    if not directory.is_dir():
        return []
    return sorted(
        (path for path in directory.iterdir() if path.suffix in SUFFIXES and not path.name.startswith("_")),
        key=lambda path: path.name,
    )


def run_sql(path: Path):
    sql = path.read_text()
    if not sql.strip():
        return
    with connection.cursor() as cursor:
        cursor.execute(sql)


def run_python(path: Path):
    """Import the file and call its run() — no package, so load it by path."""
    spec = importlib.util.spec_from_file_location(f"seeds.{path.stem}", path)
    if spec is None or spec.loader is None:
        raise CommandError(f"could not load {path.name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "run"):
        raise CommandError(f"{path.name} defines no run() function")
    module.run()


class Command(BaseCommand):
    help = "Load reference data from backend/seeds/ (idempotent; safe to re-run)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--list",
            action="store_true",
            help="Show which seed files would run, without running them.",
        )
        parser.add_argument(
            "--only",
            metavar="NAME",
            help="Run just the seed files whose filename contains NAME.",
        )

    def handle(self, *args, **options):
        paths = discover()

        if options["only"]:
            paths = [path for path in paths if options["only"] in path.name]
            if not paths:
                raise CommandError(f"no seed file matching '{options['only']}'")

        if not paths:
            # Not an error. A fresh checkout has no seeds yet, and `make
            # db-reset` calls this unconditionally — failing here would make an
            # empty seeds/ directory look like a broken setup.
            self.stdout.write("No seed files in backend/seeds/ — nothing to do.")
            return

        if options["list"]:
            self.stdout.write(f"{len(paths)} seed file(s) in run order:")
            for path in paths:
                self.stdout.write(f"  {path.name}")
            return

        for path in paths:
            self.stdout.write(f"  {path.name} ... ", ending="")
            self.stdout.flush()
            try:
                # Per file, so one bad seed cannot leave a table half-filled
                # while the files after it carry on against a broken state.
                with transaction.atomic():
                    if path.suffix == ".sql":
                        run_sql(path)
                    else:
                        run_python(path)
            except Exception as exc:
                self.stdout.write(self.style.ERROR("failed"))
                raise CommandError(f"{path.name}: {exc}") from exc
            self.stdout.write(self.style.SUCCESS("ok"))

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(paths)} file(s)."))
