.PHONY: api api-prod api-build frontend frontend-build frontend-preview \
        scrape process summarize criteria embed pipeline pipeline-full collection-info \
        test test-cov test-scenarios test-ragas test-evals \
        lint lint-fix format format-check typecheck check \
        db-generate db-migrate db-push db-studio

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

##@ Pipeline Execution

scrape: ## Run Step 1: Scrape website (standalone script, requires playwright)
	@echo "$(BLUE)Running Step 1: Scraping website...$(NC)"
	cd $(API_DIR) && npm run scrape
	@echo "$(GREEN)Scraping complete!$(NC)"

process: ## Run Step 2: Process and flatten content via API
	@echo "$(BLUE)Running Step 2: Processing content...$(NC)"
	@curl -X POST $(API_URL)/api/pipeline/process -H "Content-Type: application/json"
	@echo ""
	@echo "$(GREEN)Processing complete!$(NC)"

summarize: ## Run Step 2b: Summarize content via API
	@echo "$(BLUE)Running Step 2b: Summarizing content...$(NC)"
	@curl -X POST $(API_URL)/api/pipeline/summarize
	@echo ""
	@echo "$(GREEN)Summarization complete!$(NC)"

criteria: ## Generate evaluation criteria via API
	@echo "$(BLUE)Generating evaluation criteria...$(NC)"
	@curl -X POST $(API_URL)/api/pipeline/criteria-generation
	@echo ""
	@echo "$(GREEN)Criteria generation complete!$(NC)"

embed: ## Run Step 3: Create embeddings and store in Postgres
	@echo "$(BLUE)Running Step 3: Creating embeddings...$(NC)"
	@curl -X POST $(API_URL)/api/pipeline/embed
	@echo ""
	@echo "$(GREEN)Embeddings created and stored in Postgres!$(NC)"

pipeline: scrape process summarize embed ## Run complete pipeline (all steps)
	@echo "$(GREEN)✓ Complete pipeline finished!$(NC)"
	@echo "$(YELLOW)API is ready for queries at $(API_URL)$(NC)"

pipeline-full: clean-cache pipeline ## Clean cache and run full pipeline

collection-info: ## Get vector collection info from API
	@echo "$(BLUE)Fetching collection info...$(NC)"
	@curl -X GET $(API_URL)/api/pipeline/collection -H "Content-Type: application/json"
	@echo ""

##@ Testing

test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	cd $(API_DIR) && npm test

test-cov: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	cd $(API_DIR) && npm run test:cov

test-scenarios: ## Run scenario (multi-turn judge) eval tests
	@echo "$(BLUE)Running scenario eval tests...$(NC)"
	cd $(API_DIR) && npm run test:scenarios

test-ragas: ## Run Ragas metric eval tests
	@echo "$(BLUE)Running Ragas eval tests...$(NC)"
	cd $(API_DIR) && npm run test:ragas

test-evals: ## Run all eval tests (scenarios + ragas)
	@echo "$(BLUE)Running all eval tests...$(NC)"
	cd $(API_DIR) && npm run test:evals

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
