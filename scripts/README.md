# Development Scripts

This directory contains helper scripts for developing and testing the Demucs project.

## Available Scripts

### check-prerequisites.sh

**Purpose:** Check if your system has all the required tools and configurations

**Usage:**
```bash
./scripts/check-prerequisites.sh
```

**What it checks:**
- Docker installation and daemon status
- Make installation
- NVIDIA GPU availability and Docker GPU support
- Available disk space
- Directory structure
- Test audio file existence
- Docker image status

**When to use:**
- First time setting up the project
- Troubleshooting build/run issues
- Before starting development work

---

### validate.sh

**Purpose:** Run a complete end-to-end test of the demucs CLI workflow

**Usage:**
```bash
./scripts/validate.sh
```

**What it does:**
1. Checks if Docker is running
2. Verifies test audio file exists
3. Builds Docker image if needed
4. Cleans previous test outputs
5. Runs demucs on test.mp3
6. Verifies all 4 output stems are generated

**When to use:**
- After making changes to Dockerfile
- After updating dependencies
- Before committing changes
- To ensure everything works end-to-end

---

### clean.sh

**Purpose:** Remove temporary files, outputs, models, or Docker images

**Usage:**
```bash
./scripts/clean.sh [options]
```

**Options:**
- `--outputs` - Remove all output files (frees MBs)
- `--models` - Remove downloaded models (frees GBs, will re-download)
- `--docker` - Remove Docker image (frees GBs, will rebuild)
- `--all` - Clean everything
- `--help` - Show help message

**Examples:**
```bash
# Clean only outputs (safe, fast)
./scripts/clean.sh --outputs

# Clean outputs and models
./scripts/clean.sh --outputs --models

# Nuclear option: clean everything
./scripts/clean.sh --all
```

**When to use:**
- Before running fresh tests
- To free up disk space
- When switching between different setups
- To force re-download of models

---

## Makefile Integration

All scripts are integrated into the Makefile for convenience:

```bash
make check          # Run check-prerequisites.sh
make validate       # Run validate.sh
make clean-outputs  # Run clean.sh --outputs
make clean-models   # Run clean.sh --models
make clean-docker   # Run clean.sh --docker
make clean-all      # Run clean.sh --all
```

## Adding New Scripts

When adding new development scripts:

1. Create the script in this directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Add usage documentation here
4. Add a Makefile target if appropriate
5. Update `.cursor/rules.md` if it affects agent workflows

## Script Guidelines

- Use `set -e` to exit on errors
- Use colored output for better UX (RED, GREEN, YELLOW, NC)
- Provide clear success/failure messages
- Include `--help` option for complex scripts
- Handle missing files/directories gracefully
- Show progress for long-running operations

