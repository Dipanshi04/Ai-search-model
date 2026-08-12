

.PHONY: infra-up infra-down infra-logs dev dev-web dev-runner dev-spectator dev-admin dev-led dev-api db-migrate db-seed db-studio db-reset build clean setup health redis-check db-check

infra-up:
	docker compose -f docker-compose.dev.yml up -d

infra-down:
	docker compose -f docker-compose.dev.yml down

infra-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev:
	pnpm dev

dev-web:
	pnpm dev:web

dev-runner:
	pnpm dev:runner

dev-spectator:
	pnpm dev:spectator

dev-admin:
	pnpm dev:admin

dev-led:
	pnpm dev:led

dev-api:
	pnpm dev:api

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

db-reset:
	pnpm db:reset

build:
	pnpm build

clean:
	pnpm clean:all

setup:
	pnpm setup

health:
	curl -s http://localhost:4000/health

redis-check:
	docker exec isa-redis redis-cli ping

db-check:
	docker exec isa-postgres psql -U isa -d isa_marathon -c "SELECT count(*) FROM events;"
