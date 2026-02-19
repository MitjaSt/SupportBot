.PHONY: test test-cov test-scenarios test-ragas test-evals

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
