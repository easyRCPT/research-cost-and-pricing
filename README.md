# EasyRCPT

Main repository for the University of Melbourne Research Costing and Pricing Tool.

- `backend/` - Django 6 + Django REST Framework API, managed with [uv](https://docs.astral.sh/uv/)
- `frontend/` - React 19 + TypeScript + Vite SPA, managed with [pnpm](https://pnpm.io/)

## Prerequisites

| Tool    | Version                                     | Install                                               |
| ------- | ------------------------------------------- | ----------------------------------------------------- |
| Python  | 3.12 (pinned in `backend/.python-version`)  | `uv python install 3.12`                            |
| uv      | >= 0.11                                     | `curl -LsSf https://astral.sh/uv/install.sh \| sh`  |
| Node.js | >= 20 (22+ recommended)                     | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| pnpm    | >= 10                                       | `corepack enable pnpm`                              |
| Docker  | any recent version                          | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |

The database runs locally in Docker. There is no cloud account to set up, no connection
string to obtain, and everything works offline. Only Postgres is containerised; the
backend and frontend run on your host, so reloads stay fast and debuggers attach normally.

## Quick start

```
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
make setup     # env files, dependencies, hooks, database, migrations, seeds
```

Then set `DJANGO_SECRET_KEY` in `backend/.env` (see below) and run the two dev servers in
separate terminals:

```
make backend    # http://127.0.0.1:8000
make frontend   # http://localhost:5173
```

Running `make` on its own lists every target. The rest of this document explains what
those targets do, in case you would rather run the steps by hand.

## 1. Clone

```
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
```

## 2. Database

```
make db-up      # docker compose up -d --wait db
```

This starts Postgres 18 for the current branch. On `main` the project is `rcpt` on
`localhost:5433`, with data in a Docker volume named `rcpt_pgdata` that survives
`make db-down`. Every other branch gets its own project, volume, and port, as described
under [A database per branch](#a-database-per-branch). To wipe the current one and start
over, run `make db-reset`.

Postgres 18 relocated its data directory. It now lives at `/var/lib/postgresql/18/docker`,
with the volume declared one level up at `/var/lib/postgresql`, so `docker-compose.yml`
mounts `/var/lib/postgresql` rather than the `/var/lib/postgresql/data` you may remember
from 17 and earlier. Changing the major version means changing that mount too, and a stale
volume from a previous major will not start. Run `make db-reset` after any such bump.

The port is **5433, not the usual 5432**. Many machines already run a native Postgres
(Postgres.app, Homebrew, the EDB installer) on 5432, and that collision either refuses to
start the container or, worse, silently points you at the wrong server. If 5433 is also
taken, set `POSTGRES_PORT` in a `.env` file at the repo root and update `DATABASE_URL` in
`backend/.env` to match.

`make db-shell` opens `psql` inside the container, so it always reaches the right database
regardless of what else is installed on your machine.

## 3. Backend setup

```
cd backend
cp .env.example .env
```

`backend/.env` is pre-filled to point at the local container. The only value you must
supply is the secret key:

```
DATABASE_URL=postgresql://rcpt:rcpt@127.0.0.1:5433/rcpt   # already set for you
DJANGO_SECRET_KEY=<a-long-random-string>        # you must fill this in
DJANGO_DEBUG=True
```

Generate a secret key:

```
uv run python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

`DJANGO_SECRET_KEY` is read with `os.environ[...]`, so Django will not start if it is
missing.

Install dependencies and run migrations. `uv sync` creates `backend/.venv` and installs
exactly what is locked in `uv.lock`:

```
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser   # optional, for /admin
uv run python manage.py runserver
```

The API is now on [http://127.0.0.1:8000](http://127.0.0.1:8000) and the Django admin on
[http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

## 4. Frontend setup

In a second terminal:

```
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

`frontend/.env.example` is already pointed at the local backend, so the copy needs no edit:

```
VITE_API_URL=http://127.0.0.1:8000
```

Vite serves the app on [http://localhost:5173](http://localhost:5173). That exact origin is
the default value of `CORS_ALLOWED_ORIGINS`, so if you change the dev port you must list the
new origin in `DJANGO_CORS_ALLOWED_ORIGINS` (comma-separated) in `backend/.env`.

## Everyday commands

From the repo root, `make` lists every shortcut. The common ones:

```
make db-up         # start this branch's Postgres
make db-down       # stop it, keeping the data
make db-down-v     # stop it and delete its volume
make db-reset      # wipe, re-migrate and re-seed from scratch
make db-shell      # psql prompt inside the container
make db-list       # every branch's database, and any whose branch is gone
make db-prune      # delete databases for branches that no longer exist
make seed          # load reference data from backend/seeds/
make backend       # Django dev server (runs preflight first)
make frontend      # Vite dev server
make test          # Django test suite
make preflight     # check Docker, config, database, migrations and seeds are ready
make hooks         # activate the git hooks in .githooks/
make secretkey     # generate DJANGO_SECRET_KEY if backend/.env still has the placeholder
```

**Backend** (run from `backend/`):

```
uv run python manage.py runserver        # dev server
uv run python manage.py migrate          # apply migrations
uv run python manage.py makemigrations   # create migrations after model changes
uv run python manage.py test             # tests
uv add <package>                         # add a dependency (updates pyproject + uv.lock)
```

**Frontend** (run from `frontend/`):

```
pnpm dev       # dev server with HMR
pnpm build     # type-check (tsc -b) and build to dist/
pnpm preview   # serve the production build locally
pnpm lint      # eslint
```

## Migrations

Migrations live in `backend/<app>/migrations/`. Today that is only
`backend/api/migrations/`, which holds an empty `__init__.py` and nothing else, because
`api/models.py` has no models yet. Django creates these files; you never write one by hand
and never edit one after it has been committed.

The loop is:

```
# 1. edit backend/api/models.py
make makemigrations   # Django writes backend/api/migrations/0001_….py
make migrate          # applies it to your local database
git add backend/api/migrations/ && git commit
```

**Migration files are committed, exactly like source code.** That is what makes them
versioned per branch. Checking out a branch checks out its migrations, and CI's
[migration drift gate](#continuous-integration) fails the build if a model changed without
its migration alongside. A migration that only exists on your machine is a deploy that
breaks on someone else's.

The database is also versioned per branch. See [A database per branch](#a-database-per-branch).
Each branch has its own database holding exactly its own migrations, so the classic problem
of switching branches and finding a schema from somewhere else mostly does not arise.

What is left:

| Situation | Symptom | Fix |
| --------- | ------- | --- |
| Someone added migrations to this branch since you last worked on it | preflight applies them; `make backend` just works | nothing |
| You rewrote or dropped a migration on the branch you are on | preflight refuses to start, naming the migration | `make db-reset` |
| Two branches both added an `0005_*` migration | `makemigrations --merge` prompt, or CI drift gate fails after the merge | `cd backend && uv run python manage.py makemigrations --merge`, commit the result |

`make db-reset` destroys this branch's database, recreates it, re-applies every migration,
and re-seeds. Other branches are untouched.

## Seeds

Lookup tables such as funding bodies, salary scales, and indexation rates live in
`backend/seeds/` and are loaded with `make seed`. `backend/seeds/README.md` has the full
rules; the short version:

```
make seed        # load everything (idempotent)
make seed-list   # show what would run, in order
make db-reset    # wipe, migrate, then seed
```

Files run in filename order, so leave gaps in the numbers (0010_, 0020_). Order is the only
way to say that one table must be seeded after the one its foreign key points at. Both
`.sql` and `.py` are supported; a `.py` seed defines a `run()` function and is for data
that needs logic. Each file runs in its own transaction.

Every seed must be idempotent. `make seed` keeps no record of what it has run and re-runs
everything each time, so write `insert ... on conflict do update` or `update_or_create`,
never a bare insert. The contract is that a seed is safe to run twice, which avoids
maintaining a second migration-like ledger alongside the real one.

Seeds are reference data the application needs to run, not sample data. Test scaffolding
belongs in an app's `fixtures/` directory instead.

Preflight seeds automatically whenever it has just applied migrations, which covers the
case that matters: a branch whose database was created moments ago and is otherwise empty.
It does not re-seed on every dev-server start, because the cost of the largest lookup
table should not land on the most common action. Run `make seed` by hand any time; it is
idempotent.

## Environment variables

| File              | Variable                          | Purpose                                                                                                                                                 |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/.env`    | `DATABASE_URL`                    | Postgres connection string, parsed by `dj-database-url`. Required. Startup fails with a pointer to this file if it is missing.                          |
| `backend/.env`    | `DJANGO_SECRET_KEY`               | Django signing key. Required, with no fallback.                                                                                                          |
| `backend/.env`    | `DJANGO_DEBUG`                    | True/False. Defaults to `False` so an environment that forgets it fails closed.                                                                          |
| `backend/.env`    | `DJANGO_ALLOWED_HOSTS`            | Comma-separated hostnames. Only needed when `DJANGO_DEBUG` is `False`.                                                                                   |
| `backend/.env`    | `DJANGO_CORS_ALLOWED_ORIGINS`     | Comma-separated browser origins allowed to call the API. Defaults to `http://localhost:5173`.                                                            |
| `backend/.env`    | `DATABASE_SSL`                    | Force TLS to the database. Defaults to on unless `DJANGO_DEBUG` is `True`. The local container serves no certificate, so leave it unset locally.          |
| `frontend/.env`   | `VITE_API_URL`                    | Base URL of the backend API. Only variables prefixed `VITE_` are exposed to the browser.                                                                 |

`.env` files are gitignored; only `.env.example` is committed. Never commit real
credentials.

## Preflight and git hooks

### Preflight

`scripts/preflight.sh` runs before a dev server starts. `make backend` depends on it, and
the frontend's `pnpm predev` calls it, so the ordinary path into the project also
guarantees the stack is ready. When everything is already fine it prints nothing. It
checks, in order:

1. Docker is running.
2. `backend/.env` exists.
3. This worktree has its own database allocated (a no-op in the primary checkout).
4. The database container is up, starting it if not.
5. `DATABASE_URL` is local, refusing to start if not.
6. The database is not *ahead* of the branch, refusing to start if it is.
7. Migrations are applied, applying them if not.

Steps 6 and 7 are the two directions a database can disagree with the code, and they get
opposite treatment on purpose.

- Behind (unapplied migrations): applied for you. Migrations only run forward and the local
  database is disposable, so there is one sensible response and no reason to ask.
- Ahead (the `django_migrations` table has rows whose files are not in this branch):
  reported, and the dev server does not start. The only reliable fix is `make db-reset`,
  which destroys the database. That is a deliberate action, not a routine step.

The ahead check is the one nothing else catches. `migrate --check` is silent about it,
because going forward there is nothing left to apply; the schema simply has columns the
code does not know about. It stays invisible until the migration you left behind was the
one that renamed or dropped something, at which point it fails somewhere unrelated.

Preflight only ever touches a local database. It asks Django for the resolved host, and if
that host is not `localhost`, `127.0.0.1`, or `::1` it stops with a non-zero exit rather
than warning and continuing, so `make backend` will not start. This project has no remote
database, so a non-local host means a stale `backend/.env`, not a decision. Starting a dev
server should never be a way to write to somebody else's database. If you genuinely do want
to connect to a remote one, bypass preflight by running the server directly:
`cd backend && uv run python manage.py runserver`.

Run it on its own with `make preflight`.

### Git hooks

The hooks live in `.githooks/` and are activated by `make setup`, or on their own with:

```
make hooks     # git config core.hooksPath .githooks
```

There is no husky and no root `package.json`. Hooks committed to `.githooks/` are versioned
exactly as husky's are, because `core.hooksPath` does the same work in both cases. What
husky adds is automatic activation through its `prepare` lifecycle script, which only helps
if everyone runs an install at the repo root. Backend work here happens entirely in
`backend/` with uv, so `make setup` is the honest place for that one-line activation.

| Hook | What it does |
| ---- | ------------ |
| post-checkout | Repoints this checkout at the new branch's database, by rewriting two `.env` files. No Docker, no schema changes. |
| post-merge | Says so when a pull or merge brought in new migrations. |

Both exit 0 always, and neither can fail a checkout or a merge.

Neither runs a migration, deliberately. It sounds convenient to have them run `make
migrate` for you, but it is wrong in both directions. The behind case is already applied by
preflight at the moment the database is actually needed; doing it in the hook as well would
only move it earlier, while adding a Docker and Django boot to every rebase step, bisect
hop, and branch switch. Hooks that make git slow get uninstalled. The ahead case is fixed
only by `make db-reset`, which destroys data, and a git checkout must never do that on its
own.

post-checkout used to diff migration files between the two commits and report whether your
database was behind or ahead. That made sense while every branch shared one database. Now
that the database changes along with the branch, a migration the switch "added" says
nothing about the database you are now pointed at, so the check was removed rather than
left to give confident wrong answers. Preflight asks the actual database instead, which is
accurate and works however you got there: checkout, rebase, bisect, or a fresh clone.

### Switching branches with a dev server already running

Preflight only runs when a server *starts*, so it cannot help a server that is already up.
Django covers one direction and `backend/api/checks.py` covers the other. Both re-run on
every autoreload, and a branch switch changes `.py` files, so both fire on the switch
itself:

| Direction | What happens to the running server |
| --------- | ---------------------------------- |
| Database behind the branch | Django warns `You have N unapplied migration(s)`. The server keeps serving. Run `make migrate`; no restart is needed, it reloads on its own. |
| Database ahead of the branch | The system check fails with `api.E001` and the server stops. It stays down until you run `make db-reset`. |

The asymmetry is deliberate, and the same one as everywhere else in this document. Serving
briefly against a database that is missing a column is recoverable and usually harmless, so
a warning is proportionate. Serving against a schema whose extra columns the code does not
know about is the case that fails later and somewhere unrelated, so it stops the process
rather than letting you keep going.

The check is skipped when `DJANGO_DEBUG` is `False`. Deployed environments roll forward and
never switch branches under a running process, so there it could only fire during a
rollback, exactly when you least want a process refusing to boot.

| Hook | When | What it says |
| ---- | ---- | ------------ |
| post-merge | a pull or merge brought in migration files | run `make migrate` |
| post-checkout | you switched to a branch whose migrations differ | see below |

post-checkout matters because the two directions are not equally recoverable.

- The branch has migrations you have not applied. Your database is behind. `make migrate`
  fixes it, and `make backend` does that for you anyway.
- The branch is missing migrations you have already applied. Your database is *ahead* of
  the code, and Django will not undo that on its own. Nothing complains at first; an extra
  column is invisible until the migration you left behind renamed or dropped something, and
  then the failure surfaces somewhere unrelated. `make db-reset` is the reliable answer.

## A database per branch

Each branch gets its own database: its own container, its own volume, its own port.
Switching branches switches databases, and the branch you left keeps its data. Two
worktrees on two different branches are unaffected by each other, so they run at the same
time.

This matters because of seeds. Once `backend/seeds/` holds a real lookup table, such as a
handbook scrape, a salary scale, or an indexation series, rebuilding it on every branch
switch is not free, and `make db-reset` stops being the cheap answer to everything.

### How it works

`scripts/branch-env.sh` derives a Compose project name and a port from the current branch,
writes them to the gitignored root `.env`, and rewrites `DATABASE_URL` in `backend/.env`
to match. It runs from `.githooks/post-checkout` and from preflight, so it happens without
being asked:

```
$ git checkout -b spike/rates
database for 'spike/rates': rcpt-spike-rates-1c73c1 on port 5435
  run 'make backend' (starts, migrates and seeds it as needed)
```

`main` and `master` keep the stock project (`rcpt`) and port (5433), so the default branch
matches every example in this document.

Ports are allocated sequentially from 5433 and recorded in `.git/rcpt-db-ports`, which
lives in the *common* git directory and is therefore shared by every worktree. That is what
stops two worktrees handing the same port to two different branches. A port freed by
`make db-prune` is reused.

The name carries a short hash of the raw branch name (`rcpt-spike-rates-1c73c1`) so that
`feat/x` and `feat-x`, which slugify identically, cannot land on one database.

The hook only writes those two files. It runs no Docker commands and touches no schema; a
checkout has to stay instant. Starting, migrating, and seeding is preflight's job, at the
point a dev server actually needs the database.

### Keeping it under control

A database per branch means databases outlive their branches. `make db-list` shows every
one and flags the strays:

```
$ make db-list
PROJECT                            PORT    STATE     BRANCH
rcpt                               5433    running   main/master
rcpt-feat-costing-model-5a726d     5434    running   (live)
rcpt-spike-second-db-1c73c1        5435    stopped   ORPHANED, branch deleted
```

`make db-prune` deletes the orphaned ones and releases their ports. It lists what it will
remove and asks first, and it never touches the default branch's database or a project it
did not create.

```
make db-list      # what exists
make db-prune     # delete databases whose branch is gone
make db-down      # stop this branch's database, keeping its data
make db-down-v    # stop it and delete its volume
```

Each database is a real Postgres server, so budget roughly 30 to 50 MB of memory each.
Running three or four branches at once is comfortable; a year of un-pruned spikes is not.

### Detached HEAD

During a bisect, a rebase, or a tag checkout there is no branch to key on, so the script
leaves the current setting alone rather than inventing a database per commit. You stay
pointed at whichever branch's database you were last on.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request, in two independent jobs:

- **Backend** - brings up a Postgres 18 service container (the same major version as
  `docker-compose.yml`), installs with `uv sync --locked`, then runs a migration drift gate,
  applies migrations, and runs the test suite.
- **Frontend** - `pnpm install --frozen-lockfile`, `pnpm lint`, and `pnpm build` (which is
  `tsc -b && vite build`, so it type-checks too).

The **migration drift gate** is `manage.py makemigrations --check --dry-run`. Models are
the source and migrations are the artefact, so a model change pushed without its migration
fails here rather than at deploy time. If it fails, run `make makemigrations` and commit
the result.

Two lockfile gates ride along. `uv sync --locked` fails if `uv.lock` has drifted from
`pyproject.toml`, and `--frozen-lockfile` does the same for `pnpm-lock.yaml`.

## Deployment

Nothing about the local setup ties the project to a particular host. The entire database
configuration is one `DATABASE_URL`, so any managed Postgres works (AWS RDS, Fly, Railway,
Neon, Supabase) without a code change. Deployed environments need:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DJANGO_SECRET_KEY=<a-long-random-string>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=<your-api-hostname>
DJANGO_CORS_ALLOWED_ORIGINS=<your-frontend-origin>
```

`DATABASE_SSL` needs no value there; it defaults to on whenever `DJANGO_DEBUG` is `False`.
Server-side cursors are disabled unconditionally, so the app is safe behind a
transaction-mode connection pooler, which is what most managed offerings put in front of
the database.

The CI job runs `manage.py check --deploy` as an advisory step. Most of what it flags
(HSTS, secure cookies, SSL redirect) depends on the host, which has not been chosen yet.
Read its output when that decision is made.

## Code Style & Static Analysis

This project keeps linting and type checking strict so the codebase stays consistent, readable, and hard to break. The rules below apply to everyone contributing.

### Linting with Ruff

All Python code must pass Ruff before it can be merged. Ruff enforces:

- PEP 8 compliance, including naming, indentation, and a line length of 88 characters
- Removal of unused imports and variables
- Import sorting using isort rules
- Common bug patterns, such as mutable default arguments and bare exceptions

Run it locally:

```
ruff check .
ruff format .
```

It runs in CI/CD too. A pull request fails automatically if `ruff check` reports any errors.

### Type Checking with Pylance / Pyright

Every new function and variable needs an explicit type annotation. Strict mode does not allow implicit `Any` types.

- Function signatures require both parameter and return type hints
- Class attributes must be typed when they are declared
- `pyrightconfig.json` is set to `"typeCheckingMode": "strict"`

Required style:

```python
def calculate_total_cost(unit_price: float, quantity: int) -> float:
    return unit_price * quantity
```

Not accepted:

```python
def calculate_total_cost(unit_price, quantity):
    return unit_price * quantity
```