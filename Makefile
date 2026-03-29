.PHONY: help setup cert env init-dirs dev dev-build dev-down dev-logs dev-logs-api dev-logs-web dev-logs-worker \
       prod prod-build prod-down prod-logs \
       build build-api build-web build-worker \
       lint test push deploy \
       db-migrate db-generate db-seed backup-db \
       ps clean

# ============================================
# Setup
# ============================================

setup: env cert dev-build ## Initial project setup (env, cert, base image)
	@echo "Setup complete. Run 'make dev' to start."

env: ## Copy .env.example to .env.dev (if not exists)
	@test -f .env.dev || (cp .env.example .env.dev && sed 's/NODE_ENV=.*/NODE_ENV=development/' .env.dev > .env.dev.tmp && mv .env.dev.tmp .env.dev && echo "Created .env.dev from .env.example")
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")
	@echo ".env files ready"

cert: ## Generate self-signed SSL certificate
	@mkdir -p infra/nginx/certs
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout infra/nginx/certs/server.key \
		-out infra/nginx/certs/server.crt \
		-subj "/CN=localhost"
	@echo "SSL certificate generated at infra/nginx/certs/"

# ============================================
# Development
# ============================================

dev-build: ## Build base image for development
	docker build -f Dockerfile.base -t coin-base .

PROJECT_DIR := $(shell pwd)
DATA_PATH := $(PROJECT_DIR)/data
LOG_PATH := $(PROJECT_DIR)/logs

init-dirs: ## Create data and log directories with correct permissions
	@mkdir -p $(DATA_PATH)/postgres $(DATA_PATH)/redis $(DATA_PATH)/kafka $(DATA_PATH)/zookeeper/data $(DATA_PATH)/zookeeper/log
	@mkdir -p $(LOG_PATH)/postgres $(LOG_PATH)/redis $(LOG_PATH)/nginx $(LOG_PATH)/api-server $(LOG_PATH)/worker-service
	@docker run --rm -v $(abspath $(DATA_PATH)):/data -v $(abspath $(LOG_PATH)):/logs alpine sh -c "\
		chown -R 70:70 /logs/postgres && \
		chown -R 999:1000 /logs/redis && \
		chown -R 1001:1001 /logs/api-server && \
		chown -R 1001:1001 /logs/worker-service && \
		chown -R 1000:1000 /data/kafka && \
		chown -R 1000:1000 /data/zookeeper"
	@echo "Directories ready"

dev: dev-build init-dirs ## Start development environment
	@find . -name 'tsconfig.tsbuildinfo' -delete 2>/dev/null || true
	$(DEV_COMPOSE) up -d --build

DEV_COMPOSE := DATA_DIR=$(DATA_PATH) LOG_DIR=$(LOG_PATH) docker compose -f docker-compose.dev.yml --env-file .env.dev

dev-down: ## Stop development environment
	$(DEV_COMPOSE) down

dev-logs: ## Follow all development logs
	$(DEV_COMPOSE) logs -f

dev-logs-api: ## Follow api-server development logs
	$(DEV_COMPOSE) logs -f api-server

dev-logs-web: ## Follow web development logs
	$(DEV_COMPOSE) logs -f web

dev-logs-worker: ## Follow worker-service development logs
	$(DEV_COMPOSE) logs -f worker-service

# ============================================
# Production
# ============================================

prod-build: ## Build production images
	$(PROD_COMPOSE) build

PROD_COMPOSE := DATA_DIR=$(DATA_PATH) LOG_DIR=$(LOG_PATH) docker compose --env-file .env

prod: init-dirs ## Start production environment (builds if needed)
	$(PROD_COMPOSE) up -d --build

prod-down: ## Stop production environment
	$(PROD_COMPOSE) down

prod-logs: ## Follow all production logs
	$(PROD_COMPOSE) logs -f

# ============================================
# Build
# ============================================

build: prod-build ## Build all production images (alias)

build-api: ## Build api-server production image
	$(PROD_COMPOSE) build api-server

build-web: ## Build web production image
	$(PROD_COMPOSE) build web

build-worker: ## Build worker-service production image
	$(PROD_COMPOSE) build worker-service

# ============================================
# CI/CD
# ============================================

lint: ## Run linter across all packages
	pnpm turbo run lint

test: ## Run tests across all packages
	pnpm turbo run test

push: ## Push images to GHCR
	docker push ghcr.io/fray-cloud/coin-api-server:latest
	docker push ghcr.io/fray-cloud/coin-web:latest
	docker push ghcr.io/fray-cloud/coin-worker-service:latest

deploy: ## Deploy to VPS via SSH (requires cicd/deploy.sh)
	bash cicd/deploy.sh

# ============================================
# Database
# ============================================

db-generate: ## Generate Prisma client
	pnpm --filter @coin/database db:generate

db-migrate: ## Run Prisma migrations
	$(PROD_COMPOSE) exec api-server node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

db-seed: ## Seed database
	pnpm --filter @coin/database exec prisma db seed

backup-db: ## Backup PostgreSQL database
	@mkdir -p backups
	$(PROD_COMPOSE) exec -T postgres pg_dump -U $${POSTGRES_USER:-coin} $${POSTGRES_DB:-coin} > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup saved to backups/"

# ============================================
# Utility
# ============================================

ps: ## Show running containers
	$(PROD_COMPOSE) ps 2>/dev/null || $(DEV_COMPOSE) ps

clean: ## Remove all containers, volumes, and images
	$(PROD_COMPOSE) down -v --rmi local 2>/dev/null || true
	$(DEV_COMPOSE) down -v --rmi local 2>/dev/null || true
	docker rmi coin-base 2>/dev/null || true
	@echo "Cleaned up all containers, volumes, and images"

# ============================================
# Help
# ============================================

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
