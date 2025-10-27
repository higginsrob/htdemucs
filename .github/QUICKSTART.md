# Quick Start - GitHub Actions + Docker Hub

## 3-Minute Setup

### 1. Docker Hub (2 minutes)

```bash
# 1. Go to https://hub.docker.com/
# 2. Create repository: "htdemucs"
# 3. Go to Settings → Security
# 4. Create "New Access Token"
#    - Name: "GitHub Actions"
#    - Permissions: Read, Write, Delete
# 5. Copy the token
```

### 2. GitHub Secrets (1 minute)

```bash
# 1. Go to your repo on GitHub
# 2. Settings → Secrets and variables → Actions
# 3. New repository secret → "DOCKERHUB_USERNAME" → "higginsrob"
# 4. New repository secret → "DOCKERHUB_TOKEN" → (paste token)
```

### 3. Trigger Build

```bash
# Push to main (automatic)
git add .
git commit -m "Add GitHub Actions"
git push origin main

# OR trigger manually
# Go to Actions tab → Build and Push Docker Images → Run workflow
```

### 4. Wait (~15 mins)
Check progress: **Actions tab** on GitHub

### 5. Done! 🎉

```bash
# Pull and run your image
docker pull higginsrob/htdemucs:latest

docker run -d --rm \
  --name htdemucs \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest

# Open http://localhost:8080
```

## Images You Get

| Image | Tag | Purpose |
|-------|-----|---------|
| Server | `higginsrob/htdemucs:latest` | Web interface (main) |
| Server | `higginsrob/htdemucs:server` | Alias for latest |
| Base | `higginsrob/htdemucs:demucs` | CLI only |
| Versioned | `higginsrob/htdemucs:v1.0.0` | Tagged releases |

## What Gets Built Automatically?

- ✅ Every push to `main` → builds `latest` + `demucs`
- ✅ Every git tag `v*` → builds with version
- ✅ Pull requests → test build (no push)

## Create a Release

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
# Creates: v1.0.0, v1.0, v1
```

## Verify It Works

```bash
# Check Docker Hub
open https://hub.docker.com/r/higginsrob/htdemucs/tags

# Test pull
docker pull higginsrob/htdemucs:latest

# Test run
docker run --rm higginsrob/htdemucs:latest python3 --version
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails - auth error | Re-check secrets: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN |
| Images don't appear | Wait 2-3 min, refresh Docker Hub |
| Workflow not running | Check .github/workflows/docker-build.yml exists on main |
| Permission denied | Regenerate token with write permissions |

## Next Steps

- 📘 Full setup: `.github/SETUP.md`
- 📖 Workflow docs: `.github/workflows/README.md`
- 📋 Complete guide: `GITHUB_ACTIONS_SETUP.md`

---

**That's it!** Your automated Docker pipeline is ready. 🚀

