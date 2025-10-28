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
	@echo "Building custom ARM-native demucs base image..."
	@cd server && docker build -f Dockerfile.base -t higginsrob/demucs-base:latest .
	@echo "Building yt-dlp image..."
	@cd server && docker build -f Dockerfile.ytdlp -t higginsrob/yt-dlp:latest .
	@echo "Building demucs server image..."
	@cd server && docker build -t higginsrob/htdemucs:local .
	@echo "All images built successfully!"

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
	@echo "Job retention: 168 hours (7 days)"
	@docker run -d --rm \
		--name=demucs \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-e OUTPUT_DIR=/app/output \
		-e HOST_OUTPUT_DIR=$(current-dir)demucs/output \
		-e JOB_RETENTION_HOURS=168 \
		higginsrob/htdemucs:local
	@echo "Server started! View logs with: make logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
run-gpu: ## Run the production web server with GPU support
	@echo "Starting demucs web server with GPU on http://localhost:8080"
	@echo "Output directory: $(current-dir)demucs/output (persistent storage)"
	@echo "Job retention: 168 hours (7 days)"
	@docker run -d --rm \
		--name=demucs \
		--gpus all \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-e OUTPUT_DIR=/app/output \
		-e JOB_RETENTION_HOURS=168 \
		higginsrob/htdemucs:latest
	@echo "Server started! View logs with: make logs"
	@echo "Open in browser: http://localhost:8080"

.PHONY:
.SILENT:
dev: stop build ## Run the server in development mode (with hot reload)
	@echo "Starting demucs web server on http://localhost:8080"
	@echo "Output directory: $(current-dir)demucs/output (persistent storage)"
	@echo "Job retention: 168 hours (7 days)"
	@docker run --rm \
		--name=demucs \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-p 8080:8080 \
		-v $(current-dir)demucs/output:/app/output \
		-v $(current-dir)demucs/models:/data/models \
		-v $(current-dir)server/static:/app/static \
		-e OUTPUT_DIR=/app/output \
		-e HOST_OUTPUT_DIR=$(current-dir)demucs/output \
		-e JOB_RETENTION_HOURS=168 \
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
	@docker tag higginsrob/htdemucs:local higginsrob/htdemucs:latest
	@docker push higginsrob/htdemucs:latest
	@docker push higginsrob/demucs-base:latest
	@docker push higginsrob/yt-dlp:latest
	@echo "Server image pushed successfully!"

.PHONY:
.SILENT:
pull: ## Pull the production web server image from Docker Hub
	@echo "Pulling demucs web server image from Docker Hub..."
	@docker pull higginsrob/htdemucs:latest
	@docker pull higginsrob/demucs-base:latest
	@docker pull higginsrob/yt-dlp:latest
	@echo "Server image pulled successfully!"

.PHONY:
.SILENT:
landing-page: 
	@echo "Serving landing page..."
	@cd landing-page && npx http-server .
	# @cd landing-page && python3 -m http.server 8080