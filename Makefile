.DEFAULT_GOAL := help
.PHONY: help up down build logs shell-backend shell-db psql reset seed

# ─── Colors ────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

help:
	@echo ""
	@echo "$(CYAN)AP e-Procurement — Docker commands$(RESET)"
	@echo ""
	@echo "  make up        — Build images and start all services (first time)"
	@echo "  make start     — Start without rebuilding (subsequent runs)"
	@echo "  make down      — Stop all services"
	@echo "  make logs      — Tail all service logs"
	@echo "  make reset     — Stop, delete volumes, and start fresh"
	@echo "  make seed      — Re-run seed data manually"
	@echo "  make psql      — Open PostgreSQL shell"
	@echo ""

# ── First run (builds images) ───────────────────────────────────────────────
up:
	@[ -f .env ] || (echo "⚠  .env not found. Copy .env.docker to .env and set ANTHROPIC_API_KEY." && exit 1)
	docker compose up --build -d
	@echo ""
	@echo "$(CYAN)✓ AP e-Procurement is live at http://localhost$(RESET)"
	@echo ""
	@echo "  Admin login : admin@apeprocurement.gov.in / admin123"
	@echo "  Vendor login: vendor@coastalinfra.in / vendor123"
	@echo ""

# ── Subsequent runs (no rebuild) ────────────────────────────────────────────
start:
	docker compose up -d
	@echo "$(CYAN)✓ Started at http://localhost$(RESET)"

# ── Stop ─────────────────────────────────────────────────────────────────────
down:
	docker compose down

# ── Logs ─────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

# ── Full reset (deletes DB data) ─────────────────────────────────────────────
reset:
	docker compose down -v
	docker compose up --build -d

# ── Manual seed ──────────────────────────────────────────────────────────────
seed:
	docker compose exec backend sh -c "node -e \"require('./dist/index.js')\" || true"

# ── PostgreSQL shell ──────────────────────────────────────────────────────────
psql:
	docker compose exec db psql -U postgres -d ap_eprocurement

# ── Backend shell ─────────────────────────────────────────────────────────────
shell-backend:
	docker compose exec backend sh
