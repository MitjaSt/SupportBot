.PHONY: docker-network docker-start docker-stop docker-restart docker-logs docker-status \
        docker-login docker-build docker-push docker-release

##@ Docker Services

docker-network: ## Create Docker network for services
	@echo "$(BLUE)Creating Docker network...$(NC)"
	@docker network create macular-network 2>/dev/null || echo "$(YELLOW)Network already exists$(NC)"
	@echo "$(GREEN)Network ready!$(NC)"

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

##@ Deployment

docker-login: ## Login to Docker Hub using credentials from .env
	@echo "$(BLUE)Logging in to Docker Hub as $(DOCKERHUB_USERNAME)...$(NC)"
	@echo "$(DOCKERHUB_PASSWORD)" | docker login --username "$(DOCKERHUB_USERNAME)" --password-stdin
	@echo "$(GREEN)Logged in!$(NC)"

docker-build: ## Build production image (tag: git SHA + latest)
	@echo "$(BLUE)Building $(DOCKERHUB_REPO):$(DOCKER_IMAGE_TAG)...$(NC)"
	docker build \
		-t "$(DOCKERHUB_REPO):$(DOCKER_IMAGE_TAG)"
		.
	@echo "$(GREEN)Built $(DOCKERHUB_REPO):$(DOCKER_IMAGE_TAG)$(NC)"

docker-push: docker-login ## Push image to Docker Hub
	@echo "$(BLUE)Pushing $(DOCKERHUB_REPO):$(DOCKER_IMAGE_TAG)...$(NC)"
	docker push "$(DOCKERHUB_REPO):latest"
	@echo "$(GREEN)Pushed $(DOCKERHUB_REPO):$(DOCKER_IMAGE_TAG)$(NC)"

docker-release: docker-build docker-push ## Build and push in one step
