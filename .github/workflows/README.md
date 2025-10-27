# GitHub Actions - Docker Build & Push

This workflow automatically builds and pushes Docker images to Docker Hub at `higginsrob/htdemucs`.

## Images Built

The workflow builds and pushes two images:

1. **Demucs Base Image** (`higginsrob/htdemucs:demucs`)
   - Built from `demucs/Dockerfile`
   - Contains the core Demucs CLI and models
   - Based on NVIDIA CUDA (supports both GPU and CPU)

2. **Server Image** (`higginsrob/htdemucs:latest`, `higginsrob/htdemucs:server`)
   - Built from `server/Dockerfile`
   - Includes the web interface and API
   - Built on top of the demucs base image

## Triggers

The workflow runs on:
- **Push to main branch**: Builds and pushes with `latest` and `main` tags
- **Git tags** (e.g., `v1.0.0`): Builds and pushes with version tags
- **Pull requests**: Builds only (does not push)
- **Manual trigger**: Via GitHub Actions UI

## Setup Requirements

### 1. Docker Hub Repository

Create a repository on Docker Hub:
- Repository name: `htdemucs`
- Username: `higginsrob`
- Full path: `higginsrob/htdemucs`

### 2. GitHub Secrets

Add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

| Secret Name | Description | How to Get It |
|-------------|-------------|---------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | Your Docker Hub login username (e.g., `higginsrob`) |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Create at [Docker Hub Security Settings](https://hub.docker.com/settings/security) |

#### Creating a Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Name it (e.g., "GitHub Actions")
5. Set permissions: **Read, Write, Delete**
6. Copy the token (you won't see it again!)
7. Add it as `DOCKERHUB_TOKEN` in GitHub Secrets

## Image Tags

The workflow creates the following tags:

### Demucs Base Image
- `higginsrob/htdemucs:demucs` - Latest demucs base
- `higginsrob/htdemucs:demucs-latest` - Alias for latest
- `higginsrob/htdemucs:main-demucs` - Latest from main branch
- `higginsrob/htdemucs:v1.0.0-demucs` - Version tagged releases

### Server Image
- `higginsrob/htdemucs:latest` - Latest server (main branch)
- `higginsrob/htdemucs:server` - Alias for latest server
- `higginsrob/htdemucs:main` - Latest from main branch
- `higginsrob/htdemucs:v1.0.0` - Version tagged releases
- `higginsrob/htdemucs:sha-<commit>` - Commit-specific builds

## Usage

### Pull Images

```bash
# Pull the server image (includes web interface)
docker pull higginsrob/htdemucs:latest

# Pull just the demucs base image
docker pull higginsrob/htdemucs:demucs
```

### Run the Server

```bash
docker run -d --rm \
  --name htdemucs \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest
```

With GPU support:
```bash
docker run -d --rm \
  --name htdemucs \
  --gpus all \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest
```

### Run Demucs CLI Only

```bash
docker run --rm -i \
  -v $(pwd)/input:/data/input \
  -v $(pwd)/output:/data/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:demucs \
  "python3 -m demucs -n htdemucs /data/input/song.mp3 --out /data/output"
```

## Creating a Release

To trigger a versioned build:

```bash
# Tag the commit
git tag -a v1.0.0 -m "Release v1.0.0"

# Push the tag
git push origin v1.0.0
```

This will create images tagged with `v1.0.0`, `v1.0`, and `v1`.

## Monitoring Builds

1. Go to the **Actions** tab in your GitHub repository
2. Click on **Build and Push Docker Images**
3. View the latest workflow runs
4. Check build logs and status

## Troubleshooting

### Build fails with authentication error
- Verify `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are set correctly
- Ensure the access token has write permissions
- Check that the Docker Hub repository exists

### Server image fails to build
- The server image depends on the demucs base image
- Ensure the base image built successfully first
- Check that `higginsrob/htdemucs:demucs` exists on Docker Hub

### Repository not found
- Make sure the Docker Hub repository `higginsrob/htdemucs` is created
- Verify the repository is public or your token has access

## Advanced Configuration

### Building Multi-Platform Images

To support ARM64 (e.g., Apple Silicon), modify the workflow:

```yaml
platforms: linux/amd64,linux/arm64
```

Note: This will significantly increase build times.

### Customizing Cache

The workflow uses registry caching to speed up builds. To disable:

Remove these lines from the workflow:
```yaml
cache-from: type=registry,ref=${{ env.DOCKERHUB_REPO }}:demucs-buildcache
cache-to: type=registry,ref=${{ env.DOCKERHUB_REPO }}:demucs-buildcache,mode=max
```

## Local Development

To build locally using the same configuration:

```bash
# Build demucs base
docker build -t higginsrob/htdemucs:demucs ./demucs

# Build server (using local base)
docker build \
  --build-arg BASE_IMAGE=higginsrob/htdemucs:demucs \
  -t higginsrob/htdemucs:latest \
  ./server
```

