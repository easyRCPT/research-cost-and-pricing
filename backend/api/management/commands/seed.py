"""
Runs the .sql and .py files in backend/seeds/, in filename order.

Keeps no record of what it has run, so seed files must be idempotent.
See backend/seeds/README.md.
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
    """seeds/ is not a package, so load by path."""
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
            # Not an error: db-reset calls this unconditionally.
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
                # Per file, so a failure can't leave a table half-filled.
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
