# Shortcuts for local development. Postgres runs in Docker (see
# docker-compose.yml); the backend and frontend run on the host.
#
# Run `make` with no arguments for the list.

.DEFAULT_GOAL := help
.PHONY: help setup db-up db-down db-reset db-logs db-shell migrate makemigrations \
        superuser backend frontend test lint

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First-time setup: env files, dependencies, database, migrations
	@test -f backend/.env || (cp backend/.env.example backend/.env && echo "created backend/.env — set DJANGO_SECRET_KEY in it")
	@test -f frontend/.env || (cp frontend/.env.example frontend/.env && echo "created frontend/.env")
	cd backend && uv sync
	cd frontend && pnpm install
	$(MAKE) db-up
	$(MAKE) migrate

db-up: ## Start Postgres and wait for it to accept connections
	docker compose up -d --wait db

db-down: ## Stop Postgres, keeping the data volume
	docker compose down

db-reset: ## Destroy the database, recreate it, and re-apply migrations
	docker compose down -v
	$(MAKE) db-up
	$(MAKE) migrate

db-logs: ## Tail the Postgres logs
	docker compose logs -f db

db-shell: ## Open a psql prompt on the local database
	docker compose exec db psql -U $${POSTGRES_USER:-rcpt} -d $${POSTGRES_DB:-rcpt}

migrate: ## Apply migrations
	cd backend && uv run python manage.py migrate

makemigrations: ## Generate migrations from model changes
	cd backend && uv run python manage.py makemigrations

superuser: ## Create a Django admin user
	cd backend && uv run python manage.py createsuperuser

backend: ## Run the Django dev server on :8000
	cd backend && uv run python manage.py runserver

frontend: ## Run the Vite dev server on :5173
	cd frontend && pnpm dev

test: ## Run the Django test suite
	cd backend && uv run python manage.py test

lint: ## Lint the frontend and type-check the build
	cd frontend && pnpm lint && pnpm exec tsc -b
