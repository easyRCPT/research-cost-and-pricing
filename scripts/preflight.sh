#!/bin/sh
# Makes sure the local stack is actually ready before a dev server starts, so
# the failure you get is a sentence rather than a stack trace from psycopg.
#
# Wired into `make backend` and the frontend's pnpm `predev`, so it runs on the
# ordinary path into work rather than being something you must remember.
#
# Checks, in order: Docker running, backend/.env present, database container up,
# migrations applied. Anything it can safely fix, it fixes; anything needing a
# decision, it explains. Runs under a per-database lock, so two of these
# starting at once queue rather than collide.

set -e

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo_root"

fail() {
	echo ""
	echo "  preflight: $1"
	echo ""
	exit 1
}

# 1. Docker. Every later step reports this as something more confusing.
if ! docker info >/dev/null 2>&1; then
	fail "Docker is not running. Start Docker Desktop and try again."
fi

# 2. Config. Without this the database URL falls back to nothing and Django
#    raises ImproperlyConfigured, which reads like a code bug rather than a
#    missing file.
if [ ! -f backend/.env ]; then
	fail "backend/.env is missing. Run 'make setup' first."
fi

# 3. Point at this branch's database. Writes only, no Docker. Placed before the
#    database starts, because it decides which database that is.
sh scripts/branch-env.sh

# 4. One preflight at a time per database.
#
#    `make backend` and the frontend's predev both run this script, so starting
#    both at once puts two `migrate` runs on one database. Both see it as empty,
#    both begin applying 0001_initial, and the loser dies on a table the winner
#    has already created — a stack trace about a schema that is in fact fine.
#
#    Keyed on the Compose project, so it serialises only the runs that share a
#    database and another branch's preflight is unaffected. It goes after
#    branch-env.sh because that is what decides which database this is.
#
#    Re-runs the script under the lock rather than wrapping the steps below:
#    flock holds the lock for exactly as long as the command it is given, and
#    that command is the rest of this file.
if [ -z "${PREFLIGHT_LOCKED:-}" ]; then
	if ! command -v flock >/dev/null 2>&1; then
		fail "flock is missing. macOS: 'brew install flock'. Linux: it ships with util-linux."
	fi

	project=$(sed -n 's/^COMPOSE_PROJECT_NAME=//p' .env 2>/dev/null | tail -n 1)
	[ -n "$project" ] || project=rcpt

	lock_dir="${XDG_CONFIG_HOME:-$HOME/.config}/rcpt/locks"
	mkdir -p "$lock_dir"

	# Waiting, not failing: the normal case is `make backend` and `pnpm dev`
	# seconds apart, where the second one wants the first one's result. Five
	# minutes is far past a cold migrate and seed, so reaching the timeout means
	# something is stuck rather than slow, and -E tells the two apart.
	export PREFLIGHT_LOCKED=1
	status=0
	flock -w 300 -E 75 "$lock_dir/$project.lock" sh "$repo_root/scripts/preflight.sh" || status=$?
	if [ "$status" -eq 75 ]; then
		fail "another preflight has held '$project' for 5 minutes. Look for a stuck 'make backend' or 'pnpm dev'."
	fi
	exit "$status"
fi

# 5. Database. --wait blocks until the healthcheck passes, so the migrate below
#    cannot race a server still running initdb on first boot.
#
#    Run unconditionally rather than only when nothing is running. `up` is
#    declarative: it is a fast no-op when the container already matches the
#    compose file, and it recreates the container when it does not. Guarding it
#    with "is something running?" asks the wrong question — a container can be
#    running and still be wrong, most obviously when this branch's port has
#    changed since it started, which then surfaces as a connection refused on a
#    port nothing is listening to.
if ! docker compose up -d --wait db >/dev/null 2>&1; then
	echo "preflight: starting Postgres..."
	docker compose up -d --wait db
fi

# 6. The database is the local one.
#
#    Auto-applying migrations is safe on a disposable container and reckless
#    anywhere else, and nothing about starting a dev server says which one
#    DATABASE_URL points at. A .env still holding a leftover cloud URL is the
#    normal way this goes wrong, so the host is checked rather than assumed.
#    Django is asked rather than the file parsed, so a shell-exported override
#    is seen too.
db_host=$(cd backend && uv run python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.conf import settings
print(settings.DATABASES['default'].get('HOST') or '')
" 2>/dev/null) || fail "could not read Django settings. Is backend/.env filled in?"

#    Stopping rather than warning: this project has no remote database, so a
#    non-local host is a stale .env, not a choice. A warning printed above a
#    dev server that starts anyway is a warning nobody reads — and the failure
#    it precedes is writing development data to somebody's real database.
case "$db_host" in
localhost | 127.0.0.1 | ::1) ;;
*)
	echo ""
	echo "  preflight: DATABASE_URL points at '$db_host', not a local database."
	echo "  Refusing to start — local development never runs against a remote database."
	echo ""
	echo "  Set this in backend/.env:"
	echo "    DATABASE_URL=postgresql://rcpt:rcpt@127.0.0.1:5433/rcpt"
	echo ""
	echo "  If you really did mean to connect to a remote database, skip this check"
	echo "  by running the server directly:"
	echo "    cd backend && uv run python manage.py runserver"
	echo ""
	exit 1
	;;
esac

# 7. The database is not *ahead* of the code.
#
#    The opposite of an unapplied migration, and the one nothing else notices.
#    django_migrations records a migration whose file is not in this branch —
#    you applied it, then moved to a branch that predates it, or dropped it in a
#    rebase. `migrate --check` is silent here, because there is nothing left to
#    apply going forward. The schema simply has columns the code does not know
#    about, which stays invisible until the missing migration was the one that
#    renamed or dropped something, and then it fails somewhere unrelated.
#
#    Reported, never fixed: the only reliable fix is `db-reset`, which destroys
#    the database. That is a decision, not a step, so it is asked for by name.
#    backend/api/checks.py duplicates this, deliberately. This one catches it
#    before the server starts, so the message arrives on its own rather than
#    inside a wall of Django output; the system check catches it on every
#    autoreload, which is the case this cannot see — a server already running
#    when you switched branches.
ghosts=$(cd backend && uv run python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.apps import apps
from django.db import connection
from django.db.migrations.loader import MigrationLoader
try:
    loader = MigrationLoader(connection, ignore_no_migrations=True)
except Exception:
    raise SystemExit(0)

on_disk = set(loader.disk_migrations)

# Filtered on the app registry, not on which apps still have migration files:
# deleting an app's only migration would otherwise remove it from that set and
# hide the very case this check exists for.
installed = {config.label for config in apps.get_app_configs()}

# A squash records the migrations it replaced as applied while their files are
# legitimately gone. Excluding them matters more than the check firing: a false
# positive here tells you to run db-reset, which destroys the database.
replaced = set()
for migration in loader.disk_migrations.values():
    replaced.update(getattr(migration, 'replaces', ()) or ())

for app, name in sorted(loader.applied_migrations):
    if app in installed and (app, name) not in on_disk and (app, name) not in replaced:
        print(f'{app}.{name}')
" 2>/dev/null) || ghosts=""

if [ -n "$ghosts" ]; then
	echo ""
	echo "  preflight: your database has migrations this branch does not have:"
	echo "$ghosts" | sed 's/^/    /'
	echo ""
	echo "  Your schema is ahead of the code. Django cannot undo this for you, and"
	echo "  the mismatch will surface later as an unrelated-looking error."
	echo ""
	echo "  Unless you know those migrations were purely additive, reset:"
	echo "    make db-reset"
	echo ""
	exit 1
fi

# 8. Migrations, and the seeds that go with them.
#
#    `migrate --check` exits non-zero when any migration is unapplied. Applied
#    rather than reported: migrations only run forward, the database is
#    disposable, and "you have unapplied migrations" has exactly one sensible
#    response. Safe to do automatically precisely because the destructive
#    direction was ruled out above.
#
#    Seeding is tied to that rather than run every time. A brand-new branch gets
#    an empty database, and an empty database with no reference data in it is not
#    usable — but re-running every seed on each dev-server start would put the
#    cost of the largest lookup table on the most common action. Seeds are
#    idempotent, so this is an optimisation, not a correctness boundary: run
#    `make seed` by hand any time.
if ! (cd backend && uv run python manage.py migrate --check >/dev/null 2>&1); then
	echo "preflight: applying new migrations..."
	(cd backend && uv run python manage.py migrate)
	echo "preflight: loading seed data..."
	(cd backend && uv run python manage.py seed)
fi
