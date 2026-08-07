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

# 3. Database. --wait blocks until the healthcheck passes, so the migrate below
#    cannot race a server still running initdb on first boot.
if [ -z "$(docker compose ps --status running --quiet db 2>/dev/null)" ]; then
	echo "preflight: starting Postgres..."
	docker compose up -d --wait db >/dev/null
fi

# 4. Migrations, but only ever against a local database.
#
#    Auto-applying is safe on a disposable container and reckless anywhere else,
#    and nothing about starting a dev server says which one DATABASE_URL points
#    at. A .env still holding a staging or production URL is the normal way this
#    goes wrong, so the host is checked rather than assumed. Django is asked
#    rather than the file parsed, so a shell-exported override is seen too.
db_host=$(cd backend && uv run python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.conf import settings
print(settings.DATABASES['default'].get('HOST') or '')
" 2>/dev/null) || fail "could not read Django settings. Is backend/.env filled in?"

case "$db_host" in
localhost | 127.0.0.1 | ::1) ;;
*)
	echo ""
	echo "  preflight: DATABASE_URL points at '$db_host', not a local database."
	echo "  Skipping the migration check — this script only ever migrates localhost."
	echo ""
	echo "  For local development, set this in backend/.env:"
	echo "    DATABASE_URL=postgresql://rcpt:rcpt@127.0.0.1:5433/rcpt"
	echo ""
	exit 0
	;;
esac

# `migrate --check` exits non-zero when any migration is unapplied. Applied
# rather than reported: migrations only run forward, the database is disposable,
# and "you have unapplied migrations" has exactly one sensible response.
if ! (cd backend && uv run python manage.py migrate --check >/dev/null 2>&1); then
	echo "preflight: applying new migrations..."
	(cd backend && uv run python manage.py migrate)
fi
