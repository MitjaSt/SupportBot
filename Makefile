SHELL := /bin/bash

# Colors — store actual ESC character so plain echo works on all platforms
BLUE   := $(shell printf '\033[0;34m')
GREEN  := $(shell printf '\033[0;32m')
YELLOW := $(shell printf '\033[0;33m')
RED    := $(shell printf '\033[0;31m')
NC     := $(shell printf '\033[0m')

# Load .env (DOCKERHUB_*, etc.) as Make variables
-include .env
export

# Paths
API_URL      := http://localhost:3030
API_DIR      := projects/api
FRONTEND_DIR := projects/frontend

# Docker
DOCKER_UID  = $(shell id -u)
DOCKER_GID  = $(shell id -g)
DOCKER_USER = $(DOCKER_UID):$(DOCKER_GID)
COMPOSE     = DOCKER_USER=$(DOCKER_USER) docker compose

# Strip quotes that shell-style .env files wrap values in (e.g. REPO="foo/bar")
DOCKERHUB_USERNAME := $(patsubst "%",%,$(DOCKERHUB_USERNAME))
DOCKERHUB_PASSWORD := $(patsubst "%",%,$(DOCKERHUB_PASSWORD))
DOCKERHUB_REPO     := $(patsubst "%",%,$(DOCKERHUB_REPO))

# Image tag
DOCKER_IMAGE_TAG = "latest"

.DEFAULT_GOAL := help

include make/setup.mk
include make/docker.mk
include make/stack.mk
include make/monitoring.mk
include make/api.mk
include make/misc.mk

##@ General

help:
	@echo "$(BLUE)Macular Society RAG Pipeline$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-22s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

# Regenerate shell completion cache — run once after changing targets
complete: ## Print all targets (pipe into shell completion)
	@make -qp 2>/dev/null | awk -F: '/^[a-zA-Z0-9][^$$#\/\t=]*:[^=]/ {print $$1}' | sort -u
