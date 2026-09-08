# EasyRCPT

Main repository for the University of Melbourne Research Costing and Pricing Tool.

- `backend/` — Django 6 + Django REST Framework API, managed with [uv](https://docs.astral.sh/uv/)
- `frontend/` — React 19 + TypeScript + Vite SPA, managed with [pnpm](https://pnpm.io/)

Only Postgres is containerised; the backend and frontend run on your host. No cloud account
to set up, and it all works offline.

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

`make setup` copies both `.env.example` files and generates `DJANGO_SECRET_KEY`, so a fresh
clone needs no hand editing, and `make` on its own lists every target. Postgres listens on
**5433, not 5432**, so it cannot collide with a native install; if 5433 is taken too, set
`POSTGRES_PORT` in a root `.env` and match it in `DATABASE_URL`. Change Vite's port and its
new origin has to go in `DJANGO_CORS_ALLOWED_ORIGINS`.

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

Or directly: `manage.py <command>` and `uv add` in `backend/`, `pnpm dev|build|preview|lint`
in `frontend/`.

## Environment variables

| File            | Variable            | Purpose                                                          |
| --------------- | ------------------- | ---------------------------------------------------------------- |
| `backend/.env`  | `DATABASE_URL`      | Postgres connection string, parsed by `dj-database-url`. Required. |
| `backend/.env`  | `DJANGO_SECRET_KEY` | Django signing key. Required, no fallback.                        |
| `backend/.env`  | `DJANGO_DEBUG`      | Defaults to `False`, so an environment that forgets it fails closed. |
| `frontend/.env` | `VITE_API_URL`      | Base URL of the backend API. Only `VITE_`-prefixed variables reach the browser. |

Both `.env.example` files document every variable, including the three that only matter once
`DJANGO_DEBUG` is `False` — see [Deployment](#deployment). `.env` files are gitignored; only
`.env.example` is committed. Never commit real credentials.

## Migrations

Django writes migrations into `backend/api/migrations/`; you never write or edit one by
hand. Edit `backend/api/models.py`, then `make makemigrations`, `make migrate`, and commit
the generated file — **migrations are committed exactly like source code**, and CI's
[migration drift gate](#continuous-integration) fails the build if a model changed without
its migration alongside. Each branch has its own database holding exactly its own migrations
(see [A database per branch](#a-database-per-branch)), so what is left is:

| Situation                                         | Symptom                                      | Fix                              |
| ------------------------------------------------- | -------------------------------------------- | -------------------------------- |
| Someone added migrations to this branch           | preflight applies them; `make backend` works | nothing                          |
| You rewrote or dropped a migration on this branch | preflight refuses to start, naming it        | `make db-reset`                  |
| Two branches both added an `0005_*`               | `--merge` prompt, or CI drift gate fails     | `makemigrations --merge`, commit |

## Seeds

Lookup tables — funding bodies, salary scales, indexation rates — live in `backend/seeds/`
and load with `make seed`. `backend/seeds/README.md` has the full rules; the short version:
files run in filename order (leave gaps: `0010_`, `0020_`), `.sql` and `.py` both work, each
runs in its own transaction, and **every seed must be idempotent** — `make seed` keeps no
ledger and re-runs everything, so write `on conflict do update` or `update_or_create`, never
a bare insert. Seeds are reference data the app needs, not sample data; test scaffolding
belongs in `fixtures/`. Preflight seeds after applying migrations, which covers the case
that matters: a branch database created moments ago.

## Preflight and git hooks

`scripts/preflight.sh` runs before a dev server starts — `make backend` depends on it and
the frontend's `pnpm predev` calls it. When everything is fine it prints nothing. It checks:

1. Docker is running.
2. `backend/.env` exists.
3. This branch's database is allocated (see below).
4. No other preflight is working on this database, waiting if one is.
5. The database container is up, starting it if not.
6. `DATABASE_URL` is local, refusing to start if not.
7. The database is not *ahead* of the branch, refusing to start if it is.
8. Migrations are applied, applying them if not.

Step 4 is why `make backend` and `pnpm dev` can be started at the same moment: without a
lock both read an empty database and start `migrate`, and the loser dies part way through
`0001_initial` on a table the winner has already created. `flock` holds the lock for as long
as the command it wraps, so the script re-runs itself under it, keyed on the Compose project
so that only runs sharing a database queue.

Steps 7 and 8 are the two directions a database can disagree with the code, treated
oppositely on purpose. Behind (unapplied migrations) is applied for you — migrations run
forward and a local database is disposable. Ahead (`django_migrations` has rows whose files
are not in this branch) stops the server, because the only fix is `make db-reset`, which
destroys data. Ahead is also the case nothing else catches: `migrate --check` is silent, and
the extra column stays invisible until the migration you left behind turns out to be the one
that renamed something.

Step 6 allows no host but `localhost`, `127.0.0.1` or `::1`: a non-local one is a stale
`backend/.env`, not a decision. To use one deliberately, bypass preflight with `cd backend &&
uv run python manage.py runserver`.

### Git hooks

Hooks live in `.githooks/`, activated by `make setup` or `make hooks`. No husky, no root
`package.json`.

`post-checkout` repoints this checkout at the new branch's database by rewriting two `.env`
files; `post-merge` says so when a pull or merge brought in new migrations. Both exit 0
always and neither runs a migration: the behind case is preflight's job at the moment the
database is needed, and the ahead case is only fixed by `make db-reset`, which a checkout
must never do on its own.

**With a server already running** preflight cannot help, since it only runs at startup.
Django warns `You have N unapplied migration(s)` and keeps serving; `backend/api/checks.py`
fails with `api.E001` and stops the server when the database is ahead. Both re-run on each
autoreload, so a branch switch fires them.

## A database per branch

Each branch gets its own container, volume and port, so switching branches switches
databases and the branch you left keeps its data; two worktrees on two branches run at once.
This matters because of seeds: once a real lookup table is in `backend/seeds/`, rebuilding
it on every switch is not free.

`scripts/branch-env.sh` derives a Compose project name and port from the current branch
(`rcpt-spike-rates-1c73c1` on 5435, say), writes them to the gitignored root `.env`, and
rewrites `DATABASE_URL` in `backend/.env`. It runs from `.githooks/post-checkout` and from
preflight, and announces the move when it happens.

`main` and `master` keep the stock project (`rcpt`) and port (5433). Other ports are
allocated sequentially and recorded in `~/.config/rcpt/db-ports` — machine-wide, not
per-checkout, so a second clone of one branch cannot allocate a second port for what Docker
sees as one container. The project name carries a short hash of the raw branch name, so
`feat/x` and `feat-x` cannot share a database. Detached HEAD is left alone.

Databases outlive their branches, so `make db-list` flags the strays and `make db-prune`
deletes them and frees their ports, asking first. Budget 30–50 MB of memory each.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`, in three jobs:
**Backend (migrations, tests)** — Postgres 18 service container, `uv sync --locked`, the two
drift gates below, `migrate`, the test suite, `check --deploy` as advisory; **Backend (lint,
type-check)** — `ruff check`, `ruff format --check`, `pyright`; **Frontend** —
`pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`.

Both drift gates say the same thing: the source is committed, so the artefact must be too.
`makemigrations --check --dry-run` fails a model change pushed without its migration (fix
with `make makemigrations`), and the API type gate regenerates `frontend/src/types/api.d.ts`
from the serializers and fails if the committed file differs (fix with `make gen-api`;
`schema.yml` is an intermediate and gitignored). `uv sync --locked` and `--frozen-lockfile`
are the same principle for lockfiles.

## Deployment

Nothing ties the project to a host: the whole database configuration is one `DATABASE_URL`,
so any managed Postgres works without a code change. Deployed environments need:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DJANGO_SECRET_KEY=<a-long-random-string>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=<your-api-hostname>
DJANGO_CORS_ALLOWED_ORIGINS=<your-frontend-origin>
```

`DATABASE_SSL` needs no value; it is on whenever `DJANGO_DEBUG` is `False`. Server-side
cursors are disabled unconditionally, so the app is safe behind a transaction-mode pooler.

## Code style

Python is linted with Ruff (PEP 8, unused imports, isort ordering, common bug patterns;
`RUF012` is ignored for Django `Meta` and migration declarations) and type-checked with
Pyright, the engine behind Pylance — both gate every pull request. Run them locally with
`uv run --with ruff ruff check .`, `ruff format .`, `uv run --with pyright pyright .`, and
annotate new functions and attributes, parameters and return types both.
