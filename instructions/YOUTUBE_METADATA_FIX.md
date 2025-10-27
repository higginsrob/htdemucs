# YouTube Metadata Update Fix

## Problem
The metadata JSON files for YouTube uploads were not being properly updated at the correct stages of processing. The system was only saving minimal reference data (job_id, youtube_id, title, created_at) instead of the full job metadata, which prevented proper detection of previously downloaded videos.

For direct file uploads (hash-based folder names), the system worked correctly - full metadata was saved. But for YouTube uploads (folders named with YouTube IDs), the metadata wasn't being updated at critical stages.

## Solution
Updated the metadata handling to save **complete job information** at three key stages:

### 1. **Before Download** (Job Creation)
- When a YouTube job is created, initial metadata with job details is saved immediately
- For playlist videos, this happens with basic info (video ID, title, URL)
- The metadata is saved to `/output/{youtube_id}/metadata.json`

### 2. **After Download** (Download Complete)
- When YouTube download completes, the metadata is updated with:
  - Actual downloaded filename
  - Full YouTube metadata (uploader, channel, description, etc.)
  - Video duration
- For playlist videos without full metadata, it fetches complete metadata before download
- Metadata is saved again after download with complete information

### 3. **After Processing Complete**
- When demucs processing finishes, final metadata is saved with:
  - Completion status
  - Processing times
  - Final progress (100%)
- This happens through the existing `update_job_status()` call

## Files Modified

### 1. `server/app/services/job_manager.py`
**Function: `save_job_metadata()`**

**Changes:**
- Changed behavior to save FULL job metadata (not just a reference) to YouTube ID folders
- Added condition `job.youtube_id != job_id` to prevent overwriting when job_id is already the youtube_id
- Full metadata now includes all job fields: filename, model, output_format, stems, status, progress, timestamps, etc.

**Before:**
```python
# Saved minimal reference file
json.dump({
    'job_id': job_id,
    'youtube_id': job.youtube_id,
    'title': job.filename,
    'created_at': job.created_at.isoformat() if job.created_at else None
}, f, indent=2)
```

**After:**
```python
# Saves complete job metadata
json.dump(job.to_dict(), f, indent=2)
```

### 2. `server/app/services/demucs_processor.py`
**Function: `_process_job_sync()`**

**Changes:**
- Added metadata fetch before download for playlist videos that don't have full metadata yet
- Added explicit `save_job_metadata()` call after YouTube download completes
- Ensures metadata is updated with actual downloaded filename and complete video information

**Key additions:**
1. **Pre-download metadata fetch** (for playlist videos):
   ```python
   if not job.youtube_metadata and job.youtube_url:
       video_metadata = self.youtube_service.get_video_metadata(job.youtube_url)
       if video_metadata:
           job.youtube_metadata = video_metadata.__dict__
           job.duration = video_metadata.duration
           job.youtube_id = video_metadata.id
           self.job_manager.save_job_metadata(job_id)
   ```

2. **Post-download metadata save**:
   ```python
   # After download completes and job is updated
   self.job_manager.save_job_metadata(job_id)
   logger.info(f"Updated job metadata after YouTube download for {job_id}")
   ```

## Benefits

1. **Proper Caching**: System can now detect previously downloaded YouTube videos correctly
2. **Complete Metadata**: YouTube ID folders contain full job details, not just references
3. **Playlist Support**: Playlist videos get full metadata even though they start with minimal info
4. **Consistency**: Both file uploads and YouTube uploads now have consistent metadata handling
5. **Progress Tracking**: Metadata is updated at each stage, allowing better recovery from interruptions

## Example Metadata Flow

### Single YouTube Video
1. User submits YouTube URL
2. System fetches metadata, creates job with youtube_id as job_id
3. **Stage 1**: Initial metadata saved to `/output/{youtube_id}/metadata.json`
4. Processing starts, downloads video
5. **Stage 2**: Metadata updated after download with actual filename
6. Demucs processing happens
7. **Stage 3**: Final metadata saved with completion status

### Playlist Video
1. User submits playlist URL
2. System creates jobs for each video with minimal info (just ID and title)
3. **Stage 1**: Initial metadata saved with basic job info
4. When video's turn comes to process, full metadata is fetched
5. **Stage 1b**: Metadata updated with full video info before download
6. Video downloads
7. **Stage 2**: Metadata updated after download with actual filename
8. Demucs processing happens
9. **Stage 3**: Final metadata saved with completion status

## Testing

To verify the fix works:

1. **Test single YouTube video**:
   - Submit a YouTube video URL
   - Check `/output/{youtube_id}/metadata.json` immediately - should have full job details
   - Check again after download - should have updated filename and metadata
   - Check after completion - should have completion status

2. **Test playlist**:
   - Submit a playlist URL
   - Check metadata files for each video in playlist
   - Should have full job details even before processing starts
   - Should update with complete info as each video processes

3. **Test caching**:
   - Submit the same YouTube video twice
   - Second submission should return cached result
   - System should find existing metadata and skip reprocessing

## Notes

- The metadata at `/output/{youtube_id}/metadata.json` is now the authoritative source for YouTube video jobs
- No separate reference files are created when job_id equals youtube_id (which is the normal case)
- The metadata persists across server restarts through the `_load_jobs_from_disk()` function
- The fix maintains backward compatibility with existing metadata files

