# Troubleshooting Guide

This guide covers common issues and their solutions when working with Demucs Docker.

## Quick Diagnostics

Run this first to identify issues:
```bash
make check
```

## Docker Issues

### Docker Not Running

**Symptoms:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start (check status bar)
3. Verify: `docker info`

---

### Docker Build Fails

**Symptoms:**
```
Error during build: [various errors]
```

**Solutions:**

**1. Network/Download Issues:**
```bash
# Retry with no cache
cd demucs
docker build --no-cache -t xserrat/facebook-demucs:latest .
```

**2. Disk Space:**
```bash
# Check available space
df -h

# Clean up Docker
docker system prune -a

# Clean up project files
make clean-all
```

**3. Platform Issues (ARM64/Apple Silicon):**
```bash
# Build for x86-64 (slower via emulation)
cd demucs
docker build --platform linux/amd64 -t xserrat/facebook-demucs:latest .
```

---

### Image Size Too Large

**Symptoms:**
Docker image is larger than expected (>2GB)

**Solution:**
This is normal. The image includes:
- CUDA libraries (~800MB)
- Python + dependencies (~500MB)
- Demucs + models (~200MB)

To reduce size:
- Models are stored in volumes, not in the image
- Outputs are stored in volumes, not in the image

---

## Runtime Issues

### "No such file or directory" - Input File

**Symptoms:**
```
Error: /data/input/mysong.mp3: No such file or directory
```

**Solution:**
File must be in the correct location:
```bash
# Copy file to input directory
cp ~/Music/mysong.mp3 demucs/input/

# Run with just the filename
make run track=mysong.mp3
```

---

### Models Re-download Every Time

**Symptoms:**
Models download on every run instead of caching

**Solution:**

**1. Check volume mount:**
```bash
# Inspect running container
docker inspect demucs | grep Mounts -A 20

# Should show: /path/to/demucs/models:/data/models
```

**2. Check directory permissions:**
```bash
ls -ld demucs/models/
# Should be writable by current user
```

**3. Rebuild and run:**
```bash
make clean-docker
make build
make run track=test.mp3
```

---

### Out of Memory

**Symptoms:**
```
RuntimeError: CUDA out of memory
# or
Killed (process terminated)
```

**Solutions:**

**1. For CPU mode (macOS/Linux):**
```bash
# Reduce parallel jobs
make run track=mysong.mp3 jobs=1

# Reduce shifts
make run track=mysong.mp3 shifts=1
```

**2. For GPU mode:**
```bash
# Enable GPU to free up system RAM
make run track=mysong.mp3 gpu=true

# Also reduce batch size via shifts
make run track=mysong.mp3 gpu=true shifts=1
```

**3. System-wide:**
- Close other applications
- Use shorter audio clips for testing
- Increase Docker memory limit (Docker Desktop → Settings → Resources)

---

### Processing Takes Forever

**Symptoms:**
Processing is extremely slow or appears hung

**Solutions:**

**1. Enable GPU (if available):**
```bash
make run track=mysong.mp3 gpu=true
# 5-10x faster than CPU
```

**2. Use faster model:**
```bash
make run track=mysong.mp3 model=mdx_extra
```

**3. Reduce quality for testing:**
```bash
make run track=mysong.mp3 shifts=1 overlap=0.1
```

**4. Check if actually running:**
```bash
# In another terminal
docker stats demucs

# Should show CPU/memory usage
```

**5. Extract single stem only:**
```bash
make run track=mysong.mp3 splittrack=vocals
# Faster than separating all 4 stems
```

---

### Invalid or Corrupted Output

**Symptoms:**
- Output files exist but won't play
- Files are 0 bytes
- Audio sounds wrong

**Solutions:**

**1. Check input file:**
```bash
# Verify input is valid audio
ffprobe demucs/input/mysong.mp3
```

**2. Clean and re-run:**
```bash
make clean-outputs
make run track=mysong.mp3
```

**3. Try WAV output:**
```bash
make run track=mysong.mp3 mp3output=false
```

**4. Check Docker logs:**
```bash
docker logs demucs
```

---

## GPU Issues

### GPU Not Detected

**Symptoms:**
```
CUDA not available, using CPU
```

**Solutions:**

**1. Check GPU is available:**
```bash
# NVIDIA GPUs (Linux)
nvidia-smi

# Should show GPU info
```

**2. Check Docker GPU support:**
```bash
docker run --rm --gpus all nvidia/cuda:12.6.2-base-ubuntu22.04 nvidia-smi

# Should show GPU info inside container
```

**3. Install NVIDIA Container Toolkit (Linux):**
```bash
# Ubuntu/Debian
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**4. Enable GPU in Docker Desktop (Windows):**
- Docker Desktop → Settings → Resources → Enable GPU

**Note:** macOS does not support NVIDIA CUDA in Docker

---

### CUDA Version Mismatch

**Symptoms:**
```
CUDA error: device-side assert triggered
```

**Solution:**
The base image uses CUDA 12.6. If your GPU drivers don't support it:

```bash
# Check your CUDA version
nvidia-smi

# If lower than 12.6, edit demucs/Dockerfile
# Change line 2 to compatible version:
FROM nvidia/cuda:11.8.0-base-ubuntu22.04

# Then rebuild
make build
```

---

## File Format Issues

### Unsupported Audio Format

**Symptoms:**
```
Error: Could not open file
```

**Supported Formats:**
- MP3 ✅
- WAV ✅
- FLAC ✅
- M4A ✅
- OGG ✅

**Solution for Other Formats:**
Convert to supported format first:

```bash
# Using ffmpeg (install if needed: brew install ffmpeg)
ffmpeg -i input.wma -c:a libmp3lame output.mp3
cp output.mp3 demucs/input/
make run track=output.mp3
```

---

### High Sample Rate Issues

**Symptoms:**
Processing fails or produces poor results with 96kHz+ audio

**Solution:**
```bash
# Downsample to 44.1kHz or 48kHz first
ffmpeg -i input.mp3 -ar 44100 output.mp3
make run track=output.mp3
```

---

## Makefile Issues

### "make: command not found"

**Symptoms:**
```
bash: make: command not found
```

**Solution:**

**macOS:**
```bash
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential
```

**Windows (WSL):**
```bash
sudo apt-get install make
```

---

### "No rule to make target"

**Symptoms:**
```
make: *** No rule to make target 'run'. Stop.
```

**Solution:**
Make sure you're in the project root directory:
```bash
cd /path/to/demucs
make run track=test.mp3
```

---

## Permission Issues

### Cannot Write to Output Directory

**Symptoms:**
```
Permission denied: '/data/output/...'
```

**Solution:**
```bash
# Fix permissions
chmod -R 755 demucs/output
chmod -R 755 demucs/models

# Or reset ownership
sudo chown -R $(whoami) demucs/
```

---

### Docker Socket Permission Denied (Linux)

**Symptoms:**
```
permission denied while trying to connect to Docker daemon
```

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, or:
newgrp docker

# Verify
docker ps
```

---

## Performance Issues

### Very Slow on CPU

**Expected Performance:**
- 3-minute song: ~10-15 minutes on CPU
- 3-minute song: ~1-2 minutes on GPU

**Optimizations:**
```bash
# Use fastest model
make run track=song.mp3 model=mdx_extra

# Minimum quality settings
make run track=song.mp3 \
  shifts=1 \
  overlap=0.1 \
  model=mdx_extra
```

---

### Docker Desktop Using Too Much RAM

**Solution:**
1. Docker Desktop → Settings → Resources
2. Reduce "Memory" allocation
3. Trade-off: Demucs will be slower
4. Alternative: Close other applications during processing

---

## Model Issues

### Model Download Fails

**Symptoms:**
```
Error downloading model
HTTPError 404
```

**Solutions:**

**1. Check internet connection:**
```bash
curl -I https://dl.fbaipublicfiles.com
```

**2. Try manual download:**
```bash
# Download model manually
wget https://dl.fbaipublicfiles.com/demucs/hybrid_transformer/[model-file] \
  -P demucs/models/hub/checkpoints/
```

**3. Use different model:**
```bash
# Try alternative model
make run track=test.mp3 model=htdemucs
```

---

### Wrong Model Downloaded

**Symptoms:**
Different model than expected is used

**Solution:**
```bash
# Clear model cache
make clean-models

# Re-run with specific model
make run track=test.mp3 model=htdemucs_ft
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Run interactively to see all output
make run-interactive

# Inside container:
python3 -m demucs -n htdemucs_ft -v /data/input/test.mp3
```

---

### Inspect Container While Running

```bash
# Terminal 1: Run demucs
make run track=test.mp3

# Terminal 2: Connect to running container
docker exec -it demucs /bin/bash

# Inside container, check:
ls /data/input/
ls /data/output/
ps aux | grep demucs
```

---

### Check Logs

```bash
# Docker logs
docker logs demucs

# System logs (Linux)
journalctl -u docker

# Docker Desktop logs (macOS)
~/Library/Containers/com.docker.docker/Data/log/
```

---

### Test with Known Good File

```bash
# Use the test file that's included
make run track=test.mp3

# Should complete without errors
```

---

## Platform-Specific Issues

### macOS Apple Silicon (M1/M2/M3)

**Issue:** Slower performance due to emulation

**Solution:**
- This is expected (x86-64 emulation)
- Native ARM image not available due to CUDA dependency
- Consider using cloud GPU for large workloads

---

### Windows WSL

**Issue:** Volume mounts not working

**Solution:**
```bash
# Use WSL paths, not Windows paths
cd /mnt/c/Users/YourName/demucs  # ✗ Wrong
cd ~/demucs  # ✓ Correct

# Or ensure you're in WSL filesystem
pwd
# Should show: /home/username/...
```

---

### Linux with SELinux

**Issue:** Permission denied on volume mounts

**Solution:**
```bash
# Add :z flag to volumes in Makefile
-v $(current-dir)demucs/input:/data/input:z
```

---

## Getting More Help

If you're still stuck after trying the above:

1. **Run diagnostics:**
   ```bash
   make check
   ```

2. **Collect information:**
   ```bash
   # System info
   uname -a
   docker version
   docker info
   
   # Project state
   ls -la demucs/input/
   ls -la demucs/output/
   ls -la demucs/models/
   
   # Docker logs
   docker logs demucs
   ```

3. **Try minimal reproduction:**
   ```bash
   make clean-all
   make build
   make validate
   ```

4. **Search documentation:**
   - `.cursor/rules.md` - Project guidelines
   - `DEVELOPMENT.md` - Development guide
   - `QUICKREF.md` - Quick reference
   - [Demucs GitHub Issues](https://github.com/adefossez/demucs/issues)

5. **File an issue:**
   - Use `.github/ISSUE_TEMPLATE/bug_report.md`
   - Include output from step 2
   - Describe what you tried from this guide

---

## Prevention

To avoid issues in the future:

- ✅ Run `make check` before starting work
- ✅ Use `make validate` after changes
- ✅ Keep Docker Desktop updated
- ✅ Don't modify files in output/models directly
- ✅ Use provided Makefile targets instead of raw docker commands
- ✅ Test with short audio clips first
- ✅ Keep backups of important input files
- ✅ Monitor disk space regularly

---

**Last Updated:** 2025-10-26  
**For Latest Version:** Check the [repository](https://github.com/yourusername/demucs)

