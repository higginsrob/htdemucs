# Queue System Refactor - Complete ✅

## Overview
The job queue system has been completely reworked with persistence, SHA-based job IDs, YouTube caching, duration limits, and a new Library view.

## Major Changes Implemented

### 1. Persistent Storage with SHA-Based Job IDs ✅

**Backend (`job_manager.py`):**
- Added SHA-256 file hashing for uploaded audio files
- Job IDs now use file hash (for uploads) or YouTube video ID (for YouTube videos)
- Metadata stored in `./output/<job-id>/metadata.json`
- YouTube reference files stored at `./output/<youtube-video-id>/metadata.json`
- Jobs loaded from disk on server restart
- All job status changes are persisted to disk

**Docker Volume Mounts (`Makefile`):**
- Added persistent volume mount: `./demucs/output:/app/output`
- Output directory now persists across container restarts
- Environment variable `OUTPUT_DIR=/app/output` set for all server modes

### 2. Duplicate Detection & Caching ✅

**File Uploads (`server.py`):**
- Computes SHA-256 hash of uploaded files
- Checks for existing jobs with same hash before processing
- Returns cached job with "already exists, skipping" message if found
- Avoids re-processing identical files

**YouTube Videos (`server.py`, `youtube_service.py`):**
- Extracts video ID from YouTube URLs
- Checks for existing jobs with same video ID before downloading
- Returns cached job with "already exists, skipping" message if found
- Avoids re-downloading already processed videos

### 3. Duration Limits (10 Minutes) ✅

**Uploaded Files (`demucs_processor.py`):**
- Uses `ffprobe` to check audio duration before processing
- Rejects files over 600 seconds (10 minutes)
- Error message: "Sorry, songs are limited to 10 minutes. This file is X minutes Y seconds."

**YouTube Videos (`youtube_service.py`):**
- Checks duration from metadata before downloading
- Rejects videos over 600 seconds (10 minutes)
- Error message: "Sorry, songs are limited to 10 minutes. This video is X minutes Y seconds."
- Duration check happens BEFORE download to save bandwidth

### 4. New Library View ✅

**UI Components (`index.html`):**
- Added new "Library" tab to view switcher
- Paginated table with columns:
  - Thumbnail (YouTube videos show thumbnail, uploads show music note icon)
  - Song (title + description truncated)
  - Artist (uploader/channel name)
  - Duration (formatted as MM:SS)
  - Status (badge with icon and progress for processing jobs)
  - Actions (Download, Refresh, Delete buttons)

**Frontend Logic (`app.js`):**
- Fetches paginated library data from `/api/library`
- Page size: 50 jobs per page (max 300 total)
- Real-time stats (Total Songs, Completed, Processing)
- Pagination controls (Previous, Page Numbers, Next)
- Refresh button to reload library data
- Delete button with confirmation
- Refresh button to re-process songs (deletes output, re-queues job)

**Backend Endpoints (`server.py`):**
- `GET /api/library?page=1&page_size=50` - Get paginated library
- `DELETE /api/jobs/<job_id>` - Delete job and all files
- `POST /api/refresh/<job_id>` - Re-process job (deletes output, creates new job)

**Styling (`style.css`):**
- Modern table design with hover effects
- Responsive layout for mobile devices
- Status badges with color coding
- Action buttons with hover animations

## File Structure Changes

```
./demucs/output/
├── <sha256-hash>/              # Upload job folder
│   ├── metadata.json           # Job metadata
│   └── stems/                  # Processed audio stems
│       └── htdemucs_ft/
│           └── <filename>/
│               ├── bass.mp3
│               ├── drums.mp3
│               ├── vocals.mp3
│               └── other.mp3
│
├── <youtube-video-id>/         # YouTube job folder
│   ├── metadata.json           # Job metadata (includes YouTube metadata)
│   └── stems/                  # Processed audio stems
│       └── htdemucs_ft/
│           └── <filename>/
│               ├── bass.mp3
│               ├── drums.mp3
│               ├── vocals.mp3
│               └── other.mp3
│
└── <youtube-video-id>/         # YouTube reference folder (for caching)
    └── metadata.json           # Points to job folder
```

## API Changes

### New Endpoints:
- `GET /api/library?page=1&page_size=50` - Get paginated library
- `DELETE /api/jobs/<job_id>` - Delete job
- `POST /api/refresh/<job_id>` - Refresh/re-process job

### Modified Endpoints:
- `POST /api/upload` - Now returns `cached: true/false` and `message` field
- `POST /api/youtube` - Now returns `cached: true/false` and `message` field
- `GET /api/jobs` - Now includes `duration` and `youtube_metadata` fields

## Dependencies

### Already Installed:
- `ffmpeg` (includes `ffprobe` for duration checking)
- `yt-dlp` (for YouTube downloads)

### Python Packages:
All required packages are already in `requirements.txt`:
- `hashlib` (built-in)
- `json` (built-in)

## Testing Checklist

- [ ] Upload same file twice → Should return cached result
- [ ] Add same YouTube video twice → Should return cached result
- [ ] Upload file over 10 minutes → Should reject with error message
- [ ] Add YouTube video over 10 minutes → Should reject with error message
- [ ] Restart server → Jobs should persist and load from disk
- [ ] Library view → Should show all jobs in paginated table
- [ ] Refresh button in Library → Should re-process song
- [ ] Delete button in Library → Should delete job and files
- [ ] Pagination → Should navigate through pages correctly

## Usage

### Starting the Server:
```bash
# Normal mode (with persistent storage)
make server-run

# GPU mode (with persistent storage)
make server-run-gpu

# Development mode (with hot reload)
make dev
```

### Accessing the Application:
1. Open browser to `http://localhost:8080`
2. Use "Add" view to upload files or add YouTube videos
3. Use "Monitor" view to see active jobs and queue
4. Use "Library" view to browse all processed songs

### Re-processing a Song:
1. Go to Library view
2. Find the song you want to re-process
3. Click the 🔄 Refresh button
4. Confirm the action
5. Job will be deleted and re-added to queue with same settings

### Deleting a Song:
1. Go to Library view
2. Find the song you want to delete
3. Click the 🗑️ Delete button
4. Confirm the action
5. Job and all associated files will be deleted

## Notes

- Duration limit is set to 10 minutes (600 seconds) via `MAX_DURATION_SECONDS` constant
- Jobs are stored in `./demucs/output/` which is mounted as a Docker volume
- Failed jobs are also saved to disk with error messages
- Library pagination is limited to 300 songs maximum for performance
- SHA-256 is used for file hashing to ensure uniqueness and security
- YouTube video IDs are used directly as job IDs for caching efficiency

## Completed ✅

All todos completed successfully:
1. ✅ Update job_manager.py - SHA-based job IDs, persistent metadata, disk loading
2. ✅ Update demucs_processor.py - Duration checking, metadata saving
3. ✅ Update youtube_service.py - Duration checking before download
4. ✅ Update server.py - Caching, library endpoints, refresh/delete
5. ✅ Update app.js - Library view, pagination, refresh/delete buttons
6. ✅ Update index.html - Library view UI, table structure
7. ✅ Update Makefile - Volume mounts for persistence
8. ✅ Update style.css - Library view styling

