.PHONY: monitoring-start monitoring-stop monitoring-restart monitoring-logs prometheus grafana

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
	@open http://localhost:3060 || xdg-open http://localhost:3060 2>/dev/null || echo "$(YELLOW)Open http://localhost:3060$(NC)"

grafana: ## Open Grafana in browser
	@open http://localhost:3070 || xdg-open http://localhost:3070 2>/dev/null || echo "$(YELLOW)Open http://localhost:3070 (admin/admin)$(NC)"
