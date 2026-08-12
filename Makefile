# Shortcuts for local development. Postgres runs in Docker (see
# docker-compose.yml); the backend and frontend run on the host.
#
# Run `make` with no arguments for the list.

.DEFAULT_GOAL := help
.PHONY: help setup hooks preflight db-up db-down \
        db-down-v db-reset db-logs db-shell db-list db-prune branch-env migrate \
        makemigrations seed seed-list superuser backend frontend test lint

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup: env files, dependencies, hooks, database, migrations, seeds
	@test -f backend/.env || (cp backend/.env.example backend/.env && echo "created backend/.env — set DJANGO_SECRET_KEY in it")
	@test -f frontend/.env || (cp frontend/.env.example frontend/.env && echo "created frontend/.env")
	cd backend && uv sync
	cd frontend && pnpm install
	$(MAKE) hooks
	$(MAKE) branch-env
	$(MAKE) db-up
	$(MAKE) migrate
	$(MAKE) seed

hooks: ## Activate the repo's git hooks (.githooks/)
	@git config core.hooksPath .githooks
	@echo "git hooks activated — core.hooksPath is now .githooks/"

preflight: ## Check Docker, config, database and migrations are ready
	@sh scripts/preflight.sh

db-up: ## Start Postgres and wait for it to accept connections
	docker compose up -d --wait db

db-down: ## Stop Postgres, keeping the data volume
	docker compose down

db-down-v: ## Stop this branch's Postgres and delete its volume
	docker compose down -v

branch-env: ## Point this checkout at the current branch's database
	@sh scripts/branch-env.sh

db-list: ## Show every branch's database, and flag ones whose branch is gone
	@sh scripts/db-list.sh

db-prune: ## Delete databases for branches that no longer exist
	@sh scripts/db-prune.sh

db-reset: ## Destroy the database, recreate it, re-apply migrations and re-seed
	docker compose down -v
	$(MAKE) db-up
	$(MAKE) migrate
	$(MAKE) seed

db-logs: ## Tail the Postgres logs
	docker compose logs -f db

db-shell: ## Open a psql prompt on the local database
	docker compose exec db psql -U $${POSTGRES_USER:-rcpt} -d $${POSTGRES_DB:-rcpt}

migrate: ## Apply migrations
	cd backend && uv run python manage.py migrate

makemigrations: ## Generate migrations from model changes
	cd backend && uv run python manage.py makemigrations

seed: ## Load reference data from backend/seeds/ (idempotent)
	cd backend && uv run python manage.py seed

seed-list: ## Show which seed files would run, in order
	cd backend && uv run python manage.py seed --list

superuser: ## Create a Django admin user
	cd backend && uv run python manage.py createsuperuser

backend: preflight ## Run the Django dev server on :8000
	cd backend && uv run python manage.py runserver

frontend: ## Run the Vite dev server on :5173
	cd frontend && pnpm dev

test: ## Run the Django test suite
	cd backend && uv run python manage.py test

lint: ## Lint the frontend and type-check the build
	cd frontend && pnpm lint && pnpm exec tsc -b
