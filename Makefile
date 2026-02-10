SHELL := /bin/bash
.PHONY: help setup clean test lint format docker-start docker-stop docker-restart pipeline query api api-dev

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Project settings
API_URL := http://localhost:3030
API_DIR := projects/api
FRONTEND_DIR := projects/frontend

# Default target
.DEFAULT_GOAL := help

# -- Docker
DOCKER_UID  = $(shell id -u)
DOCKER_GID  = $(shell id -g)
DOCKER_USER = $(DOCKER_UID):$(DOCKER_GID)
COMPOSE     = DOCKER_USER=$(DOCKER_USER) docker compose

##@ General

help:
	@echo "$(BLUE)Macular Society RAG Pipeline$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup & Environment

setup: ## Install npm dependencies for all projects
	@echo "$(BLUE)Installing API dependencies...$(NC)"
	cd $(API_DIR) && npm install
	@echo "$(GREEN)API dependencies installed!$(NC)"
	@echo ""
	@echo "$(BLUE)Installing Frontend dependencies...$(NC)"
	cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)Frontend dependencies installed!$(NC)"
	@echo ""
	@echo "$(BLUE)Installing Playwright browsers...$(NC)"
	cd $(API_DIR) && npx playwright install
	@echo "$(GREEN)Setup complete!$(NC)"

clean: ## Remove node_modules and build artifacts
	@echo "$(BLUE)Cleaning up...$(NC)"
	rm -rf $(API_DIR)/node_modules $(API_DIR)/dist
	rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-cache: ## Remove only cache directories
	@echo "$(BLUE)Cleaning cache directories...$(NC)"
	rm -rf cache/json/* cache/flat/* cache/prompts/* cache/summaries/* cache/criteria/*
	@echo "$(GREEN)Cache cleaned!$(NC)"

##@ Docker

docker-start: docker-network ## Start Docker services (Postgres, Whisper, Piper)
	@echo "$(BLUE)Starting Docker services...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.yml up -d
	@echo "$(GREEN)Docker services started!$(NC)"
	@echo "$(YELLOW)Postgres: localhost:5432$(NC)"
	@echo "$(YELLOW)Whisper:  localhost:3040$(NC)"
	@echo "$(YELLOW)Piper:    localhost:3050$(NC)"

docker-stop: ## Stop Docker services
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.yml down
	@echo "$(GREEN)Docker services stopped!$(NC)"

docker-restart: docker-stop docker-start ## Restart Docker services

docker-logs: ## Tail Docker logs
	@$(COMPOSE) --file docker/docker-compose.yml logs -f

docker-status: ## Show Docker services status
	@$(COMPOSE) --file docker/docker-compose.yml ps

docker-network: ## Create Docker network for services
	@echo "$(BLUE)Creating Docker network...$(NC)"
	@docker network create macular-network 2>/dev/null || echo "$(YELLOW)Network already exists$(NC)"
	@echo "$(GREEN)Network ready!$(NC)"

##@ Monitoring

monitoring-start: docker-network ## Start Prometheus and Grafana
	@echo "$(BLUE)Starting monitoring services...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.yml up -d prometheus grafana
	@echo "$(GREEN)Monitoring services started!$(NC)"
	@echo "$(YELLOW)Prometheus: http://localhost:3060$(NC)"
	@echo "$(YELLOW)Grafana: http://localhost:3070 (admin/admin)$(NC)"

monitoring-stop: ## Stop Prometheus and Grafana
	@echo "$(BLUE)Stopping monitoring services...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.yml stop prometheus grafana
	@echo "$(GREEN)Monitoring services stopped!$(NC)"

monitoring-restart: monitoring-stop monitoring-start ## Restart monitoring services

monitoring-logs: ## Tail monitoring service logs
	@$(COMPOSE) --file docker/docker-compose.yml logs -f prometheus grafana

prometheus: ## Open Prometheus in browser
	@echo "$(BLUE)Opening Prometheus...$(NC)"
	@open http://localhost:3060 || xdg-open http://localhost:3060 2>/dev/null || echo "$(YELLOW)Open http://localhost:3060 in your browser$(NC)"

grafana: ## Open Grafana in browser
	@echo "$(BLUE)Opening Grafana...$(NC)"
	@open http://localhost:3070 || xdg-open http://localhost:3070 2>/dev/null || echo "$(YELLOW)Open http://localhost:3070 in your browser (admin/admin)$(NC)"

##@ Pipeline Execution

scrape: ## Run Step 1: Scrape website via API
	@echo "$(BLUE)Running Step 1: Scraping website...$(NC)"
	@curl -X POST $(API_URL)/pipeline/scrape -H "Content-Type: application/json"
	@echo ""
	@echo "$(GREEN)Scraping complete!$(NC)"

process: ## Run Step 2: Process and flatten content via API
	@echo "$(BLUE)Running Step 2: Processing content...$(NC)"
	@curl -X POST $(API_URL)/pipeline/process -H "Content-Type: application/json"
	@echo ""
	@echo "$(GREEN)Processing complete!$(NC)"

summarize: ## Run Step 2b: Summarize content via API
	@echo "$(BLUE)Running Step 2b: Summarizing content...$(NC)"
	@curl -X POST $(API_URL)/pipeline/summarize
	@echo ""
	@echo "$(GREEN)Summarization complete!$(NC)"

criteria: ## Generate evaluation criteria via API
	@echo "$(BLUE)Generating evaluation criteria...$(NC)"
	@curl -X POST $(API_URL)/pipeline/criteria-generation
	@echo ""
	@echo "$(GREEN)Criteria generation complete!$(NC)"

embed: ## Run Step 3: Create embeddings and store in Postgres
	@echo "$(BLUE)Running Step 3: Creating embeddings...$(NC)"
	@curl -X POST $(API_URL)/pipeline/embed
	@echo ""
	@echo "$(GREEN)Embeddings created and stored in Postgres!$(NC)"

pipeline: scrape process summarize embed ## Run complete pipeline (all steps)
	@echo "$(GREEN)✓ Complete pipeline finished!$(NC)"
	@echo "$(YELLOW)API is ready for queries at $(API_URL)$(NC)"

pipeline-full: clean-cache pipeline ## Clean cache and run full pipeline

collection-info: ## Get vector collection info from API
	@echo "$(BLUE)Fetching collection info...$(NC)"
	@curl -X GET $(API_URL)/pipeline/collection -H "Content-Type: application/json"
	@echo ""

##@ API Server

api: ## Start the NestJS API server (development mode)
	@echo "$(BLUE)Starting NestJS API server...$(NC)"
	@echo "$(YELLOW)API will be available at: $(API_URL)$(NC)"
	cd $(API_DIR) && npm run start:dev

api-prod: ## Start the NestJS API server (production mode)
	@echo "$(BLUE)Building and starting API server (production)...$(NC)"
	cd $(API_DIR) && npm run build && npm run start:prod

api-build: ## Build the API for production
	@echo "$(BLUE)Building API...$(NC)"
	cd $(API_DIR) && npm run build
	@echo "$(GREEN)Build complete!$(NC)"

##@ Frontend

frontend: ## Start the frontend development server
	@echo "$(BLUE)Starting frontend development server...$(NC)"
	@echo "$(YELLOW)Frontend will be available at: http://localhost:5173$(NC)"
	cd $(FRONTEND_DIR) && npm run dev

frontend-build: ## Build the frontend for production
	@echo "$(BLUE)Building frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)Frontend build complete!$(NC)"

frontend-preview: ## Preview the production build
	@echo "$(BLUE)Starting frontend preview server...$(NC)"
	cd $(FRONTEND_DIR) && npm run preview

##@ Testing

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	cd $(API_DIR) && npm test

test-cov: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	cd $(API_DIR) && npm run test:cov

test-simulations: ## Run agent simulation tests
	@echo "$(BLUE)Running agent simulation tests...$(NC)"
	cd $(API_DIR) && npm run test:simulations

##@ Code Quality

lint: ## Run ESLint on all projects
	@echo "$(BLUE)Running linter on API...$(NC)"
	cd $(API_DIR) && npm run lint
	@echo "$(BLUE)Running linter on Frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm run lint

lint-fix: ## Run ESLint with auto-fix on API
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	cd $(API_DIR) && npm run lint:fix

format: ## Format code with Prettier on API
	@echo "$(BLUE)Formatting code...$(NC)"
	cd $(API_DIR) && npm run format
	@echo "$(GREEN)Code formatted!$(NC)"

format-check: ## Check code formatting on API
	@echo "$(BLUE)Checking code formatting...$(NC)"
	cd $(API_DIR) && npm run format:check

typecheck: ## Run TypeScript type checker on all projects
	@echo "$(BLUE)Running type checker on API...$(NC)"
	cd $(API_DIR) && npm run typecheck
	@echo "$(BLUE)Running type checker on Frontend...$(NC)"
	cd $(FRONTEND_DIR) && npm run typecheck

check: ## Run all code quality checks on API
	@echo "$(BLUE)Running all code quality checks...$(NC)"
	cd $(API_DIR) && npm run check
	@echo "$(GREEN)All checks passed!$(NC)"

##@ Database

db-generate: ## Generate Drizzle migration files
	@echo "$(BLUE)Generating migration files...$(NC)"
	cd $(API_DIR) && npm run db:generate

db-migrate: ## Run Drizzle migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	cd $(API_DIR) && npm run db:migrate

db-push: ## Push schema changes to database
	@echo "$(BLUE)Pushing schema to database...$(NC)"
	cd $(API_DIR) && npm run db:push

db-studio: ## Open Drizzle Studio
	@echo "$(BLUE)Opening Drizzle Studio...$(NC)"
	cd $(API_DIR) && npm run db:studio

##@ Utilities

stats: ## Show project statistics
	@echo "$(BLUE)Project Statistics:$(NC)"
	@echo ""
	@echo "$(YELLOW)TypeScript files:$(NC)"
	@find $(API_DIR)/src -name "*.ts" | wc -l
	@echo ""
	@echo "$(YELLOW)Lines of code:$(NC)"
	@find $(API_DIR)/src -name "*.ts" -exec wc -l {} + | tail -1
	@echo ""
	@echo "$(YELLOW)Cache size:$(NC)"
	@du -sh cache/ 2>/dev/null || echo "0B"

logs: ## Tail application logs
	@echo "$(BLUE)Showing recent logs...$(NC)"
	@tail -f cache/prompts/*.json 2>/dev/null || echo "No logs found"

# Test variables: `make print-FOO`
print-%: ; @echo $($*)
