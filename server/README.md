# Demucs Web Server (Production)

**Status:** 🚧 Not Yet Implemented

This directory will contain a production-friendly web server for Demucs audio separation.

## Goals

Replace the CLI volume-based workflow with a self-contained web service that:
- Accepts audio file uploads via HTTP
- Processes audio using Demucs
- Provides real-time progress updates via Socket.IO
- Returns processed stems as a zip file
- Includes a web UI for easy testing

## Planned Architecture

```
server/
├── Dockerfile              # Extends demucs image, adds web server
├── requirements.txt        # Python dependencies
├── app/
│   ├── __init__.py
│   ├── server.py          # Main Flask/FastAPI application
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── upload.py      # POST /api/upload
│   │   ├── status.py      # GET /api/status/:job_id
│   │   └── download.py    # GET /api/download/:job_id
│   ├── services/
│   │   ├── __init__.py
│   │   ├── demucs_processor.py  # Demucs processing logic
│   │   ├── job_queue.py         # Job queue management
│   │   └── file_manager.py      # Temp file cleanup
│   └── utils/
│       ├── __init__.py
│       ├── progress.py    # Socket.IO progress tracking
│       └── validation.py  # File validation
├── static/                # Web UI assets
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
└── tests/                 # Unit and integration tests
    ├── test_upload.py
    ├── test_processing.py
    └── test_download.py
```

## API Design

### Upload Audio File

```http
POST /api/upload
Content-Type: multipart/form-data

Body:
  - audio_file: File (mp3/wav/flac)
  - model: String (optional, default: htdemucs_ft)
  - format: String (optional, default: mp3, options: mp3/wav)
  - stems: String (optional, default: all, options: all/bass/drums/vocals/other)

Response:
{
  "job_id": "uuid-string",
  "status": "queued",
  "created_at": "2025-10-26T10:30:00Z"
}
```

### Check Job Status

```http
GET /api/status/:job_id

Response:
{
  "job_id": "uuid-string",
  "status": "processing",  // queued, processing, completed, failed
  "progress": 45,           // 0-100
  "created_at": "2025-10-26T10:30:00Z",
  "started_at": "2025-10-26T10:30:15Z",
  "estimated_completion": "2025-10-26T10:32:00Z"
}
```

### Download Results

```http
GET /api/download/:job_id

Response:
  - Content-Type: application/zip
  - Content-Disposition: attachment; filename="stems_<job_id>.zip"
  - Body: ZIP file containing separated stems
```

### Socket.IO Events

```javascript
// Client connects
socket.connect('/progress');

// Client subscribes to job updates
socket.emit('subscribe', { job_id: 'uuid-string' });

// Server sends progress updates
socket.on('progress', (data) => {
  // data: { job_id, status, progress, message }
});

// Server sends completion
socket.on('completed', (data) => {
  // data: { job_id, download_url }
});

// Server sends error
socket.on('error', (data) => {
  // data: { job_id, error_message }
});
```

## Technical Stack

### Framework Options

**Option 1: Flask + Flask-SocketIO (Recommended)**
- Simple, well-documented
- Good Socket.IO support
- Easy to deploy

**Option 2: FastAPI + python-socketio**
- Modern, async
- Auto-generated API docs
- Better performance for concurrent requests

### Dependencies

```txt
# Core
flask==3.0.0 or fastapi==0.104.0
flask-socketio==5.3.5 or python-socketio==5.10.0
python-engineio==4.8.0

# File handling
werkzeug==3.0.1

# Job queue
redis==5.0.1  # For job queue and session storage
celery==5.3.4  # Optional: for background processing

# Utilities
python-dotenv==1.0.0
pydantic==2.5.0  # For request validation
```

## Implementation Guidelines

### 1. File Upload

- Validate file type (mp3, wav, flac, m4a)
- Validate file size (max 100MB recommended)
- Generate unique job_id (UUID4)
- Store file temporarily: `/tmp/demucs-jobs/{job_id}/input/`
- Return job_id immediately

### 2. Processing

- Use threading or Celery for background processing
- Run demucs command: `python3 -m demucs -n {model} --out /tmp/demucs-jobs/{job_id}/output/ {input_file}`
- Capture stdout for progress tracking
- Parse progress percentage from demucs output
- Emit progress via Socket.IO

### 3. Progress Tracking

- Demucs outputs progress to stdout
- Parse lines like: "Processing: 45%"
- Emit Socket.IO event: `{ job_id, status: "processing", progress: 45 }`
- Update every 5% or every 5 seconds

### 4. Cleanup

- After download or 1 hour timeout, delete job files
- Use a background task to clean up old jobs
- Log cleanup operations

### 5. Error Handling

- Invalid file format → 400 Bad Request
- File too large → 413 Payload Too Large
- Processing error → Emit Socket.IO error event
- Job not found → 404 Not Found

## Dockerfile Template

```dockerfile
FROM xserrat/facebook-demucs:latest

# Install web server dependencies
RUN apt update && apt install -y --no-install-recommends \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# Copy server code
COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install -r /app/requirements.txt --no-cache-dir

COPY app/ /app/
COPY static/ /app/static/

WORKDIR /app

# Expose port
EXPOSE 8080

# Run server
CMD ["python3", "server.py"]
```

## Development Workflow

1. **Setup**
   ```bash
   cd server
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run locally (without Docker)**
   ```bash
   python app/server.py
   ```

3. **Build Docker image**
   ```bash
   make server-build  # Add this target to Makefile
   ```

4. **Run Docker container**
   ```bash
   make server-run  # Add this target to Makefile
   ```

5. **Test**
   ```bash
   # Upload file
   curl -X POST -F "audio_file=@test.mp3" http://localhost:8080/api/upload
   
   # Check status
   curl http://localhost:8080/api/status/<job_id>
   
   # Download
   curl -O http://localhost:8080/api/download/<job_id>
   ```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Upload endpoint accepts valid files
- [ ] Upload endpoint rejects invalid files
- [ ] Upload endpoint rejects oversized files
- [ ] Processing starts automatically after upload
- [ ] Socket.IO emits progress events (0-100%)
- [ ] Status endpoint returns correct state
- [ ] Download endpoint returns valid zip
- [ ] Zip contains all requested stems
- [ ] Files are cleaned up after download
- [ ] Files are cleaned up after timeout
- [ ] Multiple concurrent jobs work
- [ ] GPU mode works (if available)
- [ ] CPU mode works

## Makefile Targets

Add these to the main Makefile:

```makefile
.PHONY:
.SILENT:
server-build: ## Build the production web server image
	@cd server && docker build -t demucs-server:latest .

.PHONY:
.SILENT:
server-run: ## Run the production web server
	docker run --rm -it \
		--name=demucs-server \
		-p 8080:8080 \
		demucs-server:latest

.PHONY:
.SILENT:
server-dev: ## Run the server in development mode with hot reload
	@cd server && python3 app/server.py --debug
```

## Frontend UI

Simple single-page application:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Demucs - Audio Stem Separator</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Demucs Audio Separator</h1>
  
  <form id="upload-form">
    <input type="file" id="audio-file" accept=".mp3,.wav,.flac" required>
    <select id="model">
      <option value="htdemucs_ft">High Quality (htdemucs_ft)</option>
      <option value="htdemucs">Standard (htdemucs)</option>
      <option value="htdemucs_6s">6 Stems</option>
    </select>
    <button type="submit">Separate Stems</button>
  </form>
  
  <div id="progress" style="display:none;">
    <h2>Processing...</h2>
    <progress id="progress-bar" value="0" max="100"></progress>
    <span id="progress-text">0%</span>
  </div>
  
  <div id="result" style="display:none;">
    <h2>Complete!</h2>
    <button id="download-btn">Download Stems</button>
  </div>
  
  <script src="js/app.js"></script>
</body>
</html>
```

## Security Considerations

- [ ] Validate file types (magic bytes, not just extension)
- [ ] Limit file size (prevent DoS)
- [ ] Sanitize filenames (prevent path traversal)
- [ ] Rate limit API endpoints
- [ ] Add CORS headers appropriately
- [ ] Use HTTPS in production
- [ ] Don't expose internal error details
- [ ] Clean up files to prevent disk filling

## Performance Optimization

- Use Redis for job queue and session storage
- Implement job priority queue
- Cache model downloads
- Use Nginx reverse proxy for static files
- Enable gzip compression
- Add health check endpoint: `GET /health`

## Monitoring

- Log all requests with timestamps
- Track processing times
- Monitor disk usage
- Alert on failed jobs
- Metrics: requests/sec, processing time, queue length

## Future Enhancements

- User accounts and authentication
- Job history and saved results
- Batch processing (multiple files)
- Webhook notifications
- Custom model upload
- Advanced options (shifts, overlap, etc.)
- Audio preview in browser
- Mobile app

## Questions to Answer Before Implementation

1. **Deployment:** Where will this run? (Docker, K8s, cloud service)
2. **Storage:** How long to keep processed files? (1 hour, 1 day, 1 week)
3. **Concurrency:** How many concurrent jobs to support?
4. **Authentication:** Public or authenticated access?
5. **Rate Limiting:** Requests per user/IP?
6. **Monitoring:** What metrics to track?
7. **Logging:** What to log and where?

## Getting Started

When you're ready to implement this:

1. Start with a minimal Flask app
2. Implement upload endpoint first
3. Add basic processing (synchronous)
4. Add Socket.IO progress tracking
5. Implement download endpoint
6. Add cleanup logic
7. Build Docker image
8. Add web UI
9. Test thoroughly
10. Deploy

---

For questions or guidance, refer to `.cursor/rules.md` for comprehensive project guidelines.

