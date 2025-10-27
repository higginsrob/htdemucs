# GitHub Actions - Docker Hub Integration Complete

## Summary

Your repository is now configured with **automated Docker builds** that publish to Docker Hub at `higginsrob/htdemucs`.

## What Was Added

### 1. GitHub Actions Workflow
**File**: `.github/workflows/docker-build.yml`

This workflow:
- ✅ Builds two Docker images (base + server)
- ✅ Pushes to Docker Hub on every commit to `main`
- ✅ Creates versioned releases on git tags
- ✅ Tests builds on pull requests (without pushing)
- ✅ Uses layer caching for faster builds
- ✅ Updates Docker Hub repository description

### 2. Updated Server Dockerfile
**File**: `server/Dockerfile`

Changed to use your own base image:
```dockerfile
ARG BASE_IMAGE=higginsrob/htdemucs:demucs
FROM ${BASE_IMAGE}
```

### 3. Documentation
Created comprehensive docs:
- **`.github/workflows/README.md`** - Complete workflow documentation
- **`.github/SETUP.md`** - Step-by-step setup guide
- **Updated `README.md`** - Added Docker Hub section and badges

## Images Published

### Server Image (Main Image)
```bash
docker pull higginsrob/htdemucs:latest
```

**Tags created**:
- `latest` - Latest from main branch
- `server` - Alias for latest
- `main` - Tracking main branch
- `sha-<commit>` - Commit-specific
- `v1.0.0` - Version tags (when you create releases)

### Base Image (Demucs CLI)
```bash
docker pull higginsrob/htdemucs:demucs
```

**Tags created**:
- `demucs` - Latest base image
- `demucs-latest` - Alias
- `main-demucs` - Tracking main
- `v1.0.0-demucs` - Version tags

## Next Steps to Activate

### Required Setup (One-Time)

1. **Create Docker Hub Repository**
   - Name: `htdemucs`
   - Owner: `higginsrob`
   - URL: https://hub.docker.com/r/higginsrob/htdemucs

2. **Create Docker Hub Access Token**
   - Go to: https://hub.docker.com/settings/security
   - Create new token with Read/Write/Delete permissions
   - Save it securely (you'll only see it once)

3. **Add GitHub Secrets**
   - Go to: Repository → Settings → Secrets → Actions
   - Add `DOCKERHUB_USERNAME` = `higginsrob`
   - Add `DOCKERHUB_TOKEN` = (paste your token)

4. **Trigger First Build**
   - Option A: Push these changes to `main`
   - Option B: Go to Actions tab → Run workflow manually

📖 **Detailed instructions**: See `.github/SETUP.md`

## How to Use

### Pull and Run (Once Published)

```bash
# Basic usage
docker run -d --rm \
  --name htdemucs \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest

# With GPU
docker run -d --rm \
  --name htdemucs \
  --gpus all \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest

# Open browser
open http://localhost:8080
```

### Create Versioned Release

```bash
# Tag and push
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This creates:
# - higginsrob/htdemucs:v1.0.0
# - higginsrob/htdemucs:v1.0
# - higginsrob/htdemucs:v1
# - higginsrob/htdemucs:v1.0.0-demucs
```

## Build Triggers

The workflow runs automatically on:

| Trigger | Action | Pushes to Docker Hub? |
|---------|--------|----------------------|
| Push to `main` | Build both images | ✅ Yes |
| Create tag `v*` | Build with version tags | ✅ Yes |
| Pull request | Build only (test) | ❌ No |
| Manual trigger | Build from any branch | ✅ Yes |

## Build Process

When triggered, the workflow:

1. **Checkout code** from repository
2. **Setup Docker Buildx** (advanced builder)
3. **Login to Docker Hub** (using secrets)
4. **Build demucs base image**
   - From: `demucs/Dockerfile`
   - Push as: `higginsrob/htdemucs:demucs`
   - Time: ~10 minutes
5. **Build server image**
   - From: `server/Dockerfile`
   - Uses: Base image from step 4
   - Push as: `higginsrob/htdemucs:latest`
   - Time: ~5 minutes
6. **Update repository description**
   - Syncs README.md to Docker Hub

**Total time**: ~15-20 minutes per build

## Features

### ✅ Layer Caching
Uses registry caching to speed up subsequent builds. Second builds take ~5-10 minutes.

### ✅ Multi-Tagging
Automatically creates multiple tags for easy versioning and access.

### ✅ Semantic Versioning
Tag with `v1.2.3` creates:
- `v1.2.3` (full version)
- `v1.2` (minor version)
- `v1` (major version)

### ✅ PR Testing
Pull requests build but don't push - safe testing before merge.

### ✅ Commit Tracking
Every build tagged with `sha-<commit>` for reproducibility.

## Monitoring

### View Build Status
- **Actions tab**: https://github.com/higginsrob/demucs/actions
- **README badges**: Shows current build status

### Check Docker Hub
- **Repository**: https://hub.docker.com/r/higginsrob/htdemucs
- **Tags**: https://hub.docker.com/r/higginsrob/htdemucs/tags

## Benefits

### For Users
- ✅ **Fast setup** - Just `docker pull` and run
- ✅ **Always updated** - Automatic builds on every change
- ✅ **Version control** - Pin to specific versions
- ✅ **No build time** - Pre-built images ready to use

### For Developers
- ✅ **Automated** - No manual docker builds
- ✅ **Reproducible** - Every commit has an image
- ✅ **Tested** - PRs tested before merge
- ✅ **Professional** - Industry-standard CI/CD

## File Summary

```
.github/
├── workflows/
│   ├── docker-build.yml    # Main workflow file
│   └── README.md            # Workflow documentation
└── SETUP.md                 # Setup instructions

server/
└── Dockerfile               # Updated to use higginsrob/htdemucs:demucs

README.md                    # Updated with Docker Hub info and badges
GITHUB_ACTIONS_SETUP.md      # This file
```

## Commands Reference

```bash
# Pull images
docker pull higginsrob/htdemucs:latest        # Server
docker pull higginsrob/htdemucs:demucs        # Base
docker pull higginsrob/htdemucs:v1.0.0       # Specific version

# Run server
docker run -d --rm --name htdemucs -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest

# Stop server
docker stop htdemucs

# View logs
docker logs htdemucs

# Tag and release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

## Troubleshooting

### Build fails
- Check Actions tab for error logs
- Verify secrets are set correctly
- Ensure Docker Hub repository exists

### Images not appearing
- Wait 2-3 minutes after build completes
- Check Docker Hub tags page
- Verify workflow shows green checkmark

### Permission denied
- Regenerate Docker Hub token
- Ensure token has write permissions
- Check username matches repository owner

## Documentation Links

- **Setup Guide**: `.github/SETUP.md`
- **Workflow Docs**: `.github/workflows/README.md`
- **Main README**: `README.md`
- **GitHub Actions**: https://docs.github.com/en/actions
- **Docker Hub**: https://docs.docker.com/docker-hub/

---

🎉 **Your automated Docker build pipeline is ready!**

Complete the setup steps in `.github/SETUP.md` to start building.

