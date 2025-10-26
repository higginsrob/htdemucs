SHELL = /bin/sh
current-dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# Default options
gpu = false
mp3output = true
model = htdemucs_ft
shifts = 1
overlap = 0.25
jobs = 1
splittrack =

.DEFAULT_GOAL := help

.PHONY:
init:
ifeq ($(gpu), true)
  docker-gpu-option = --gpus all
endif
ifeq ($(mp3output), true)
  demucs-mp3-option = --mp3
endif
ifneq ($(splittrack),)
  demucs-twostems-option = --two-stems $(splittrack)
endif

# Construct commands
docker-run-command = docker run --rm -i \
	--name=demucs \
	$(docker-gpu-option) \
	-v $(current-dir)demucs/input:/data/input \
	-v $(current-dir)demucs/output:/data/output \
	-v $(current-dir)demucs/models:/data/models \
	xserrat/facebook-demucs:latest

demucs-command = "python3 -m demucs -n $(model) \
	--out /data/output \
	$(demucs-mp3-option) \
	$(demucs-twostems-option) \
	--shifts $(shifts) \
	--overlap $(overlap) \
	-j $(jobs) \
	\"/data/input/$(track)\""

.PHONY:
.SILENT:
help: ## Display available targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf " \033[36m%-20s\033[0m  %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY:
.SILENT:
run: init build ## Run demucs to split the specified track in the input folder
	@echo $(docker-run-command) $(demucs-command)
	@cd demucs && $(docker-run-command) $(demucs-command)

.PHONY:
.SILENT:
run-interactive: init build ## Run the docker container interactively to experiment with demucs options
	$(docker-run-command) /bin/bash

.PHONY:
.SILENT:
build: ## Build the docker image which supports running demucs with CPU only or with Nvidia CUDA on a supported GPU
	@cd demucs && docker build -t xserrat/facebook-demucs:latest .

.PHONY:
.SILENT:
check: ## Check system prerequisites for running demucs
	@./scripts/check-prerequisites.sh

.PHONY:
.SILENT:
validate: ## Validate the demucs setup by running a full test
	@./scripts/validate.sh

.PHONY:
.SILENT:
clean-outputs: ## Remove all output files
	@./scripts/clean.sh --outputs

.PHONY:
.SILENT:
clean-models: ## Remove downloaded models (will re-download on next run)
	@./scripts/clean.sh --models

.PHONY:
.SILENT:
clean-docker: ## Remove the docker image (will rebuild on next run)
	@./scripts/clean.sh --docker

.PHONY:
.SILENT:
clean-all: ## Remove everything (outputs, models, and docker image)
	@./scripts/clean.sh --all

.PHONY:
.SILENT:
server-build: build ## Build the production web server image
	@echo "Building demucs web server image..."
	@cd server && docker build -t demucs:latest .
	@echo "Server image built successfully!"

.PHONY:
.SILENT:
server-build-no-cache: build ## Build the production web server image
	@echo "Building demucs web server image..."
	@cd server && docker build --no-cache -t demucs:latest .
	@echo "Server image built successfully!"

.PHONY:
.SILENT:
server-run: ## Run the production web server (port 8080)
	@echo "Starting demucs web server on http://localhost:8080"
	@docker run -d --rm \
		--name=demucs \
		-p 8080:8080 \
		-v $(current-dir)demucs/models:/data/models \
		demucs:latest
	@echo "Server started! View logs with: make server-logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
server-run-gpu: ## Run the production web server with GPU support
	@echo "Starting demucs web server with GPU on http://localhost:8080"
	@docker run -d --rm \
		--name=demucs \
		--gpus all \
		-p 8080:8080 \
		-v $(current-dir)demucs/models:/data/models \
		demucs:latest
	@echo "Server started! View logs with: make server-logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
dev: server-stop server-build ## Run the server in development mode (with hot reload)
	@echo "Starting demucs web server on http://localhost:8080"
	@docker run --rm \
		--name=demucs \
		-p 8080:8080 \
		-v $(current-dir)demucs/models:/data/models \
		-v $(current-dir)server/static:/app/static \
		demucs:latest
	@echo "Server started! View logs with: make server-logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
server-stop: ## Stop the running server container
	@docker stop demucs 2>/dev/null || true
	@echo "Server stopped"

.PHONY:
.SILENT:
server-logs: ## Show server logs
	@docker logs -f demucs
