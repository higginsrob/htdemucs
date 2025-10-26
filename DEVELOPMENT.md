# Development Guide

This guide provides information for developers working on the Demucs Docker project.

## Quick Start

### First Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url> demucs
   cd demucs
   ```

2. **Check prerequisites**
   ```bash
   make check
   ```
   This will verify Docker, Make, and other requirements are installed.

3. **Add a test audio file**
   ```bash
   cp /path/to/your/song.mp3 demucs/input/test.mp3
   ```

4. **Build and test**
   ```bash
   make build
   make validate
   ```

## Project Structure

```
.
├── .cursor/
│   ├── init.md              # Initial project setup instructions (one-time)
│   └── rules.md             # Comprehensive agent guidelines
├── demucs/                  # CLI Docker setup
│   ├── Dockerfile          # Main image definition
│   ├── input/              # Audio files to process
│   ├── models/             # Downloaded model cache
│   └── output/             # Separated audio tracks
├── server/                  # Future: Web server (not yet implemented)
├── scripts/                 # Development helper scripts
│   ├── check-prerequisites.sh
│   ├── validate.sh
│   └── clean.sh
├── Makefile                # Build and run commands
├── README.md               # User documentation
└── DEVELOPMENT.md          # This file

```

## Common Development Workflows

### Testing Changes to Dockerfile

1. Make your changes to `demucs/Dockerfile`
2. Rebuild the image:
   ```bash
   make build
   ```
3. Test with validation script:
   ```bash
   make validate
   ```
4. For interactive debugging:
   ```bash
   make run-interactive
   ```

### Testing Different Models

```bash
# Test with default model (htdemucs_ft)
make run track=test.mp3

# Test with base model
make run track=test.mp3 model=htdemucs

# Test with 6-stem model
make run track=test.mp3 model=htdemucs_6s

# Test with MDX extra model
make run track=test.mp3 model=mdx_extra
```

### Working with GPU

```bash
# Check if GPU is available
./scripts/check-prerequisites.sh

# Run with GPU support
make run track=test.mp3 gpu=true

# Interactive with GPU
make run-interactive gpu=true
```

### Cleaning Up

```bash
# Clean outputs only (safe)
make clean-outputs

# Clean models (will re-download)
make clean-models

# Clean Docker image (will rebuild)
make clean-docker

# Nuclear option: clean everything
make clean-all
```

## Development Scripts

See [scripts/README.md](scripts/README.md) for detailed information about available helper scripts.

## Code Organization

### demucs/Dockerfile

The main Docker image definition. Key sections:

- **Base Image:** CUDA-enabled Ubuntu (works without GPU too)
- **Dependencies:** Python, ffmpeg, build tools
- **Demucs Installation:** Cloned from GitHub, pinned to specific commit
- **Python Packages:** torch<2, torchaudio<2, numpy<2
- **Volumes:** /data/input, /data/output, /data/models

**When modifying:**
- Always pin versions for reproducibility
- Test with both CPU and GPU modes
- Clean apt cache to reduce image size
- Document why versions are pinned

### Makefile

Controls build and run operations. Key features:

- **Options:** All configurable via command-line arguments
- **Defaults:** Sensible defaults for common use cases
- **Help:** Auto-generated from inline comments

**When modifying:**
- Add `## Description` comments for help text
- Use `.PHONY` for non-file targets
- Test with different option combinations

## Testing Strategy

### Manual Testing

1. **Build Test:** `make build` completes without errors
2. **Run Test:** `make run track=test.mp3` produces output
3. **Output Test:** All 4 stems are generated (bass, drums, vocals, other)
4. **Audio Test:** Play output files to verify quality
5. **GPU Test:** If available, test with `gpu=true`

### Automated Testing

```bash
# Run validation script
make validate
```

This script tests the complete workflow end-to-end.

### Test Files

Use short audio clips (30-60 seconds) for testing:
- Faster iteration
- Less disk space
- Easier to verify quality

## Troubleshooting

### Build Issues

**Problem:** Docker build fails  
**Solution:** Check Docker is running with `docker info`

**Problem:** Out of disk space  
**Solution:** Clean with `make clean-all`

**Problem:** Build fails on ARM64 (Apple Silicon)  
**Solution:** Add `--platform linux/amd64` to docker build (slower)

### Runtime Issues

**Problem:** Models download every time  
**Solution:** Ensure volume mount is working: `docker inspect demucs`

**Problem:** Out of memory  
**Solution:** Reduce `jobs` parameter or use GPU

**Problem:** Slow performance  
**Solution:** Enable GPU mode or reduce `shifts` parameter

## Contributing Guidelines

### Before Committing

1. Run `make validate` to ensure everything works
2. Test with and without GPU (if available)
3. Update documentation if adding features
4. Clean up temporary files with `make clean-outputs`

### Commit Message Format

```
type: brief description

Longer description if needed

- Bullet points for details
- What changed and why
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### Pull Request Checklist

- [ ] Code builds successfully
- [ ] Validation tests pass
- [ ] Documentation updated
- [ ] No sensitive files committed (check .gitignore)
- [ ] Tested on CPU mode
- [ ] Tested on GPU mode (if available)

## Future Work: Server Component

The `server/` directory is reserved for a production-friendly web server:

**Planned Features:**
- HTTP file upload/download endpoints
- Socket.IO for real-time progress
- No volume mounts (self-contained)
- Job queue for multiple requests
- Static HTML/JS/CSS frontend

**When implementing:**
1. Base on existing demucs Docker image
2. Add Flask/FastAPI + Socket.IO
3. Implement upload/download/status endpoints
4. Add progress tracking with Socket.IO
5. Create simple web UI for testing
6. Update Makefile with server targets

See `.cursor/rules.md` for detailed server design guidelines.

## Resources

- [Demucs Official Repo](https://github.com/adefossez/demucs)
- [Demucs Models](https://github.com/facebookresearch/demucs#separating-tracks)
- [Docker Documentation](https://docs.docker.com/)
- [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-container-toolkit)

## Getting Help

1. Check `.cursor/rules.md` for comprehensive project guidelines
2. Run `make help` to see all available commands
3. Run `./scripts/check-prerequisites.sh` to diagnose setup issues
4. Check Docker logs: `docker logs demucs`

## License

See [LICENSE](LICENSE) file for details.

