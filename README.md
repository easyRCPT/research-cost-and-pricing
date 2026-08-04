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

You also need a PostgreSQL connection string. The project targets [Neon](https://neon.tech)
serverless Postgres — SSL is required and server-side cursors are disabled, so a pooled
Neon URL works out of the box. Any Postgres reachable over SSL will do.

## 1. Clone

```bash
git clone <repo-url> research-cost-and-pricing
cd research-cost-and-pricing
```

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env`:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
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

## 3. Frontend setup

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

Vite serves the app on [http://localhost:5173](http://localhost:5173). That exact origin is the only one listed
in `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`, so if you change the dev port
you must add the new origin there too.

## Everyday commands

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

| File              | Variable              | Purpose                                                                                                                      |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `backend/.env`  | `DATABASE_URL`      | Postgres connection string, parsed by`dj-database-url`. Required.                                                          |
| `backend/.env`  | `DJANGO_SECRET_KEY` | Django signing key. Required — no fallback.                                                                                 |
| `backend/.env`  | `DJANGO_DEBUG`      | Present in`.env.example` but **not yet wired up**; `DEBUG` is currently hard-coded to `True` in `settings.py`. |
| `frontend/.env` | `VITE_API_URL`      | Base URL of the backend API. Only variables prefixed`VITE_` are exposed to the browser.                                    |

`.env` files are gitignored; only `.env.example` is committed. Never commit real
credentials.
