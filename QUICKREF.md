# Demucs Quick Reference

## Essential Commands

```bash
# Build
make build                      # Build Docker image

# Run
make run track=mysong.mp3       # Process audio file (basic)
make run track=test.mp3 \       # Process with options
  model=htdemucs_ft \
  gpu=true \
  mp3output=true

# Utilities
make help                       # Show all commands
make check                      # Check prerequisites
make validate                   # Run full test workflow
make run-interactive            # Open bash shell in container

# Cleanup
make clean-outputs             # Remove output files
make clean-models              # Remove models (will re-download)
make clean-docker              # Remove Docker image
make clean-all                 # Remove everything
```

## Options

| Option | Default | Values | Description |
|--------|---------|--------|-------------|
| `track` | *required* | filename | Audio file in demucs/input/ |
| `model` | `htdemucs_ft` | htdemucs, htdemucs_ft, htdemucs_6s, mdx_extra | Model to use |
| `gpu` | `false` | true, false | Enable NVIDIA CUDA |
| `mp3output` | `true` | true, false | MP3 (true) or WAV (false) |
| `shifts` | `1` | 1-10 | Random shift predictions (slower, better) |
| `overlap` | `0.25` | 0.1-0.4 | Prediction window overlap |
| `jobs` | `1` | 1-8 | Parallel jobs (more RAM) |
| `splittrack` | *(all)* | bass, drums, vocals, other | Extract single stem only |

## Common Workflows

### First Time Setup
```bash
make check                     # Verify prerequisites
cp song.mp3 demucs/input/      # Add test file
make build                     # Build image
make validate                  # Test everything
```

### Process Audio
```bash
# Copy audio to input folder
cp mysong.mp3 demucs/input/

# Run demucs
make run track=mysong.mp3

# Find output
open demucs/output/htdemucs_ft/mysong/
```

### High Quality Processing
```bash
make run track=mysong.mp3 \
  model=htdemucs_ft \
  shifts=5 \
  gpu=true
```

### Extract Single Stem
```bash
# Just vocals
make run track=mysong.mp3 splittrack=vocals

# Just drums
make run track=mysong.mp3 splittrack=drums
```

### Troubleshooting
```bash
# Check what's wrong
make check

# Clean and retry
make clean-outputs
make build
make validate

# Interactive debugging
make run-interactive
> python3 -m demucs --help
```

## File Locations

```
demucs/
├── input/           # Put your MP3/WAV files here
├── models/          # Downloaded models cached here (~1GB each)
└── output/          # Separated stems output here
    └── {model}/
        └── {trackname}/
            ├── bass.mp3
            ├── drums.mp3
            ├── vocals.mp3
            └── other.mp3
```

## Models

| Model | Quality | Speed | Stems | Best For |
|-------|---------|-------|-------|----------|
| `htdemucs` | High | Medium | 4 | General use |
| `htdemucs_ft` | Highest | Slow | 4 | **Default** - Best quality |
| `htdemucs_6s` | High | Slow | 6 | 6-stem separation |
| `mdx_extra` | Medium | Fast | 4 | Quick processing |

## Quick Checks

```bash
# Docker running?
docker info

# Image built?
docker images | grep demucs

# Models downloaded?
ls -lh demucs/models/hub/checkpoints/

# Output generated?
ls -lh demucs/output/htdemucs_ft/

# Disk space?
df -h .
```

## Performance Tips

- **Use GPU** for 5-10x speedup: `gpu=true`
- **Reduce shifts** for faster processing: `shifts=1`
- **Reduce overlap** for speed: `overlap=0.1`
- **Use faster model** for quick tests: `model=mdx_extra`
- **Extract single stem** if that's all you need: `splittrack=vocals`

## Error Solutions

| Error | Solution |
|-------|----------|
| "No such file" | File must be in `demucs/input/` |
| "Docker not running" | Start Docker Desktop |
| "Out of memory" | Reduce `jobs` or use `gpu=true` |
| "Models re-download" | Check volume mount is working |
| "Build fails" | Run `make clean-docker` then `make build` |

## Scripts

```bash
./scripts/check-prerequisites.sh    # System check
./scripts/validate.sh               # Full test
./scripts/clean.sh --help           # Cleanup options
```

## Documentation

- **User Guide:** [README.md](README.md)
- **Development:** [DEVELOPMENT.md](DEVELOPMENT.md)
- **AI Agent Rules:** [.cursor/rules.md](.cursor/rules.md)
- **Scripts:** [scripts/README.md](scripts/README.md)
- **Server (future):** [server/README.md](server/README.md)

## Examples

```bash
# Basic - use defaults
make run track=song.mp3

# High quality - use GPU and fine-tuned model
make run track=song.mp3 model=htdemucs_ft gpu=true shifts=5

# Fast - quick processing
make run track=song.mp3 model=mdx_extra overlap=0.1

# Single stem - just extract vocals
make run track=song.mp3 splittrack=vocals

# WAV output - uncompressed audio
make run track=song.mp3 mp3output=false
```

## URLs

- [Demucs GitHub](https://github.com/adefossez/demucs)
- [Model Info](https://github.com/facebookresearch/demucs#separating-tracks)
- [Docker Docs](https://docs.docker.com/)

---

**Tip:** Run `make help` to see all available commands with descriptions.

