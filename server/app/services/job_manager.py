"""
Job Manager - Handles job lifecycle and state management
"""

import uuid
import shutil
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional
import logging
import threading

logger = logging.getLogger(__name__)


@dataclass
class Job:
    """Represents a demucs processing job"""
    job_id: str
    filename: str
    model: str
    output_format: str
    stems: str
    status: str = 'queued'  # queued, processing, completed, failed
    progress: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    # YouTube-specific fields
    source_type: str = 'upload'  # 'upload' or 'youtube'
    youtube_url: Optional[str] = None
    youtube_metadata: Optional[dict] = None
    playlist_id: Optional[str] = None  # If part of a playlist
    playlist_position: Optional[int] = None  # Position in playlist
    # File hash (for deduplication)
    file_hash: Optional[str] = None  # SHA-256 hash of file content
    youtube_id: Optional[str] = None  # YouTube video ID for caching
    duration: Optional[int] = None  # Duration in seconds
    
    def to_dict(self) -> dict:
        """Convert job to dictionary for JSON serialization"""
        data = asdict(self)
        # Convert datetime objects to ISO format strings
        if self.created_at:
            data['created_at'] = self.created_at.isoformat()
        if self.started_at:
            data['started_at'] = self.started_at.isoformat()
        if self.completed_at:
            data['completed_at'] = self.completed_at.isoformat()
        return data
    
    @staticmethod
    def from_dict(data: dict) -> 'Job':
        """Create Job from dictionary (loaded from JSON)"""
        # Convert ISO format strings back to datetime
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'started_at' in data and data['started_at'] and isinstance(data['started_at'], str):
            data['started_at'] = datetime.fromisoformat(data['started_at'])
        if 'completed_at' in data and data['completed_at'] and isinstance(data['completed_at'], str):
            data['completed_at'] = datetime.fromisoformat(data['completed_at'])
        
        # Filter out unknown fields (for backward compatibility with old metadata)
        valid_fields = {
            'job_id', 'filename', 'model', 'output_format', 'stems', 'status',
            'progress', 'created_at', 'started_at', 'completed_at', 'error_message',
            'source_type', 'youtube_url', 'youtube_metadata', 'playlist_id',
            'playlist_position', 'file_hash', 'youtube_id', 'duration'
        }
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        
        return Job(**filtered_data)


class JobManager:
    """Manages demucs processing jobs with FIFO queue"""
    
    def __init__(self, job_dir: str = '/tmp/demucs-jobs', output_dir: str = '/app/output'):
        self.job_dir = Path(job_dir)
        self.job_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.jobs: Dict[str, Job] = {}
        self.job_queue: List[str] = []  # FIFO queue of job IDs
        self.lock = threading.Lock()
        self.processing_lock = threading.Lock()
        self.currently_processing: Optional[str] = None
        
        # Load existing jobs from disk
        self._load_jobs_from_disk()
    
    def create_job(self, filename: str, model: str, output_format: str, stems: str,
                   source_type: str = 'upload', youtube_url: str = None,
                   youtube_metadata: dict = None, playlist_id: str = None,
                   playlist_position: int = None, file_hash: str = None,
                   youtube_id: str = None, duration: int = None,
                   use_hash_as_id: bool = False) -> Job:
        """Create a new job and add to queue"""
        # Use file hash as job ID if specified (for file uploads)
        # Use YouTube ID as job ID if specified (for YouTube videos)
        if use_hash_as_id and file_hash:
            job_id = file_hash
        elif use_hash_as_id and youtube_id:
            job_id = youtube_id
        else:
            job_id = str(uuid.uuid4())
        
        job = Job(
            job_id=job_id,
            filename=filename,
            model=model,
            output_format=output_format,
            stems=stems,
            source_type=source_type,
            youtube_url=youtube_url,
            youtube_metadata=youtube_metadata,
            playlist_id=playlist_id,
            playlist_position=playlist_position,
            file_hash=file_hash,
            youtube_id=youtube_id,
            duration=duration
        )
        
        with self.lock:
            self.jobs[job_id] = job
            self.job_queue.append(job_id)
        
        # Save metadata immediately so it persists
        self.save_job_metadata(job_id)
        
        return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        with self.lock:
            return self.jobs.get(job_id)
    
    def update_job_status(self, job_id: str, status: str, progress: int = None, 
                         error_message: str = None, save_metadata: bool = True):
        """Update job status"""
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return
            
            job.status = status
            
            if progress is not None:
                job.progress = progress
            
            if status == 'processing' and not job.started_at:
                job.started_at = datetime.now()
            
            if status in ['completed', 'failed']:
                job.completed_at = datetime.now()
            
            if error_message:
                job.error_message = error_message
        
        # Save metadata only on important changes to avoid I/O overhead
        # For progress updates, we skip saving to disk (too frequent)
        if save_metadata and (status in ['completed', 'failed', 'queued'] or progress is None):
            self.save_job_metadata(job_id)
    
    def get_job_dir(self, job_id: str) -> Path:
        """Get job directory path"""
        return self.job_dir / job_id
    
    def get_job_input_dir(self, job_id: str) -> Path:
        """Get job input directory"""
        return self.get_job_dir(job_id) / 'input'
    
    def get_job_output_dir(self, job_id: str) -> Path:
        """Get job output directory (persistent storage)"""
        return self.output_dir / job_id
    
    def list_recent_jobs(self, limit: int = 10) -> List[Job]:
        """List recent jobs"""
        with self.lock:
            jobs = sorted(
                self.jobs.values(),
                key=lambda j: j.created_at,
                reverse=True
            )
            return jobs[:limit]
    
    def get_active_job_count(self) -> int:
        """Get count of active (queued or processing) jobs"""
        with self.lock:
            return sum(1 for job in self.jobs.values() 
                      if job.status in ['queued', 'processing'])
    
    def get_queued_job_count(self) -> int:
        """Get count of queued jobs"""
        with self.lock:
            return sum(1 for job in self.jobs.values() if job.status == 'queued')
    
    def get_queue_position(self, job_id: str) -> Optional[int]:
        """Get position of job in queue (1-indexed)"""
        with self.lock:
            try:
                return self.job_queue.index(job_id) + 1
            except ValueError:
                return None
    
    def get_next_job(self) -> Optional[str]:
        """Get next job from queue (FIFO)"""
        with self.lock:
            # Find first queued job in the queue
            for job_id in self.job_queue:
                job = self.jobs.get(job_id)
                if job and job.status == 'queued':
                    return job_id
            return None
    
    def can_process_job(self) -> bool:
        """Check if we can process a new job (no job currently processing)"""
        with self.processing_lock:
            return self.currently_processing is None
    
    def mark_processing_start(self, job_id: str) -> bool:
        """Mark a job as currently processing"""
        with self.processing_lock:
            if self.currently_processing is None:
                self.currently_processing = job_id
                return True
            else:
                return False
    
    def mark_processing_end(self, job_id: str):
        """Mark processing as complete, allow next job"""
        with self.processing_lock:
            if self.currently_processing == job_id:
                self.currently_processing = None
            
        # Remove from queue
        with self.lock:
            if job_id in self.job_queue:
                self.job_queue.remove(job_id)
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a queued job or mark a processing job as cancelled"""
        with self.lock:
            if job_id not in self.jobs:
                return False
            
            job = self.jobs[job_id]
            
            # If job is queued, remove from queue and mark as cancelled
            if job.status == 'queued':
                if job_id in self.job_queue:
                    self.job_queue.remove(job_id)
                job.status = 'cancelled'
                return True
            
            # If job is processing, mark as cancelled (processor will check and stop)
            if job.status == 'processing':
                job.status = 'cancelled'
                return True
            
            # Can't cancel completed or failed jobs
            return False
    
    def is_job_cancelled(self, job_id: str) -> bool:
        """Check if a job has been cancelled"""
        with self.lock:
            job = self.jobs.get(job_id)
            return job is not None and job.status == 'cancelled'
    
    def cleanup_job(self, job_id: str):
        """Clean up job files and remove from memory"""
        try:
            # Remove files
            job_dir = self.get_job_dir(job_id)
            if job_dir.exists():
                shutil.rmtree(job_dir)
            
            # Remove from memory
            with self.lock:
                if job_id in self.jobs:
                    del self.jobs[job_id]
        
        except Exception as e:
            logger.error(f"Error cleaning up job {job_id}: {str(e)}")
    
    def schedule_cleanup(self, job_id: str, delay_seconds: int = 300):
        """Schedule job cleanup after a delay (default: 5 minutes)"""
        def cleanup_after_delay():
            import time
            time.sleep(delay_seconds)
            self.cleanup_job(job_id)
        
        thread = threading.Thread(target=cleanup_after_delay, daemon=True)
        thread.start()
    
    def cleanup_old_jobs(self, retention_hours: int = None) -> int:
        """Clean up jobs older than retention period"""
        import os
        
        if retention_hours is None:
            retention_hours = int(os.getenv('JOB_RETENTION_HOURS', 1))
        
        cutoff_time = datetime.now() - timedelta(hours=retention_hours)
        cleaned_count = 0
        
        with self.lock:
            jobs_to_clean = [
                job_id for job_id, job in self.jobs.items()
                if job.created_at < cutoff_time and job.status in ['completed', 'failed']
            ]
        
        for job_id in jobs_to_clean:
            self.cleanup_job(job_id)
            cleaned_count += 1
        
        return cleaned_count
    
    # ============================================================================
    # Persistence Methods
    # ============================================================================
    
    def _load_jobs_from_disk(self):
        """Load existing jobs from disk on startup"""
        try:
            if not self.output_dir.exists():
                logger.info("Output directory doesn't exist, starting with empty queue")
                return
            
            loaded_count = 0
            for job_dir in self.output_dir.iterdir():
                if job_dir.is_dir() and not job_dir.name.startswith('.'):
                    metadata_file = job_dir / 'metadata.json'
                    if metadata_file.exists():
                        try:
                            with open(metadata_file, 'r') as f:
                                data = json.load(f)
                                
                                # Skip YouTube reference files (they only have job_id, youtube_id, title)
                                # Full job metadata has required fields like filename, model, output_format
                                required_fields = {'filename', 'model', 'output_format', 'stems'}
                                if not required_fields.issubset(data.keys()):
                                    # This is a reference file, not a full job
                                    continue
                                
                                job = Job.from_dict(data)
                                
                                # Only load completed/failed jobs (not queued/processing)
                                # Queued/processing jobs are lost on restart
                                if job.status in ['completed', 'failed']:
                                    with self.lock:
                                        self.jobs[job.job_id] = job
                                    loaded_count += 1
                        except Exception as e:
                            logger.error(f"Error loading job from {metadata_file}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error loading jobs from disk: {str(e)}", exc_info=True)
    
    def save_job_metadata(self, job_id: str):
        """Save job metadata to disk (persistent storage)"""
        try:
            job = self.get_job(job_id)
            if not job:
                logger.error(f"Cannot save metadata: job {job_id} not found")
                return
            
            # Create output directory for this job
            job_output_dir = self.output_dir / job_id
            job_output_dir.mkdir(parents=True, exist_ok=True)
            
            # Save full job metadata to the job's output directory
            metadata_file = job_output_dir / 'metadata.json'
            with open(metadata_file, 'w') as f:
                json.dump(job.to_dict(), f, indent=2)
            
            # For YouTube videos, also save FULL metadata in the YouTube ID folder
            # This allows us to check if we've downloaded this video before
            if job.youtube_id and job.youtube_id != job_id:
                youtube_dir = self.output_dir / job.youtube_id
                youtube_dir.mkdir(parents=True, exist_ok=True)
                
                youtube_metadata_file = youtube_dir / 'metadata.json'
                with open(youtube_metadata_file, 'w') as f:
                    # Save full job metadata (not just a reference)
                    json.dump(job.to_dict(), f, indent=2)
                
                logger.debug(f"Updated YouTube metadata for {job.youtube_id}")
        
        except Exception as e:
            logger.error(f"Error saving job metadata: {str(e)}", exc_info=True)
    
    def get_output_dir_for_job(self, job_id: str) -> Path:
        """Get the output directory for a specific job"""
        return self.output_dir / job_id
    
    @staticmethod
    def compute_file_hash(file_path: Path) -> str:
        """Compute SHA-256 hash of a file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _verify_model_output_files(self, job_id: str, model: str, output_format: str = 'mp3') -> bool:
        """
        Verify that the audio output files exist for the specified model
        
        Args:
            job_id: Job ID
            model: Model name (e.g., 'htdemucs', 'htdemucs_ft')
            output_format: Output format (e.g., 'mp3', 'wav')
        
        Returns:
            True if all expected audio files exist, False otherwise
        """
        try:
            output_dir = self.output_dir / job_id
            if not output_dir.exists():
                return False
            
            # The model output directory
            model_dir = output_dir / model
            if not model_dir.exists():
                return False
            
            # Check for standard 4-stem output (vocals, bass, drums, other)
            # These are the minimum files demucs produces
            required_stems = ['vocals', 'bass', 'drums', 'other']
            
            for stem in required_stems:
                stem_file = model_dir / f'{stem}.{output_format}'
                if not stem_file.exists():
                    logger.debug(f"Missing stem file: {stem_file}")
                    return False
            
            logger.debug(f"Verified model output files exist for job {job_id} with model {model}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying model output files: {str(e)}")
            return False
    
    def find_job_by_file_hash(self, file_hash: str, model: str = None, output_format: str = None) -> Optional[Job]:
        """
        Find existing job by file hash
        
        Args:
            file_hash: SHA-256 hash of the file
            model: Optional model name to match (e.g., 'htdemucs', 'htdemucs_ft')
            output_format: Optional output format to match (e.g., 'mp3', 'wav')
        
        Returns:
            Job if found with matching hash, model, and verified output files, otherwise None
        """
        with self.lock:
            for job in self.jobs.values():
                if (job.file_hash == file_hash and 
                    job.status == 'completed'):
                    
                    # If model is specified, it must match
                    if model and job.model != model:
                        continue
                    
                    # If output_format is specified, it must match
                    if output_format and job.output_format != output_format:
                        continue
                    
                    # Verify that the audio files actually exist for this model
                    if self._verify_model_output_files(job.job_id, job.model, job.output_format):
                        return job
        
        return None
    
    def find_job_by_youtube_id(self, youtube_id: str, model: str = None, output_format: str = None) -> Optional[Job]:
        """
        Find existing job by YouTube video ID
        
        Args:
            youtube_id: YouTube video ID
            model: Optional model name to match (e.g., 'htdemucs', 'htdemucs_ft')
            output_format: Optional output format to match (e.g., 'mp3', 'wav')
        
        Returns:
            Job if found with matching youtube_id, model, and verified output files, otherwise None
        """
        # First check in-memory jobs
        with self.lock:
            for job in self.jobs.values():
                if (job.youtube_id == youtube_id and 
                    job.status == 'completed'):
                    
                    # If model is specified, it must match
                    if model and job.model != model:
                        continue
                    
                    # If output_format is specified, it must match
                    if output_format and job.output_format != output_format:
                        continue
                    
                    # Verify that the audio files actually exist for this model
                    if self._verify_model_output_files(job.job_id, job.model, job.output_format):
                        return job
        
        # Check disk for YouTube reference
        youtube_ref_file = self.output_dir / youtube_id / 'metadata.json'
        if youtube_ref_file.exists():
            try:
                with open(youtube_ref_file, 'r') as f:
                    ref_data = json.load(f)
                    job_id = ref_data.get('job_id')
                    if job_id:
                        job = self.get_job(job_id)
                        if job and job.status == 'completed':
                            # If model is specified, it must match
                            if model and job.model != model:
                                return None
                            
                            # If output_format is specified, it must match
                            if output_format and job.output_format != output_format:
                                return None
                            
                            # Verify that the audio files actually exist for this model
                            if self._verify_model_output_files(job.job_id, job.model, job.output_format):
                                return job
            except Exception as e:
                logger.error(f"Error reading YouTube reference: {str(e)}")
        
        return None
    
    def delete_job(self, job_id: str) -> bool:
        """Delete a job and all its files"""
        try:
            job = self.get_job(job_id)
            if not job:
                logger.warning(f"Cannot delete: job {job_id} not found")
                return False
            
            # Remove output directory
            output_dir = self.get_output_dir_for_job(job_id)
            if output_dir.exists():
                shutil.rmtree(output_dir)
            
            # Remove YouTube reference if exists
            if job.youtube_id:
                youtube_ref_dir = self.output_dir / job.youtube_id
                if youtube_ref_dir.exists():
                    shutil.rmtree(youtube_ref_dir)
            
            # Remove from memory
            with self.lock:
                if job_id in self.jobs:
                    del self.jobs[job_id]
                if job_id in self.job_queue:
                    self.job_queue.remove(job_id)
            
            return True
        
        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {str(e)}", exc_info=True)
            return False
    
    def get_all_jobs_paginated(self, page: int = 1, page_size: int = 50, max_total: int = 300) -> Dict:
        """Get paginated list of all jobs (limited to max_total)"""
        with self.lock:
            all_jobs = sorted(
                self.jobs.values(),
                key=lambda j: j.created_at,
                reverse=True
            )
            
            # Limit total jobs
            all_jobs = all_jobs[:max_total]
            
            # Paginate
            total_jobs = len(all_jobs)
            total_pages = (total_jobs + page_size - 1) // page_size
            start_idx = (page - 1) * page_size
            end_idx = min(start_idx + page_size, total_jobs)
            
            page_jobs = all_jobs[start_idx:end_idx]
            
            return {
                'jobs': page_jobs,
                'page': page,
                'page_size': page_size,
                'total_jobs': total_jobs,
                'total_pages': total_pages
            }

