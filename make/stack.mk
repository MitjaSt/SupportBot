.PHONY: stack-start stack-stop stack-logs

##@ Production Stack

stack-start: docker-network ## Start full production stack (services + API image)
	@echo "$(BLUE)Starting production stack...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.prod.yml up -d
	@echo "$(GREEN)Stack started!$(NC)"
	@echo "$(YELLOW)Frontend:   http://localhost:3030$(NC)"
	@echo "$(YELLOW)API:        http://localhost:3030/api$(NC)"
	@echo "$(YELLOW)Prometheus: http://localhost:3060$(NC)"
	@echo "$(YELLOW)Grafana:    http://localhost:3070$(NC)"

stack-stop: ## Stop full production stack
	@echo "$(BLUE)Stopping production stack...$(NC)"
	@$(COMPOSE) --file docker/docker-compose.prod.yml down
	@echo "$(GREEN)Stack stopped!$(NC)"

stack-logs: ## Tail production stack logs
	@$(COMPOSE) --file docker/docker-compose.prod.yml logs -f
