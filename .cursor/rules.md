# Demucs Docker Project - Cursor Rules

## Project Overview

This project provides a dockerized wrapper around [Demucs](https://github.com/adefossez/demucs), Meta's AI-powered music source separation tool. Demucs can split audio tracks into individual stems (bass, drums, vocals, other).

**Current Status:**
- ✅ **CLI Tool** (`demucs/` folder): Production-ready Docker image for command-line usage with volume mounts
- 🚧 **Server Tool** (`server/` folder): Planned production-friendly web server with REST API + Socket.IO

## Architecture

### Current: CLI-Based Docker Setup (`demucs/`)

```
demucs/
├── Dockerfile              # Base CUDA-enabled image with demucs installed
├── input/                  # Audio files to process (gitignored except .gitkeep)
├── models/                 # Downloaded pretrained models (gitignored except .gitkeep)
│   └── hub/checkpoints/    # Torch model cache location
└── output/                 # Separated audio tracks (gitignored except .gitkeep)
    └── {model}/
        └── {trackname}/
            ├── bass.mp3
            ├── drums.mp3
            ├── vocals.mp3
            └── other.mp3
```

**Key Components:**
- **Base Image:** `nvidia/cuda:12.6.2-base-ubuntu22.04` (works with/without GPU)
- **Demucs Version:** Pinned to commit `b9ab48cad45976ba42b2ff17b229c071f0df9390`
- **Python Packages:** torch<2, torchaudio<2, numpy<2
- **Environment Variables:**
  - `TORCH_HOME=/data/models` - Where models are cached
  - `OMP_NUM_THREADS=1` - Threading control for CPU

### Planned: Server-Based Setup (`server/`)

**Design Goals:**
- HTTP server for file upload/download instead of volume mounts
- Socket.IO for real-time progress updates
- RESTful API endpoints for audio processing
- Static frontend (HTML/JS/CSS) for web interface
- Based on the existing demucs Docker image
- Production-ready (no volume mounts, self-contained)

**Expected Architecture:**
```
server/
├── Dockerfile              # Extends demucs image, adds web server
├── app/
│   ├── server.py          # Flask/FastAPI + Socket.IO server
│   ├── routes/            # API endpoint handlers
│   ├── services/          # Demucs processing logic
│   └── utils/             # Helper functions
├── static/                # Frontend assets (HTML/JS/CSS)
├── requirements.txt       # Python dependencies (flask-socketio, etc.)
└── README.md             # Server-specific documentation
```

## Development Workflow

### Working with the CLI Tool (`demucs/`)

#### Building the Image
```bash
make build
```
Builds `higginsrob/htdemucs:demucs` from the Dockerfile.

#### Running Demucs

Basic usage:
```bash
make run track=mysong.mp3
```

With options:
```bash
make run track=mysong.mp3 model=htdemucs_ft gpu=true mp3output=true
```

**Available Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `track` | *required* | Filename in `demucs/input/` to process |
| `model` | `htdemucs_ft` | Model to use (htdemucs, htdemucs_ft, htdemucs_6s, mdx_extra) |
| `gpu` | `false` | Enable NVIDIA CUDA acceleration |
| `mp3output` | `true` | Output MP3 format (false = WAV) |
| `shifts` | `1` | Number of random shift predictions to average (slower, better quality) |
| `overlap` | `0.25` | Overlap between prediction windows (0.1-0.25) |
| `jobs` | `1` | Parallel jobs (increases RAM usage) |
| `splittrack` | *(all)* | Only extract one stem: bass, drums, vocals, or other |

#### Interactive Shell
```bash
make run-interactive gpu=true
```
Launches bash inside the container for manual experimentation.

#### Testing CLI Changes

1. Place test audio in `demucs/input/test.mp3`
2. Run: `make run track=test.mp3`
3. Check output in `demucs/output/htdemucs_ft/test/`
4. Validate all 4 stems are generated (bass, drums, vocals, other)

### Working with the Server Tool (`server/`)

**⚠️ Not Yet Implemented - Follow These Guidelines:**

#### Development Setup
1. Create Python virtual environment
2. Install dependencies: `flask`, `flask-socketio`, `python-socketio`
3. Reuse demucs processing logic from base image
4. Implement endpoints:
   - `POST /api/upload` - Upload audio file
   - `GET /api/status/:job_id` - Check processing status
   - `GET /api/download/:job_id` - Download zip of separated tracks
   - WebSocket namespace `/progress` - Real-time progress updates

#### Server Design Principles
- **Stateless:** Don't rely on persistent volumes
- **Job Queue:** Handle multiple concurrent requests
- **Cleanup:** Delete processed files after download or timeout
- **Progress Tracking:** Use Socket.IO to emit progress (0-100%)
- **Error Handling:** Gracefully handle invalid files, timeouts, crashes

#### Testing Server Changes
1. Build server image: `make server-build` (create this target)
2. Run server: `make server-run` (create this target)
3. Test upload via curl or frontend
4. Verify Socket.IO progress events
5. Validate zip download contains all stems

## Common Development Tasks

### Adding a New Model

1. Update `Makefile` default model or pass as parameter
2. First run will download model to `demucs/models/hub/checkpoints/`
3. Model downloads are cached for subsequent runs

### Debugging Dockerfile Issues

```bash
# Build with no cache
cd demucs && docker build --no-cache -t higginsrob/htdemucs:demucs .

# Inspect running container
docker exec -it demucs /bin/bash

# Check logs
docker logs demucs
```

### Updating Demucs Version

1. Edit `demucs/Dockerfile` line 25 to new commit hash
2. Rebuild: `make build`
3. Test with known audio file to ensure compatibility
4. Update this document with new commit hash

## File Locations & Important Paths

| Path | Purpose | Gitignored |
|------|---------|------------|
| `demucs/input/*.mp3` | Source audio files | ✅ Yes |
| `demucs/output/` | Separated tracks | ✅ Yes |
| `demucs/models/` | Cached models (~1GB each) | ✅ Yes |
| `demucs/Dockerfile` | CLI image definition | ❌ No |
| `Makefile` | Build/run commands | ❌ No |
| `server/` | Future web server | ❌ No |

## Testing & Validation

### Manual Testing Checklist

**CLI Tool:**
- [ ] Build completes without errors
- [ ] Default model (htdemucs_ft) downloads successfully
- [ ] CPU processing works (no GPU required)
- [ ] GPU processing works (if available)
- [ ] MP3 output format works
- [ ] WAV output format works (mp3output=false)
- [ ] Single stem extraction works (splittrack=vocals)
- [ ] Output files are valid audio (playable)
- [ ] Multiple runs reuse cached models

**Server Tool (When Implemented):**
- [ ] Server starts without errors
- [ ] File upload endpoint accepts MP3/WAV
- [ ] Processing starts automatically
- [ ] Socket.IO emits progress events
- [ ] Job status endpoint returns correct state
- [ ] Download endpoint returns valid zip
- [ ] Zip contains all 4 stems in MP3 format
- [ ] Old files are cleaned up after download
- [ ] Multiple concurrent jobs are handled
- [ ] Error handling for invalid files

### Quick Test Commands

```bash
# Test CLI with built-in test file
make run track=test.mp3 model=htdemucs_ft

# Verify output was created
ls -lh demucs/output/htdemucs_ft/test/

# Listen to stems (macOS)
open demucs/output/htdemucs_ft/test/vocals.mp3
```

## Common Issues & Solutions

### Issue: "No such file or directory" when running

**Cause:** Input file not in `demucs/input/`  
**Solution:** Copy your audio file to `demucs/input/` first

### Issue: Models download every time

**Cause:** `demucs/models/` directory not persisted  
**Solution:** Ensure volume mount is working: `-v $(current-dir)demucs/models:/data/models`

### Issue: Out of memory

**Cause:** Too many parallel jobs or large audio file  
**Solution:** Reduce `jobs=1` or use GPU mode for efficiency

### Issue: Docker build fails on ARM64 (Apple Silicon)

**Cause:** CUDA base image is x86-64 only  
**Solution:** Add `--platform linux/amd64` to docker build command (slower emulation)

### Issue: GPU not detected

**Cause:** Docker not configured for GPU or missing NVIDIA container runtime  
**Solution:** Install `nvidia-container-toolkit` and restart Docker daemon

## Code Style & Best Practices

### Dockerfile
- Pin all versions (base image, git commits, packages)
- Clean up apt cache to reduce image size: `rm -rf /var/lib/apt/lists/*`
- Use `--no-cache-dir` with pip to reduce image size
- Document why specific versions are pinned

### Makefile
- Provide sensible defaults for all options
- Echo commands before execution for transparency
- Use `.PHONY` targets to avoid file conflicts
- Include help text with `##` comments

### Python (for Server)
- Use type hints for all function signatures
- Handle exceptions gracefully (invalid files, OOM, timeouts)
- Log all operations with timestamps
- Use async/await for Socket.IO operations
- Clean up temporary files in finally blocks

## External Resources

- [Demucs GitHub](https://github.com/adefossez/demucs) - Official repository
- [Demucs Models](https://github.com/facebookresearch/demucs#separating-tracks) - Model comparison
- [Docker CUDA Images](https://hub.docker.com/r/nvidia/cuda) - Base image documentation
- [Flask-SocketIO](https://flask-socketio.readthedocs.io/) - Real-time server framework

## Development Tools

### Helper Scripts

Run `make help` to see all available commands with descriptions.

### Validation Script

A validation script is provided at `scripts/validate.sh` to test the complete workflow:
```bash
./scripts/validate.sh
```

This script:
1. Checks if Docker is running
2. Builds the image if needed
3. Runs demucs on test.mp3
4. Verifies all output files exist
5. Reports success/failure

## Next Steps for Agent

**If working on CLI tool:**
1. Read `demucs/Dockerfile` to understand image setup
2. Read `Makefile` to understand build/run commands
3. Test with `make run track=test.mp3`
4. Make changes and rebuild with `make build`

**If working on Server tool:**
1. Create `server/Dockerfile` based on `demucs/Dockerfile`
2. Create Python server with Flask + Socket.IO
3. Implement upload/download/status endpoints
4. Add Socket.IO progress tracking
5. Build simple HTML frontend for testing
6. Update Makefile with server-specific commands

## Questions to Ask the User

- What port should the server run on? (Suggest: 8080)
- What should the max upload file size be? (Suggest: 100MB)
- How long should processed files be kept? (Suggest: 1 hour)
- Should the server support multiple concurrent jobs? (Suggest: Yes, with queue)
- What authentication/security is needed? (Suggest: Start with none, add later)

---

**Last Updated:** 2025-10-26  
**Demucs Commit:** b9ab48cad45976ba42b2ff17b229c071f0df9390  
**Base Image:** nvidia/cuda:12.6.2-base-ubuntu22.04

