# Docker Multi-Container Setup for Demucs Server

This setup separates the server and yt-dlp into two Docker containers for better isolation and version management.

## Architecture

### Images
1. **higginsrob/yt-dlp:latest** - Standalone yt-dlp container with Python 3.10
2. **higginsrob/htdemucs:local** - Main server container

### How It Works
- The server container has Docker CLI installed
- The server runs in privileged mode with access to Docker socket
- When the server needs to use yt-dlp, it runs `docker run` to execute commands in the yt-dlp container
- Both containers share the same volume mounts for `/app/output`

## Build Commands

```bash
# Build both images
make build

# Build just the yt-dlp image
cd server
docker build -f Dockerfile.ytdlp -t higginsrob/yt-dlp:latest .

# Build just the server image  
cd server
docker build -t higginsrob/htdemucs:local .
```

## Run Commands

```bash
# Run the server (with Docker-in-Docker capability)
make run

# Or manually:
docker run -d --rm \
  --name=demucs \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 8080:8080 \
  -v $(pwd)/demucs/output:/app/output \
  -v $(pwd)/demucs/models:/data/models \
  -e OUTPUT_DIR=/app/output \
  higginsrob/htdemucs:local
```

## How yt-dlp is Called

The `YouTubeService` in `server/app/services/youtube_service.py` now calls yt-dlp like this:

```python
docker run --rm \
  -v /app/output:/data/output \
  higginsrob/yt-dlp:latest \
  [yt-dlp arguments]
```

This ensures:
- yt-dlp runs with Python 3.10 and version 2025.10.22
- Demucs runs with Python 3.8 (required by the base image)
- Both containers can access the same output files

