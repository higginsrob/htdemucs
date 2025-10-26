"""
Job Manager - Handles job lifecycle and state management
"""

import uuid
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field
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


class JobManager:
    """Manages demucs processing jobs with FIFO queue"""
    
    def __init__(self, job_dir: str = '/tmp/demucs-jobs'):
        self.job_dir = Path(job_dir)
        self.job_dir.mkdir(parents=True, exist_ok=True)
        self.jobs: Dict[str, Job] = {}
        self.job_queue: List[str] = []  # FIFO queue of job IDs
        self.lock = threading.Lock()
        self.processing_lock = threading.Lock()
        self.currently_processing: Optional[str] = None
        logger.info(f"JobManager initialized with job_dir: {self.job_dir}")
    
    def create_job(self, filename: str, model: str, output_format: str, stems: str,
                   source_type: str = 'upload', youtube_url: str = None,
                   youtube_metadata: dict = None, playlist_id: str = None,
                   playlist_position: int = None) -> Job:
        """Create a new job and add to queue"""
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
            playlist_position=playlist_position
        )
        
        with self.lock:
            self.jobs[job_id] = job
            self.job_queue.append(job_id)
        
        logger.info(f"Created job {job_id}: {filename} (queue position: {len(self.job_queue)})")
        return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        with self.lock:
            return self.jobs.get(job_id)
    
    def update_job_status(self, job_id: str, status: str, progress: int = None, 
                         error_message: str = None):
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
            
            logger.info(f"Job {job_id} status updated: {status} (progress: {progress}%)")
    
    def get_job_dir(self, job_id: str) -> Path:
        """Get job directory path"""
        return self.job_dir / job_id
    
    def get_job_input_dir(self, job_id: str) -> Path:
        """Get job input directory"""
        return self.get_job_dir(job_id) / 'input'
    
    def get_job_output_dir(self, job_id: str) -> Path:
        """Get job output directory"""
        return self.get_job_dir(job_id) / 'output'
    
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
                logger.info(f"Job {job_id} is now processing")
                return True
            else:
                logger.warning(f"Cannot process {job_id}: {self.currently_processing} is already processing")
                return False
    
    def mark_processing_end(self, job_id: str):
        """Mark processing as complete, allow next job"""
        with self.processing_lock:
            if self.currently_processing == job_id:
                self.currently_processing = None
                logger.info(f"Job {job_id} processing ended")
            
        # Remove from queue
        with self.lock:
            if job_id in self.job_queue:
                self.job_queue.remove(job_id)
    
    def cleanup_job(self, job_id: str):
        """Clean up job files and remove from memory"""
        try:
            # Remove files
            job_dir = self.get_job_dir(job_id)
            if job_dir.exists():
                shutil.rmtree(job_dir)
                logger.info(f"Cleaned up files for job {job_id}")
            
            # Remove from memory
            with self.lock:
                if job_id in self.jobs:
                    del self.jobs[job_id]
                    logger.info(f"Removed job {job_id} from memory")
        
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
        logger.info(f"Scheduled cleanup for job {job_id} in {delay_seconds} seconds")
    
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

