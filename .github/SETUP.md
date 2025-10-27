# GitHub Actions Setup Guide

Quick guide to setting up automated Docker builds to Docker Hub.

## Step 1: Create Docker Hub Repository

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Click **Create Repository**
3. Set repository name: `htdemucs`
4. Choose visibility: Public (recommended) or Private
5. Click **Create**

Your repository will be at: `https://hub.docker.com/r/higginsrob/htdemucs`

## Step 2: Create Docker Hub Access Token

1. Go to [Docker Hub Account Settings](https://hub.docker.com/settings/security)
2. Click **New Access Token**
3. Configure the token:
   - **Description**: `GitHub Actions - htdemucs`
   - **Access permissions**: Read, Write, Delete
4. Click **Generate**
5. **Copy the token immediately** (you won't see it again!)

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add two secrets:

### Secret 1: DOCKERHUB_USERNAME
- **Name**: `DOCKERHUB_USERNAME`
- **Value**: `higginsrob`
- Click **Add secret**

### Secret 2: DOCKERHUB_TOKEN
- **Name**: `DOCKERHUB_TOKEN`
- **Value**: Paste the access token you copied in Step 2
- Click **Add secret**

## Step 4: Verify Setup

### Check Secrets
Go to **Settings** → **Secrets and variables** → **Actions**

You should see:
- ✅ DOCKERHUB_USERNAME
- ✅ DOCKERHUB_TOKEN

### Trigger First Build

Option A: Push to main branch
```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

Option B: Manual trigger
1. Go to **Actions** tab
2. Click **Build and Push Docker Images**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### Monitor Build

1. Go to **Actions** tab
2. Click on the running workflow
3. Watch the build progress
4. Build takes ~10-15 minutes for first run
5. Check for ✅ green checkmark when complete

## Step 5: Verify Images on Docker Hub

1. Go to [Docker Hub Repository](https://hub.docker.com/r/higginsrob/htdemucs)
2. Click **Tags** tab
3. You should see:
   - `latest` - Latest server image
   - `server` - Server alias
   - `demucs` - Base Demucs image
   - `demucs-latest` - Base image alias
   - `main` - Latest from main branch
   - `sha-xxxxxxx` - Commit-specific builds

## Step 6: Test Pull

Test that the images are publicly accessible:

```bash
# Pull the server image
docker pull higginsrob/htdemucs:latest

# Pull the base image
docker pull higginsrob/htdemucs:demucs

# Run the server
docker run -d --rm \
  --name htdemucs \
  -p 8080:8080 \
  -v $(pwd)/output:/app/output \
  -v $(pwd)/models:/data/models \
  higginsrob/htdemucs:latest

# Check it's running
curl http://localhost:8080/health

# Clean up
docker stop htdemucs
```

## Creating Versioned Releases

To create a versioned release:

```bash
# Tag the commit
git tag -a v1.0.0 -m "Release v1.0.0"

# Push the tag
git push origin v1.0.0
```

This will automatically build and push images with tags:
- `higginsrob/htdemucs:v1.0.0`
- `higginsrob/htdemucs:v1.0`
- `higginsrob/htdemucs:v1`
- `higginsrob/htdemucs:v1.0.0-demucs` (base image)

## Troubleshooting

### Build fails with "authentication required"
- Check that DOCKERHUB_TOKEN has write permissions
- Try regenerating the token in Docker Hub
- Ensure token is copied correctly (no extra spaces)

### Build succeeds but images don't appear
- Check repository name is exactly `htdemucs`
- Verify username is `higginsrob`
- Wait a few minutes for Docker Hub to index

### Permission denied on Docker Hub
- Ensure token has "Write" permissions
- Check that repository exists and is accessible
- Verify username matches the repository owner

### Workflow not triggering
- Check `.github/workflows/docker-build.yml` exists
- Verify it's on the `main` branch
- Check GitHub Actions is enabled in repository settings

## What Happens on Each Push?

When you push to `main`:
1. GitHub Actions workflow triggers
2. Builds `demucs` base image (~10 min)
3. Pushes to `higginsrob/htdemucs:demucs`
4. Builds `server` image using the base (~5 min)
5. Pushes to `higginsrob/htdemucs:latest`
6. Updates Docker Hub description from README.md
7. All images tagged with commit SHA

Total time: ~15-20 minutes per build

## Security Notes

- Never commit the Docker Hub token to your repository
- Use repository secrets for all sensitive data
- Access tokens can be revoked anytime from Docker Hub
- Consider using separate tokens for different projects

## Next Steps

- Add branch protection to `main`
- Set up pull request builds (won't push, just test)
- Add multi-platform builds (linux/amd64, linux/arm64)
- Set up automated testing before docker push

## Support

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Workflow File](.github/workflows/docker-build.yml)
- [Full Workflow README](.github/workflows/README.md)

