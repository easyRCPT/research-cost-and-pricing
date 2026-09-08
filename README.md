# EasyRCPT

University of Melbourne Research Costing and Pricing Tool.

- `backend/` — Django 6 + Django REST Framework API, managed with [uv](https://docs.astral.sh/uv/)
- `frontend/` — React 19 + TypeScript + Vite SPA, managed with [pnpm](https://pnpm.io/)

## Prerequisites

| Tool    | Version                                    | Install                                                           |
| ------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Python  | 3.12 (pinned in `backend/.python-version`) | `uv python install 3.12`                                          |
| uv      | >= 0.11                                    | `curl -LsSf https://astral.sh/uv/install.sh \| sh`                |
| Node.js | >= 20 (22+ recommended)                    | [nodejs.org](https://nodejs.org) or `nvm install 22`              |
| pnpm    | >= 10                                      | `corepack enable pnpm`                                            |
| Docker  | any recent version                         | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| flock   | any                                        | `brew install flock` (macOS); ships with util-linux on Linux      |

## Quick start

```
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
make setup      # env files, dependencies, hooks, database, migrations, seeds
make backend    # http://127.0.0.1:8000  (Django admin at /admin/)
make frontend   # http://localhost:5173, in a second terminal
```

`make setup` writes both `.env` files and generates `DJANGO_SECRET_KEY`, so nothing needs
editing by hand. Postgres is on **5433, not 5432**, so it cannot collide with a native
install.

## Commands

```
make db-up / db-down / db-down-v   start, stop, stop and delete the volume
make db-reset / db-shell           rebuild this branch's database; psql in the container
make db-list / db-prune            list every branch's database; delete the orphaned ones
make migrate / makemigrations      apply migrations; write them after a model change
make seed / seed-list              load reference data; show what would run
make backend / frontend            dev servers (backend runs preflight first)
make test / gen-api                Django test suite; regenerate frontend/src/types/api.d.ts
```

`make` on its own lists every target. Or go direct: `manage.py <command>` and `uv add` in
`backend/`, `pnpm dev|build|preview|lint` in `frontend/`.

## Environment variables

| File            | Variable            | Purpose                                                                         |
| --------------- | ------------------- | -------------------------------------------------------------------------------- |
| `backend/.env`  | `DATABASE_URL`      | Postgres connection string, parsed by `dj-database-url`. Required.                |
| `backend/.env`  | `DJANGO_SECRET_KEY` | Django signing key. Required, no fallback.                                        |
| `backend/.env`  | `DJANGO_DEBUG`      | Defaults to `False`, so an environment that forgets it fails closed.              |
| `frontend/.env` | `VITE_API_URL`      | Base URL of the backend API. Only `VITE_`-prefixed variables reach the browser.   |

Both `.env.example` files document the rest, including the three that only matter once
`DJANGO_DEBUG` is `False` — see [Deployment](#deployment). Only `.env.example` is committed.

## Migrations

Edit `backend/api/models.py`, then `make makemigrations`, `make migrate`, and commit the
generated file: migrations are source code, and CI's [drift gate](#continuous-integration)
fails a model change pushed without one. Each branch has its own database (see below), so
preflight applies whatever the branch added. Rewrite or drop a migration you already applied
and preflight refuses to start; `make db-reset` is the fix.

## Seeds

Lookup tables live in `backend/seeds/` and load with `make seed` — see
`backend/seeds/README.md`. Files run in filename order (leave gaps: `0010_`, `0020_`), `.sql`
and `.py` both work, and **every seed must be idempotent**, because `make seed` keeps no
ledger and re-runs everything. Preflight seeds a database it has just migrated.

## Preflight

`scripts/preflight.sh` runs before a dev server starts, from `make backend` and the
frontend's `pnpm predev`. When everything is fine it prints nothing. It checks:

1. Docker is running.
2. `backend/.env` exists.
3. This branch's database is allocated (see below).
4. No other preflight is working on this database, waiting if one is.
5. The database container is up, starting it if not.
6. `DATABASE_URL` is local, refusing to start if not.
7. The database is not *ahead* of the branch, refusing to start if it is.
8. Migrations are applied, applying them if not.

Step 4 is a `flock` on the Compose project, so `make backend` and `pnpm dev` started
together queue instead of racing two `migrate` runs into one empty database. Step 7 stops
the server rather than fixing it: the only fix is `make db-reset`, which destroys data.

## Git hooks

Activated by `make setup`, or `make hooks` alone. `post-checkout` repoints the checkout at
the new branch's database; `post-merge` says so when a merge brought in migrations. Neither
runs a migration, and both always exit 0.

## A database per branch

Each branch gets its own container, volume and port, so the branch you left keeps its data
and two worktrees run at once. `scripts/branch-env.sh` derives the Compose project and port
from the branch name and writes them to the root `.env` and `DATABASE_URL`; ports come from
the machine-wide `~/.config/rcpt/db-ports`, and `main` keeps the stock `rcpt` on 5433.
Budget 30–50 MB each, and `make db-prune` deletes the ones whose branch is gone.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`: **backend** (Postgres
18 service container, `uv sync --locked`, drift gates, `migrate`, tests), **backend lint**
(`ruff check`, `ruff format --check`, `pyright`) and **frontend** (`pnpm lint`, `pnpm
build`). The two drift gates say the same thing — the source is committed, so the artefact
must be too. Fix them with `make makemigrations` and `make gen-api`.

## Deployment

One `DATABASE_URL` is the whole database configuration, so any managed Postgres works
without a code change. Server-side cursors are disabled, so a transaction-mode pooler is
safe. Deployed environments need:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DJANGO_SECRET_KEY=<a-long-random-string>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=<your-api-hostname>
DJANGO_CORS_ALLOWED_ORIGINS=<your-frontend-origin>
```

## Code style

Ruff and Pyright gate every pull request. Run them with `uv run --with ruff ruff check .`,
`ruff format .` and `uv run --with pyright pyright .`, and annotate new functions and
attributes — parameters and return types both.
