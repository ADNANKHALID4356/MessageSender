# =============================================================
# MessageSender — Makefile
#
# Wraps the docker compose commands and common operations into
# short memorable targets.  All docker targets require .env.prod.
#
# Usage:
#   make help          List all available targets
#   make up            Start all production services
#   make logs          Follow logs from all containers
#   make deploy        Full deploy: pull code + build + up
#   make backup        Back up the PostgreSQL database
#   make secrets       Generate all production secrets
# =============================================================

# Use bash to allow [[ ]] syntax in recipes
SHELL := /bin/bash

# ── Configuration ─────────────────────────────────────────
APP_DIR     ?= $(shell pwd)
ENV_FILE    ?= $(APP_DIR)/.env.prod
COMPOSE_CMD  = docker compose \
                 -f $(APP_DIR)/docker-compose.yml \
                 -f $(APP_DIR)/docker-compose.prod.yml \
                 --env-file $(ENV_FILE)

# Terminal colours
RESET  = \033[0m
BOLD   = \033[1m
GREEN  = \033[32m
YELLOW = \033[33m
BLUE   = \033[34m
RED    = \033[31m

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(BOLD)MessageSender — Make targets$(RESET)"
	@echo ""
	@echo "$(BOLD)Production (requires .env.prod):$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BOLD)Config:$(RESET)"
	@echo "  ENV_FILE = $(ENV_FILE)"
	@echo "  APP_DIR  = $(APP_DIR)"
	@echo ""

# ── Service lifecycle ──────────────────────────────────────

.PHONY: up
up: _check-env ## Start all production services (detached)
	@echo "$(BLUE)Starting services...$(RESET)"
	$(COMPOSE_CMD) up -d --remove-orphans
	@echo "$(GREEN)Services started.$(RESET)"

.PHONY: down
down: _check-env ## Stop and remove all containers
	@echo "$(YELLOW)Stopping services...$(RESET)"
	$(COMPOSE_CMD) down
	@echo "$(GREEN)Services stopped.$(RESET)"

.PHONY: restart
restart: _check-env ## Restart all services
	@echo "$(YELLOW)Restarting services...$(RESET)"
	$(COMPOSE_CMD) restart
	@echo "$(GREEN)Services restarted.$(RESET)"

.PHONY: restart-backend
restart-backend: _check-env ## Restart only the backend container
	$(COMPOSE_CMD) restart backend

.PHONY: restart-frontend
restart-frontend: _check-env ## Restart only the frontend container
	$(COMPOSE_CMD) restart frontend

# ── Build ──────────────────────────────────────────────────

.PHONY: build
build: _check-env ## Build (or rebuild) production Docker images
	@echo "$(BLUE)Building images...$(RESET)"
	$(COMPOSE_CMD) build
	@echo "$(GREEN)Build complete.$(RESET)"

.PHONY: build-no-cache
build-no-cache: _check-env ## Build images from scratch (no cache)
	@echo "$(BLUE)Building images (no cache)...$(RESET)"
	$(COMPOSE_CMD) build --no-cache --pull
	@echo "$(GREEN)Build complete.$(RESET)"

# ── Deploy ─────────────────────────────────────────────────

.PHONY: deploy
deploy: _check-env ## Pull latest code, build images, start services
	@echo "$(BLUE)Starting full deploy...$(RESET)"
	git pull --ff-only origin main
	$(MAKE) build
	$(MAKE) up
	$(MAKE) health
	@echo "$(GREEN)Deploy complete.$(RESET)"

# ── Monitoring ─────────────────────────────────────────────

.PHONY: ps
ps: _check-env ## Show status of all containers
	$(COMPOSE_CMD) ps

.PHONY: logs
logs: _check-env ## Follow logs from all containers (Ctrl+C to exit)
	$(COMPOSE_CMD) logs -f

.PHONY: logs-backend
logs-backend: _check-env ## Follow backend-only logs
	$(COMPOSE_CMD) logs -f backend

.PHONY: logs-frontend
logs-frontend: _check-env ## Follow frontend-only logs
	$(COMPOSE_CMD) logs -f frontend

.PHONY: health
health: ## Check backend and frontend health endpoints
	@echo "$(BLUE)Checking health endpoints...$(RESET)"
	@curl -fsS http://localhost:4000/api/v1/health && echo "$(GREEN)Backend: OK$(RESET)" || echo "$(RED)Backend: FAIL$(RESET)"
	@curl -fsS -o /dev/null http://localhost:3000 && echo "$(GREEN)Frontend: OK$(RESET)" || echo "$(RED)Frontend: FAIL$(RESET)"

.PHONY: stats
stats: ## Show live container CPU / memory usage
	docker stats messagesender_backend messagesender_frontend messagesender_postgres messagesender_redis

# ── Database ───────────────────────────────────────────────

.PHONY: backup
backup: ## Backup PostgreSQL database (gzip compressed)
	@echo "$(BLUE)Creating database backup...$(RESET)"
	@bash $(APP_DIR)/scripts/backup-db.sh
	@echo "$(GREEN)Backup complete.$(RESET)"

.PHONY: db-shell
db-shell: ## Open a psql shell inside the PostgreSQL container
	docker exec -it messagesender_postgres psql -U messagesender messagesender_db

.PHONY: redis-shell
redis-shell: ## Open a redis-cli shell inside the Redis container
	docker exec -it messagesender_redis redis-cli

# ── Validation & Setup ─────────────────────────────────────

.PHONY: validate
validate: ## Run the production readiness validation script
	node $(APP_DIR)/scripts/validate-production.js

.PHONY: secrets
secrets: ## Generate all production secrets and print them
	@bash $(APP_DIR)/scripts/generate-secrets.sh

.PHONY: setup-vps
setup-vps: ## Print command to bootstrap a fresh Ubuntu 22.04 VPS
	@echo ""
	@echo "$(BOLD)Run this on your VPS as root:$(RESET)"
	@echo ""
	@echo "  $(YELLOW)sudo bash scripts/vps-setup-ubuntu.sh$(RESET)"
	@echo ""
	@echo "Then run the first-time deploy:"
	@echo ""
	@echo "  $(YELLOW)bash scripts/vps-deploy.sh https://github.com/ADNANKHALID4356/MessageSender.git$(RESET)"
	@echo ""

# ── Cleanup ────────────────────────────────────────────────

.PHONY: prune
prune: ## Remove unused Docker images, volumes, and networks
	@echo "$(YELLOW)Pruning unused Docker resources...$(RESET)"
	docker system prune -f --filter "until=72h"
	@echo "$(GREEN)Prune complete.$(RESET)"

.PHONY: nuke
nuke: ## ⚠️  DANGER: stop services and delete all volumes (DATA LOSS)
	@echo "$(RED)WARNING: This will DELETE all data volumes!$(RESET)"
	@read -p "Type YES to confirm: " confirm && [ "$$confirm" = "YES" ] || exit 1
	$(COMPOSE_CMD) down --volumes --remove-orphans
	@echo "$(RED)All volumes deleted.$(RESET)"

# ── Internal helpers ───────────────────────────────────────

.PHONY: _check-env
_check-env:
	@if [[ ! -f "$(ENV_FILE)" ]]; then \
	  echo "$(RED)Error: $(ENV_FILE) not found.$(RESET)"; \
	  echo "       Create it from .env.prod.example and fill in your secrets."; \
	  echo "       Run '$(YELLOW)make secrets$(RESET)' to generate the secret values."; \
	  exit 1; \
	fi
