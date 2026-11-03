.PHONY: dev deps db-setup down e2e e2e-stripe screenshots

deps:
	docker compose up -d postgres mailpit content-worker

db-setup:
	npm run migrate
	npm run migrate:content
	npm run seed

dev: deps
	@echo "Waiting for Postgres…"
	@POSTGRES_HOST=localhost POSTGRES_USER=pawtraitry ./scripts/wait-for-postgres.sh || (echo "Install postgresql-client for pg_isready, or wait a few seconds and run make db-setup" && sleep 5)
	$(MAKE) db-setup
	@if [ -n "$$STRIPE_SECRET_KEY" ]; then docker compose --profile stripe up -d stripe-listener; fi
	@echo ""
	@echo "Pawtraitry:  http://pawtraitry.localhost:3000  (or http://localhost:3000)"
	@echo "WildFrame:   http://wildframe.localhost:3000  (or ?store=wildframe on localhost)"
	@echo "Admin:       http://localhost:3000/admin  (password from ADMIN_PASSWORD)"
	@echo "Content:   http://localhost:8080/admin?token=$${CONTENT_WORKER_SECRET:-dev-change-me}"
	@echo "Mailpit:   http://localhost:8025"
	@echo ""
	npm run dev

down:
	docker compose --profile stripe down

e2e:
	npm run test:e2e

e2e-stripe:
	npm run test:e2e:stripe

screenshots:
	npm run test:e2e -- --grep @screenshots
