.PHONY: up down logs migrate seed test-api lint-api typecheck-api mobile-install lint-mobile typecheck-mobile test-mobile

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f api postgres

migrate:
	cd api && alembic upgrade head

seed:
	cd api && python -m app.db.seed

test-api:
	cd api && pytest

lint-api:
	cd api && ruff check .

typecheck-api:
	cd api && mypy app

mobile-install:
	cd mobile && npm install

lint-mobile:
	cd mobile && npm run lint

typecheck-mobile:
	cd mobile && npm run typecheck

test-mobile:
	cd mobile && npm run test
