# YouTube Video ID Fix - Complete ✅

## Issue
YouTube video job folders were being saved with UUIDs instead of YouTube video IDs, preventing proper caching and deduplication.

## Root Cause
The playlist processing section in `server.py` was not updated during the refactor:
- Did not fetch metadata for each video (needed to get video ID)
- Did not pass `youtube_id` parameter to `create_job()`
- Did not pass `use_hash_as_id=True` flag
- Did not check for existing jobs (caching)
- Did not check video duration limits

## Fix Applied

### Backend Changes (`server/app/server.py`)

**Updated Playlist Processing:**
1. **Fetch metadata for each video** to get video ID and duration
2. **Check duration** and skip videos over 10 minutes
3. **Check for existing jobs** by YouTube video ID (caching)
4. **Pass `youtube_id` and `use_hash_as_id=True`** to create_job()
5. **Enhanced response** with statistics about cached/skipped/errored videos

**New Response Format:**
```json
{
  "type": "playlist",
  "playlist_id": "PLxxx",
  "total_videos": 10,
  "jobs_created": 7,
  "jobs_cached": 2,
  "videos_skipped": 1,
  "videos_errored": 0,
  "jobs": [
    {
      "job_id": "video_id_123",
      "title": "Song Title",
      "position": 1,
      "status": "queued",
      "cached": false
    },
    // ... more jobs
  ],
  "skipped": [
    {
      "title": "Long Video",
      "reason": "Video is too long (15:30)"
    }
  ],
  "message": "Added 9 videos (7 new, 2 cached)"
}
```

### Frontend Changes (`server/static/js/app.js`)

**Enhanced Playlist Handling:**
1. Store `cached` flag for each job
2. Display alert with playlist statistics:
   - Number of new videos added
   - Number of cached videos (already processed)
   - Number of skipped videos (too long)
3. Show cached message for single videos

**Enhanced File Upload Handling:**
1. Store `cached` flag for uploaded files
2. Display alert when file is already cached

## Verification

### Test Cases:
1. ✅ **Single YouTube video** → Job folder named with video ID
2. ✅ **Same YouTube video twice** → Returns cached result
3. ✅ **YouTube playlist** → Each video folder named with video ID
4. ✅ **Same playlist twice** → Cached videos are skipped
5. ✅ **Playlist with long videos** → Long videos skipped, short videos processed
6. ✅ **Upload same file twice** → Returns cached result (SHA hash)

### Expected Folder Structure:
```
./demucs/output/
├── dQw4w9WgXcQ/              # YouTube video ID (single video)
│   ├── metadata.json
│   └── stems/
│       └── htdemucs_ft/
│           └── Never Gonna Give You Up/
│               ├── bass.mp3
│               ├── drums.mp3
│               ├── vocals.mp3
│               └── other.mp3
│
├── abc123def456/             # YouTube video ID (from playlist)
│   ├── metadata.json
│   └── stems/
│
└── 9f4e8a7c2b1d...          # SHA-256 hash (uploaded file)
    ├── metadata.json
    └── stems/
```

## Benefits

### 1. Proper Caching
- Videos are not re-downloaded if already processed
- Saves bandwidth and processing time
- Works across server restarts (persistent storage)

### 2. Easy Identification
- Job folder names match YouTube video IDs
- Easy to locate specific videos in file system
- Consistent with YouTube URL structure

### 3. Better User Feedback
- Users are notified when videos are cached
- Playlist statistics show new vs. cached videos
- Clear messaging for skipped videos (too long)

### 4. Enhanced Playlist Processing
- Duration checks prevent long videos from being queued
- Error handling for individual videos in playlist
- Detailed breakdown of playlist processing results

## Code Changes Summary

**Files Modified:**
- ✅ `server/app/server.py` - Fixed playlist processing, enhanced responses
- ✅ `server/static/js/app.js` - Added cached message handling

**Files Already Correct:**
- ✅ `server/app/services/job_manager.py` - create_job() logic was correct
- ✅ `server/app/services/youtube_service.py` - Metadata extraction was correct

## Testing Commands

```bash
# Start server in dev mode
make dev

# Test single video (will use video ID)
curl -X POST http://localhost:8080/api/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Test playlist (will use video IDs for each video)
curl -X POST http://localhost:8080/api/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/playlist?list=PLxxxxxx"}'

# Check output folder
ls -la ./demucs/output/
```

## Next Steps

The system now properly:
1. ✅ Uses YouTube video IDs as job IDs
2. ✅ Caches videos to avoid re-processing
3. ✅ Checks duration limits before downloading
4. ✅ Provides detailed feedback for playlists
5. ✅ Persists across server restarts

All YouTube processing functionality is now working as intended! 🎉

