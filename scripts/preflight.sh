#!/bin/sh
# Makes sure the local stack is actually ready before a dev server starts, so
# the failure you get is a sentence rather than a stack trace from psycopg.
#
# Wired into `make backend` and the frontend's pnpm `predev`, so it runs on the
# ordinary path into work rather than being something you must remember.
#
# Checks, in order: Docker running, backend/.env present, database container up,
# migrations applied. Anything it can safely fix, it fixes; anything needing a
# decision, it explains.

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

# 4. Database. --wait blocks until the healthcheck passes, so the migrate below
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

# 5. The database is the local one.
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

# 6. Migrations, and the seeds that go with them.
#
#    `migrate --check` exits non-zero when any migration is unapplied. Applied
#    rather than reported: migrations only run forward, the database is
#    disposable, and "you have unapplied migrations" has exactly one sensible
#    response.
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
