.PHONY: setup clean clean-cache

##@ Setup & Environment

setup: ## Install npm dependencies for all projects
	@echo "$(BLUE)Installing API dependencies...$(NC)"
	cd $(API_DIR) && npm install
	@echo "$(GREEN)API dependencies installed!$(NC)"
	@echo ""
	@echo "$(BLUE)Creating .env symlink for API...$(NC)"
	@[ -e $(API_DIR)/.env ] || ln -s ../../.env $(API_DIR)/.env
	@echo "$(GREEN).env symlink ready!$(NC)"
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

clean-cache: ## Remove only cache directories (prompts for confirmation)
	@read -p "Remove all cache dirs (json, flat, prompts, summaries, criteria)? [y/N] " ans && [ "$$ans" = "y" ] || { echo "$(YELLOW)Aborted.$(NC)"; exit 1; }
	rm -rf cache/json/* cache/flat/* cache/prompts/* cache/summaries/* cache/criteria/*
	@echo "$(GREEN)Cache cleaned!$(NC)"
