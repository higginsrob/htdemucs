# Server Testing Guide

This guide explains how to test the Demucs web server.

## Prerequisites

1. Build the CLI image first:
   ```bash
   make build
   ```

2. Have a test audio file ready (MP3, WAV, etc.)

## Testing Methods

### Method 1: Docker Container (Recommended)

**Build the server image:**
```bash
make server-build
```

**Run the server:**
```bash
# CPU mode
make server-run

# GPU mode (if you have NVIDIA GPU)
make server-run-gpu
```

**Access the UI:**
Open http://localhost:8080 in your browser

**Stop the server:**
```bash
make server-stop
# or press Ctrl+C if running interactively
```

---

### Method 2: Development Mode (Local Python)

**Setup virtual environment:**
```bash
cd server
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run the server:**
```bash
make server-dev
# or
cd server
python3 -m app.server
```

**Note:** In development mode, you need:
- Python 3.8+
- Demucs installed locally
- ffmpeg installed

---

### Method 3: API Testing with curl

**Upload a file:**
```bash
curl -X POST http://localhost:8080/api/upload \
  -F "audio_file=@/path/to/your/song.mp3" \
  -F "model=htdemucs_ft" \
  -F "output_format=mp3" \
  -F "stems=all"
```

Response:
```json
{
  "job_id": "uuid-here",
  "status": "queued",
  "created_at": "2025-10-26T...",
  "filename": "song.mp3",
  "model": "htdemucs_ft"
}
```

**Check status:**
```bash
curl http://localhost:8080/api/status/<job_id>
```

**Download results:**
```bash
curl -O http://localhost:8080/api/download/<job_id>
```

---

## Testing Checklist

### Basic Functionality

- [ ] Server starts without errors
- [ ] Web UI loads at http://localhost:8080
- [ ] Health check works: `curl http://localhost:8080/health`
- [ ] Info endpoint works: `curl http://localhost:8080/api/info`

### Upload Tests

- [ ] Valid MP3 file uploads successfully
- [ ] Valid WAV file uploads successfully
- [ ] Invalid file type is rejected (e.g., .txt)
- [ ] Large file (>100MB) is rejected
- [ ] Empty file is rejected

### Processing Tests

- [ ] Job status changes from "queued" to "processing"
- [ ] Progress updates appear in real-time (Socket.IO)
- [ ] Status API returns correct progress
- [ ] Job completes successfully
- [ ] All stems are generated (bass, drums, vocals, other)

### Download Tests

- [ ] Download endpoint returns ZIP file
- [ ] ZIP contains all expected stems
- [ ] Stems are valid audio files (playable)
- [ ] Downloaded files match the output format (MP3 or WAV)

### Model Tests

- [ ] htdemucs_ft model works
- [ ] htdemucs model works
- [ ] mdx_extra model works
- [ ] htdemucs_6s model works (6 stems)

### Stem Selection Tests

- [ ] "all" extracts all 4 stems
- [ ] "vocals" extracts only vocals
- [ ] "drums" extracts only drums
- [ ] "bass" extracts only bass
- [ ] "other" extracts only other

### Error Handling

- [ ] Invalid model name returns 400 error
- [ ] Invalid job_id returns 404 error
- [ ] Download before completion returns 400 error
- [ ] Processing errors are reported via Socket.IO
- [ ] Failed jobs show error message in UI

### Concurrent Jobs

- [ ] Multiple files can be uploaded simultaneously
- [ ] Each job gets unique job_id
- [ ] Jobs process independently
- [ ] Status updates don't interfere between jobs

### Cleanup

- [ ] Old jobs are cleaned up after retention period
- [ ] Downloaded jobs are removed after delay
- [ ] Disk space is freed properly

### Performance

- [ ] CPU processing completes (3min file in ~10-15min)
- [ ] GPU processing is faster (if available)
- [ ] Server remains responsive during processing
- [ ] Memory usage is reasonable

## Test Files

Use these types of audio files:

1. **Short clip** (30 seconds) - for quick testing
2. **Medium song** (3 minutes) - for realistic testing
3. **Large file** (>10 minutes) - for stress testing
4. **Different formats** - MP3, WAV, FLAC, M4A

## Troubleshooting Tests

**Server won't start:**
```bash
# Check if port 8080 is in use
lsof -i :8080

# Check Docker logs
docker logs demucs-server
```

**Processing fails:**
```bash
# Check demucs is working
docker exec -it demucs-server python3 -m demucs --help

# Check file permissions
docker exec -it demucs-server ls -la /tmp/demucs-jobs/
```

**Socket.IO not connecting:**
```bash
# Check browser console for errors
# Open Developer Tools → Console

# Test WebSocket directly
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:8080/socket.io/
```

## Automated Testing (Future)

To add automated tests, create `server/tests/`:

```bash
server/tests/
├── test_upload.py      # Test upload endpoint
├── test_processing.py  # Test demucs processing
├── test_download.py    # Test download endpoint
└── test_websocket.py   # Test Socket.IO events
```

Run tests:
```bash
cd server
pytest tests/ -v
```

## Load Testing

For production readiness, test with multiple concurrent users:

```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # Ubuntu
brew install httpd  # macOS

# Test with 10 concurrent connections
ab -n 100 -c 10 http://localhost:8080/

# Or use wrk
wrk -t10 -c100 -d30s http://localhost:8080/
```

## Monitoring

During testing, monitor:

```bash
# Server logs
make server-logs

# Container stats
docker stats demucs-server

# Disk usage
du -sh /tmp/demucs-jobs/

# Port availability
netstat -an | grep 8080
```

## Test Results Template

Document your test results:

```markdown
## Test Results - [Date]

**Environment:**
- OS: macOS 13.5
- Docker: 24.0.5
- CPU: Apple M1
- GPU: None

**Tests Passed:** 15/18
**Tests Failed:** 3/18

### Passed
- ✅ Upload MP3
- ✅ Processing completes
- ✅ Download ZIP
- ...

### Failed
- ❌ Large file upload (timeout)
- ❌ GPU mode (no GPU available)
- ❌ 6-stem model (not tested)

### Notes
- Processing took 12 minutes for 3-minute MP3
- Memory usage peaked at 2GB
- No errors in logs
```

## Next Steps

After successful testing:

1. Update documentation with any findings
2. Add any discovered issues to TROUBLESHOOTING.md
3. Consider adding automated tests
4. Deploy to production environment
5. Set up monitoring and alerts

---

**For issues:** Check main [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

