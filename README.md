# EasyRCPT

Main repository for the University of Melbourne Research Costing and Pricing Tool.

- `backend/` — Django 6 + Django REST Framework API, managed with [uv](https://docs.astral.sh/uv/)
- `frontend/` — React 19 + TypeScript + Vite SPA, managed with [pnpm](https://pnpm.io/)

## Prerequisites

| Tool    | Version                                     | Install                                               |
| ------- | ------------------------------------------- | ----------------------------------------------------- |
| Python  | 3.12 (pinned in`backend/.python-version`) | `uv python install 3.12`                            |
| uv      | ≥ 0.11                                     | `curl -LsSf https://astral.sh/uv/install.sh \| sh`   |
| Node.js | ≥ 20 (22+ recommended)                     | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm    | ≥ 10                                       | `corepack enable pnpm`                              |
| Docker  | any recent version                          | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

The database runs locally in Docker — no cloud account, no connection string to obtain,
and it works offline. Only Postgres is containerised; the backend and frontend run on
your host, where reloads are fast and debuggers attach normally.

## Quick start

```bash
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
make setup     # env files, dependencies, database, migrations
```

Then set `DJANGO_SECRET_KEY` in `backend/.env` (see below) and run the two dev servers in
separate terminals:

```bash
make backend    # http://127.0.0.1:8000
make frontend   # http://localhost:5173
```

`make` on its own lists every target. The rest of this document explains what those
targets do, in case you would rather run the steps by hand.

## 1. Clone

```bash
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
```

## 2. Database

```bash
make db-up      # docker compose up -d --wait db
```

This starts Postgres 18 on `localhost:5433`, with data persisted in a Docker volume named
`rcpt_pgdata` that survives `make db-down`. To wipe it and start over, use `make db-reset`.

Postgres 18 relocated its data directory (`/var/lib/postgresql/18/docker`, with the volume
declared one level up at `/var/lib/postgresql`), so `docker-compose.yml` mounts
`/var/lib/postgresql` rather than the `/var/lib/postgresql/data` you may remember from
17 and earlier. Changing the major version means changing that mount too, and a stale
volume from a previous major will not start — run `make db-reset` after any such bump.

The port is **5433, not the usual 5432**. Plenty of machines already run a native Postgres
(Postgres.app, Homebrew, the EDB installer) on 5432, and that collision either refuses to
start the container or — worse — silently points you at the wrong server. If 5433 is also
taken, set `POSTGRES_PORT` in a `.env` file at the repo root and update `DATABASE_URL` in
`backend/.env` to match.

`make db-shell` opens `psql` inside the container, so it always reaches the right database
regardless of what else is installed on your machine.

## 3. Backend setup

```bash
cd backend
cp .env.example .env
```

`backend/.env` is pre-filled to point at the local container. The only value you must
supply is the secret key:

```dotenv
DATABASE_URL=postgresql://rcpt:rcpt@127.0.0.1:5432/rcpt
DJANGO_SECRET_KEY=<a-long-random-string>
DJANGO_DEBUG=True
```

Generate a secret key:

```bash
uv run python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

> `DJANGO_SECRET_KEY` is read with `os.environ[...]` — Django will not start if it is missing.

Install dependencies and run migrations. `uv sync` creates `backend/.venv` and installs
exactly what is locked in `uv.lock`:

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser   # optional, for /admin
uv run python manage.py runserver
```

The API is now on [http://127.0.0.1:8000](http://127.0.0.1:8000) and the Django admin on
[http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

## 4. Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

Set `frontend/.env` to point at the local backend:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

Vite serves the app on [http://localhost:5173](http://localhost:5173). That exact origin is the
default value of `CORS_ALLOWED_ORIGINS`, so if you change the dev port you must list the new
origin in `DJANGO_CORS_ALLOWED_ORIGINS` (comma-separated) in `backend/.env`.

## Everyday commands

From the repo root, `make` lists every shortcut. The common ones:

```bash
make db-up      # start Postgres
make db-reset   # wipe the database and re-migrate from scratch
make db-shell   # psql prompt inside the container
make backend    # Django dev server (runs preflight first)
make frontend   # Vite dev server
make test       # Django test suite
make preflight  # check Docker, config, database and migrations are ready
make hooks      # activate the git hooks in .githooks/
```

**Backend** (run from `backend/`):

```bash
uv run python manage.py runserver        # dev server
uv run python manage.py migrate          # apply migrations
uv run python manage.py makemigrations   # create migrations after model changes
uv run python manage.py test             # tests
uv add <package>                         # add a dependency (updates pyproject + uv.lock)
```

**Frontend** (run from `frontend/`):

```bash
pnpm dev       # dev server with HMR
pnpm build     # type-check (tsc -b) and build to dist/
pnpm preview   # serve the production build locally
pnpm lint      # eslint
```

## Environment variables

| File              | Variable                          | Purpose                                                                                                                                                 |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/.env`  | `DATABASE_URL`                  | Postgres connection string, parsed by`dj-database-url`. Required — startup fails with a pointer to this file if it is missing.                          |
| `backend/.env`  | `DJANGO_SECRET_KEY`             | Django signing key. Required — no fallback.                                                                                                              |
| `backend/.env`  | `DJANGO_DEBUG`                  | `True`/`False`. Defaults to`False` so an environment that forgets it fails closed.                                                                  |
| `backend/.env`  | `DJANGO_ALLOWED_HOSTS`          | Comma-separated hostnames. Only needed when`DJANGO_DEBUG` is`False`.                                                                                  |
| `backend/.env`  | `DJANGO_CORS_ALLOWED_ORIGINS`   | Comma-separated browser origins allowed to call the API. Defaults to`http://localhost:5173`.                                                            |
| `backend/.env`  | `DATABASE_SSL`                  | Force TLS to the database. Defaults to on unless`DJANGO_DEBUG` is`True`; the local container serves no certificate, so leave it unset locally.        |
| `frontend/.env` | `VITE_API_URL`                  | Base URL of the backend API. Only variables prefixed`VITE_` are exposed to the browser.                                                                 |

`.env` files are gitignored; only `.env.example` is committed. Never commit real
credentials.

## Preflight and git hooks

### Preflight

`scripts/preflight.sh` runs before a dev server starts — `make backend` depends on it, and
the frontend's pnpm `predev` calls it — so the ordinary path into work also guarantees the
stack is ready. It checks that Docker is running, that `backend/.env` exists, that the
database container is up (starting it if not), and that migrations are applied (applying
them if not). When everything is already fine it prints nothing.

It only ever migrates a **local** database. It asks Django for the resolved host and skips
the migration step entirely unless that host is `localhost`, `127.0.0.1` or `::1`. A `.env`
left pointing at staging or production is the normal way this would otherwise go wrong, and
"start my dev server" should never be a way to migrate a remote database.

Run it on its own with `make preflight`.

### Git hooks

The hooks live in `.githooks/` and are activated by `make setup`, or on their own with:

```bash
make hooks     # git config core.hooksPath .githooks
```

There is no husky and no root `package.json`. Hooks committed to `.githooks/` are versioned
exactly as husky's are — that is `core.hooksPath` doing the work in both cases. What husky
adds is automatic activation through its `prepare` lifecycle script, which only helps if
everyone runs an install at the repo root. Backend work here happens entirely in `backend/`
with uv, so `make setup` is the honest place for that one-line activation.

Both hooks are advisory. They print and exit 0; neither runs a migration, and neither can
fail a checkout or a merge.

| Hook | When | What it says |
| ---- | ---- | ------------ |
| `post-merge` | a pull or merge brought in migration files | run `make migrate` |
| `post-checkout` | you switched to a branch whose migrations differ | see below |

`post-checkout` matters because the two directions are not equally recoverable:

- **The branch has migrations you have not applied.** Your database is behind. `make migrate`
  fixes it, and `make backend` does that for you anyway.
- **The branch is missing migrations you have already applied.** Your database is *ahead* of
  the code, and Django will not undo that on its own. Nothing complains at first — an extra
  column is invisible until the migration you left behind renamed or dropped something, and
  then the failure surfaces somewhere unrelated. `make db-reset` is the reliable answer.

### Why not a database per branch

The obvious next step is giving each git branch its own database, the way `c3-workspace`
does with Supabase. Two things to know before reaching for it.

It would **not** need a volume or container per branch — a Postgres database is nearly free
within one server, so this is separate database *names* in the one container. Volumes would
be the expensive way to buy the same isolation.

But it earns its complexity only once you have local data worth preserving. Today
`make db-reset` takes a few seconds and destroys nothing, which covers every case above
including the ones per-branch databases do not: two branches that both add an `0005_*`
migration still need a merge migration, no matter how the databases are arranged. Worth
revisiting when there is a seed dataset that hurts to rebuild.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, in two independent jobs:

- **Backend** — brings up a Postgres 18 service container (the same major version as
  `docker-compose.yml`), installs with `uv sync --locked`, then runs a migration drift gate,
  applies migrations, and runs the test suite.
- **Frontend** — `pnpm install --frozen-lockfile`, `pnpm lint`, and `pnpm build` (which is
  `tsc -b && vite build`, so it type-checks too).

The **migration drift gate** is `manage.py makemigrations --check --dry-run`. Models are the
source and migrations are the artefact, so a model change pushed without its migration fails
here rather than at deploy time. If it fails, run `make makemigrations` and commit the result.

Two lockfile gates ride along: `uv sync --locked` fails if `uv.lock` has drifted from
`pyproject.toml`, and `--frozen-lockfile` does the same for `pnpm-lock.yaml`.

## Deployment

Nothing about the local setup ties the project to a particular host. The entire database
configuration is one `DATABASE_URL`, so any managed Postgres works — AWS RDS, Fly, Railway,
Neon, Supabase — without a code change. Deployed environments need:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DJANGO_SECRET_KEY=<a-long-random-string>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=<your-api-hostname>
DJANGO_CORS_ALLOWED_ORIGINS=<your-frontend-origin>
```

`DATABASE_SSL` needs no value there: it defaults to on whenever `DJANGO_DEBUG` is `False`.
Server-side cursors are disabled unconditionally, so the app is safe behind a
transaction-mode connection pooler, which is what most managed offerings put in front of
the database.

The CI job runs `manage.py check --deploy` as an advisory step. Most of what it flags (HSTS,
secure cookies, SSL redirect) depends on the host that has not been chosen yet — read its
output when that decision is made.
