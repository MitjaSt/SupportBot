SHELL := /bin/bash
.PHONY: help setup activate clean test lint format docker-start docker-stop docker-restart pipeline query validate install-hooks requirements-update

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Python executable (use venv if available, fallback to system python)
PYTHON := $(shell if [ -f .venv/bin/python ]; then echo .venv/bin/python; else echo python3.12; fi)

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

setup: ## Create venv and install all dependencies
	@echo "$(BLUE)Setting up virtual environment with Python ...$(NC)"
	$(PYTHON) -m venv .venv
	@echo "$(GREEN)Virtual environment created!$(NC)"
	@echo "$(YELLOW)Activate it with: source .venv/bin/activate$(NC)"
	@echo ""
	@echo "$(BLUE)Installing dependencies...$(NC)"
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r requirements.txt
	@echo "$(GREEN)Dependencies installed!$(NC)"
	@echo ""
	@echo "$(BLUE)Installing Playwright browsers...$(NC)"
	.venv/bin/playwright install
	@echo "$(GREEN)Setup complete!$(NC)"

setup-dev: setup ## Setup with development tools
	@echo "$(BLUE)Installing pre-commit hooks...$(NC)"
	.venv/bin/pre-commit install
	@echo "$(GREEN)Pre-commit hooks installed!$(NC)"

clean: ## Remove cache, build artifacts, and Python bytecode
	@echo "$(BLUE)Cleaning up...$(NC)"
	rm -rf .venv/ __pycache__ **/__pycache__ .mypy_cache/ .pytest_cache/ .ruff_cache/
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-cache: ## Remove only cache directories (preserves venv)
	@echo "$(BLUE)Cleaning cache directories...$(NC)"
	rm -rf cache/json/* cache/flat/* cache/prompts/* cache/agent_simulations/*
	@echo "$(GREEN)Cache cleaned!$(NC)"

validate: ## Validate environment variables and dependencies
	@echo "$(BLUE)Validating environment...$(NC)"
	$(PYTHON) scripts/validate_env.py

##@ Docker

docker-start:
	@echo "$(BLUE)Starting Docker services...$(NC)"
	./docker/start-docker.sh
	@echo "$(GREEN)Docker services started!$(NC)"
	@echo "$(YELLOW)Qdrant Dashboard: http://localhost:6333/dashboard$(NC)"
	@echo "$(YELLOW)Redis Dashboard: http://localhost:5540/$(NC)"

docker-stop:
	@echo "$(BLUE)Stopping Docker services...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.yml down
	@echo "$(GREEN)Docker services stopped!$(NC)"

docker-restart: docker-stop docker-start

docker-logs:
	@$(COMPOSE) --file docker/docker-compose.yml logs -f

docker-status:
	@$(COMPOSE) --file docker/docker-compose.yml ps

##@ Pipeline Execution

scrape: validate ## Run Step 1: Scrape website
	@echo "$(BLUE)Running Step 1: Scraping website...$(NC)"
	$(PYTHON) -m src.pipeline.step1_scrape
	@echo "$(GREEN)Scraping complete!$(NC)"

flatten: validate ## Run Step 2: Flatten JSON to text
	@echo "$(BLUE)Running Step 2: Flattening content...$(NC)"
	$(PYTHON) -m src.pipeline.step2_flatten
	$(PYTHON) -m src.pipeline.step2b_summarize
	@echo "$(GREEN)Flattening complete!$(NC)"

embed: validate docker-status ## Run Step 3: Create embeddings and load to Qdrant
	@echo "$(BLUE)Running Step 3: Creating embeddings...$(NC)"
	$(PYTHON) -m src.pipeline.step3_semantic_chunking
	@echo "$(GREEN)Embeddings created and loaded to Qdrant!$(NC)"

query: validate ## Run Step 4: Interactive query interface
	@echo "$(BLUE)Starting interactive query interface...$(NC)"
	@echo "$(YELLOW)Type your questions or 'quit' to exit$(NC)"
	$(PYTHON) -m src.pipeline.step4_llm "$(Q)";

pipeline: scrape flatten embed ## Run complete pipeline (steps 1-3)
	@echo "$(GREEN)✓ Complete pipeline finished!$(NC)"
	@echo "$(YELLOW)Run 'make query' to start asking questions$(NC)"

pipeline-full: clean-cache pipeline ## Clean cache and run full pipeline

##@ Testing

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	pytest tests/ -v

test-elevenlabs: ## Run ElevenLabs API tests
	@echo "$(BLUE)Testing ElevenLabs integration...$(NC)"
	$(PYTHON) -m tests.test_elevenlabs_list_voices
	$(PYTHON) -m tests.test_elevenlabs_text2voice
	$(PYTHON) -m tests.test_elevenlabs_voice2text

test-qdrant: ## Test Qdrant vector search
	@echo "$(BLUE)Testing Qdrant queries...$(NC)"
	$(PYTHON) -m tests.test_query_qdrant

test-batch-queries: ## Run batch query tests
	@echo "$(BLUE)Running batch queries from TESTING.md...$(NC)"
	$(PYTHON) -m tests.test_batch_queries

##@ Code Quality

lint:
	@echo "$(BLUE)Running linter...$(NC)"
	@if [ -f .venv/bin/ruff ]; then .venv/bin/ruff check .; else ruff check .; fi

lint-fix:
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	@if [ -f .venv/bin/ruff ]; then .venv/bin/ruff check --fix .; else ruff check --fix .; fi

format:
	@echo "$(BLUE)Formatting code...$(NC)"
	@if [ -f .venv/bin/black ]; then .venv/bin/black .; else black .; fi
	@if [ -f .venv/bin/isort ]; then .venv/bin/isort .; else isort .; fi
	@echo "$(GREEN)Code formatted!$(NC)"

format-check: ## Check code formatting without changes
	@echo "$(BLUE)Checking code formatting...$(NC)"
	@if [ -f .venv/bin/black ]; then .venv/bin/black --check .; else black --check .; fi
	@if [ -f .venv/bin/isort ]; then .venv/bin/isort --check-only .; else isort --check-only .; fi

typecheck: ## Run type checker (mypy)
	@echo "$(BLUE)Running type checker...$(NC)"
	@if [ -f .venv/bin/mypy ]; then .venv/bin/mypy .; else mypy .; fi

quality: format lint typecheck ## Run all code quality checks

##@ Development

install-hooks: ## Install git pre-commit hooks
	@echo "$(BLUE)Installing pre-commit hooks...$(NC)"
	pre-commit install
	@echo "$(GREEN)Pre-commit hooks installed!$(NC)"

activate: ## Start a shell with venv activated
	@echo "$(YELLOW)Starting activated shell...$(NC)"
	@bash --init-file <(echo ". ~/.bashrc; source .venv/bin/activate; echo 'Virtual environment activated'")

requirements-update: ## Update requirements.txt from current venv
	@echo "$(BLUE)Updating requirements.txt...$(NC)"
	pip freeze > requirements.txt
	@echo "$(GREEN)Requirements updated!$(NC)"

##@ Utilities

stats: ## Show project statistics
	@echo "$(BLUE)Project Statistics:$(NC)"
	@echo ""
	@echo "$(YELLOW)Python files:$(NC)"
	@find . -name "*.py" -not -path "./.venv/*" -not -path "./.mypy_cache/*" | wc -l
	@echo ""
	@echo "$(YELLOW)Lines of code:$(NC)"
	@find . -name "*.py" -not -path "./.venv/*" -not -path "./.mypy_cache/*" -exec wc -l {} + | tail -1
	@echo ""
	@echo "$(YELLOW)Test files:$(NC)"
	@find . -name "test_*.py" -not -path "./.venv/*" | wc -l
	@echo ""
	@echo "$(YELLOW)Cache size:$(NC)"
	@du -sh cache/ 2>/dev/null || echo "0B"

open-qdrant: ## Open Qdrant dashboard in browser
	@echo "$(BLUE)Opening Qdrant dashboard...$(NC)"
	open http://localhost:6333/dashboard

logs: ## Tail application logs (if any)
	@echo "$(BLUE)Showing recent logs...$(NC)"
	@tail -f cache/prompts/*.yaml 2>/dev/null || echo "No logs found"

# Test variables: `make print-FOO`
print-%: ; @echo $($*)
