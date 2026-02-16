.PHONY: stats logs

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
