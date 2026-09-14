"""
System check for a database that is *ahead* of the code.

Django already tells you when your database is behind: `runserver` prints
"You have N unapplied migration(s)" on boot and again on every autoreload, so a
branch switch under a running dev server surfaces that direction on its own.

The opposite direction is silent. When `django_migrations` records a migration
whose file is not in the current branch — you applied it, then switched to a
branch that predates it, or dropped it in a rebase — there is nothing left to
apply going forward, so every forward-looking check passes. The schema just has
columns the code does not know about, and that stays invisible until the
migration you left behind was the one that renamed or dropped something.

Registered as a system check rather than left to scripts/preflight.sh because
checks re-run on every autoreload. Preflight only runs when a dev server starts,
so a server already running when you switch branches would otherwise keep
serving new code against an old schema. This is an Error, not a Warning, which
means the reload halts: the server stops until the mismatch is resolved, instead
of continuing in a state whose failures show up somewhere unrelated.
"""

from django.core.checks import Error, register
from django.db import OperationalError


def _ghost_migrations():
    """Applied migrations whose files are not present in this checkout."""
    from django.apps import apps
    from django.db import connection
    from django.db.migrations.loader import MigrationLoader

    loader = MigrationLoader(connection, ignore_no_migrations=True)
    on_disk = set(loader.disk_migrations)

    # Filtered on the app registry rather than on which apps still have
    # migration files: deleting an app's only migration would otherwise remove
    # it from that set and hide the exact case this exists to catch.
    installed = {config.label for config in apps.get_app_configs()}

    # A squash legitimately leaves the migrations it replaced recorded as
    # applied with their files gone. Excluding them matters more than catching
    # every case: this check tells you to run db-reset, which destroys data.
    replaced = set()
    for migration in loader.disk_migrations.values():
        replaced.update(getattr(migration, "replaces", ()) or ())

    return sorted(
        f"{app}.{name}"
        for app, name in loader.applied_migrations
        if app in installed
        and (app, name) not in on_disk
        and (app, name) not in replaced
    )


@register()
def check_database_not_ahead_of_code(app_configs, **kwargs):
    from django.conf import settings

    # Local development only. Deployed environments roll forward and never
    # switch branches under a running process, so there the check could only
    # ever produce a false positive during a rollback — precisely when you least
    # want the process refusing to boot.
    if not settings.DEBUG:
        return []

    try:
        ghosts = _ghost_migrations()
    except OperationalError:
        # An unreachable or uninitialised database is not this check's problem;
        # every other path reports it far more clearly. Staying quiet also keeps
        # `manage.py` usable when the container simply is not up yet.
        return []

    if not ghosts:
        return []

    return [
        Error(
            "Your database has migrations this branch does not have: "
            + ", ".join(ghosts),
            hint=(
                "Your schema is ahead of the code — Django cannot undo this for you. "
                "Unless you know those migrations were purely additive, run 'make db-reset' "
                "to rebuild the database from this branch's migrations."
            ),
            id="api.E001",
        )
    ]
