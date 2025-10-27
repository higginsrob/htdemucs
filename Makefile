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
docker-local-run-command = docker run --rm -i \
	--name=demucs \
	$(docker-gpu-option) \
	-v $(current-dir)demucs/input:/data/input \
	-v $(current-dir)demucs/output:/data/output \
	-v $(current-dir)demucs/models:/data/models \
	higginsrob/htdemucs:local

# Construct commands
docker-run-command = docker run --rm -i \
	--name=demucs \
	$(docker-gpu-option) \
	-v $(current-dir)demucs/input:/data/input \
	-v $(current-dir)demucs/output:/data/output \
	-v $(current-dir)demucs/models:/data/models \
	higginsrob/htdemucs:latest

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
run-local: init build ## Run demucs to split the specified track in the input folder
	@echo $(docker-local-run-command) $(demucs-command)
	@cd server && $(docker-local-run-command) $(demucs-command)

.PHONY:
.SILENT:
run: init build ## Run demucs to split the specified track in the input folder
	@echo $(docker-run-command) $(demucs-command)
	@cd server && $(docker-run-command) $(demucs-command)

.PHONY:
.SILENT:
run-interactive: init build ## Run the docker container interactively to experiment with demucs options
	$(docker-local-run-command) /bin/bash

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
build: ## Build the docker image which supports running demucs with CPU only or with Nvidia CUDA on a supported GPU
	@echo "Building demucs base image..."
	@cd server && docker build -t higginsrob/htdemucs:local .
	@echo "Server image built successfully!"

.PHONY:
.SILENT:
build-no-cache: build ## Build the production web server image without cache
	@echo "Building demucs web server image (no cache)..."
	@cd server && docker build --no-cache -t higginsrob/htdemucs:local .
	@echo "Server image built successfully!"

.PHONY:
.SILENT:
run: stop build ## Run the production web server (port 8080)
	@echo "Starting demucs web server on http://localhost:8080"
	@echo "Output directory: $(current-dir)demucs/output (persistent storage)"
	@docker run -d --rm \
		--name=demucs \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-e OUTPUT_DIR=/app/output \
		higginsrob/htdemucs:latest
	@echo "Server started! View logs with: make logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
run-gpu: ## Run the production web server with GPU support
	@echo "Starting demucs web server with GPU on http://localhost:8080"
	@echo "Output directory: $(current-dir)demucs/output (persistent storage)"
	@docker run -d --rm \
		--name=demucs \
		--gpus all \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-e OUTPUT_DIR=/app/output \
		higginsrob/htdemucs:latest
	@echo "Server started! View logs with: make logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
dev: stop build ## Run the server in development mode (with hot reload)
	@echo "Starting demucs web server on http://localhost:8080"
	@echo "Output directory: $(current-dir)demucs/output (persistent storage)"
	@docker run --rm \
		--name=demucs \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-v $(current-dir)server/static:/app/static \
		-e OUTPUT_DIR=/app/output \
		higginsrob/htdemucs:local
	@echo "Server started! View logs with: make logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
stop: ## Stop the running server container
	@docker stop demucs 2>/dev/null || true
	@echo "Server stopped"

.PHONY:
.SILENT:
logs: ## Show server logs
	@docker logs -f demucs

.PHONY:
.SILENT:
push: build ## Push the production web server image to Docker Hub
	@echo "Pushing demucs web server image to Docker Hub..."
	@docker push higginsrob/htdemucs:local higginsrob/htdemucs:latest
	@echo "Server image pushed successfully!"

.PHONY:
.SILENT:
pull: ## Pull the production web server image from Docker Hub
	@echo "Pulling demucs web server image from Docker Hub..."
	@docker pull higginsrob/htdemucs:latest
	@echo "Server image pulled successfully!"