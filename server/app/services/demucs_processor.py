"""
Demucs Processor - Handles running demucs on audio files
"""

import os
import subprocess
import threading
import zipfile
import logging
import time
import json
from pathlib import Path
from typing import Optional

from app.services.youtube_service import YouTubeService

logger = logging.getLogger(__name__)

# Maximum duration in seconds (10 minutes)
MAX_DURATION_SECONDS = 600


class DemucsProcessor:
    """Processes audio files using Demucs with FIFO queue"""
    
    def __init__(self, socketio, job_manager):
        self.socketio = socketio
        self.job_manager = job_manager
        self.youtube_service = YouTubeService()
        self.processor_thread = None
        self.running = True
        self.current_process = None  # Track current demucs subprocess
        self.process_lock = threading.Lock()  # Lock for process operations
        
        # Start queue processor thread
        self._start_queue_processor()
    
    def _start_queue_processor(self):
        """Start the queue processor thread"""
        self.processor_thread = threading.Thread(target=self._queue_processor_loop, daemon=True)
        self.processor_thread.start()
    
    @staticmethod
    def get_audio_duration(file_path: Path) -> Optional[int]:
        """Get duration of audio file in seconds using ffprobe"""
        try:
            cmd = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'json',
                str(file_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                duration = float(data.get('format', {}).get('duration', 0))
                return int(duration)
            else:
                logger.error(f"ffprobe error: {result.stderr}")
                return None
        
        except Exception as e:
            logger.error(f"Error getting audio duration: {str(e)}")
            return None
    
    def _queue_processor_loop(self):
        """Main loop that processes jobs from queue one at a time"""
        while self.running:
            try:
                # Check if we can process and if there's a job waiting
                if self.job_manager.can_process_job():
                    next_job_id = self.job_manager.get_next_job()
                    
                    if next_job_id:
                        # Process the job
                        self._process_job_sync(next_job_id)
                    else:
                        # No jobs in queue, sleep a bit
                        time.sleep(1)
                else:
                    # Already processing a job, wait
                    time.sleep(1)
            
            except Exception as e:
                logger.error(f"Error in queue processor: {str(e)}", exc_info=True)
                time.sleep(1)
    
    def process_job(self, job_id: str):
        """Add job to queue (will be processed by queue processor)"""
        # Job is already in queue from job_manager.create_job()
        pass
    
    def cancel_current_job(self):
        """Cancel the currently processing job by killing the subprocess"""
        with self.process_lock:
            if self.current_process:
                try:
                    # Kill the demucs subprocess
                    self.current_process.terminate()
                    # Give it a moment to gracefully terminate
                    import time
                    time.sleep(0.5)
                    # Force kill if still running
                    if self.current_process.poll() is None:
                        self.current_process.kill()
                except Exception as e:
                    logger.error(f"Error cancelling current process: {str(e)}")
                finally:
                    self.current_process = None
    
    def _process_job_sync(self, job_id: str):
        """Synchronous job processing (runs in queue processor thread)"""
        try:
            job = self.job_manager.get_job(job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return
            
            # Check if job was cancelled before processing
            if self.job_manager.is_job_cancelled(job_id):
                logger.info(f"Job {job_id} was cancelled before processing")
                return
            
            # Try to claim this job for processing
            if not self.job_manager.mark_processing_start(job_id):
                logger.warning(f"Could not start processing job {job_id}, another job is running")
                return
            
            try:
                # Get paths
                input_dir = self.job_manager.get_job_input_dir(job_id)
                output_dir = self.job_manager.get_job_output_dir(job_id)
                
                # Check if output files already exist
                if self.job_manager._verify_model_output_files(job_id, job.model, job.output_format):
                    logger.info(f"Output files already exist for job {job_id} with model {job.model}, skipping processing")
                    
                    # For YouTube videos, ensure metadata is saved to input directory
                    if job.source_type == 'youtube':
                        input_dir.mkdir(parents=True, exist_ok=True)
                        
                        # Check if metadata already exists in input directory
                        metadata_file = input_dir / "metadata.json"
                        if not metadata_file.exists():
                            # Fetch metadata if we don't have it
                            if not job.youtube_metadata and job.youtube_url:
                                logger.info(f"Fetching YouTube metadata for existing job {job_id}")
                                video_metadata = self.youtube_service.get_video_metadata(job.youtube_url)
                                if video_metadata:
                                    job.youtube_metadata = video_metadata.__dict__
                                    job.duration = video_metadata.duration
                                    job.youtube_id = video_metadata.id
                                    self.job_manager.save_job_metadata(job_id)
                            
                            # Save metadata to input directory if we have it
                            if job.youtube_metadata:
                                from app.services.youtube_service import YouTubeMetadata
                                metadata_obj = YouTubeMetadata(**job.youtube_metadata)
                                self.youtube_service.save_metadata_json(metadata_obj, input_dir)
                                logger.info(f"Saved YouTube metadata to input directory for job {job_id}")
                    
                    # Update status to completed without processing
                    self.job_manager.update_job_status(job_id, 'completed', 100)
                    self._emit_progress(job_id, 'completed', 100, 'Skipping - files already exist!')
                    return
                
                # Update status to processing
                self.job_manager.update_job_status(job_id, 'processing', 0)
                self._emit_progress(job_id, 'processing', 0, 'Starting demucs processing...')
                
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # Handle YouTube downloads
                if job.source_type == 'youtube':
                    # For playlist videos, we might not have full metadata yet
                    # Fetch it now before downloading if needed
                    if not job.youtube_metadata and job.youtube_url:
                        self._emit_progress(job_id, 'processing', 2, 'Fetching video information...')
                        video_metadata = self.youtube_service.get_video_metadata(job.youtube_url)
                        if video_metadata:
                            job.youtube_metadata = video_metadata.__dict__
                            job.duration = video_metadata.duration
                            job.youtube_id = video_metadata.id
                            # Save metadata before download
                            self.job_manager.save_job_metadata(job_id)
                            logger.info(f"Fetched and saved metadata before download for {job_id}")
                    
                    self._emit_progress(job_id, 'processing', 5, 'Downloading from YouTube...')
                    input_file, metadata = self.youtube_service.download_audio(job.youtube_url, input_dir)
                    
                    if not input_file or not metadata:
                        raise Exception("Failed to download from YouTube")
                    
                    # Update job with actual filename and metadata from download
                    job.filename = input_file.name
                    if metadata:
                        job.youtube_metadata = metadata.__dict__
                        job.duration = metadata.duration
                        # Save YouTube metadata JSON to input directory
                        self.youtube_service.save_metadata_json(metadata, input_dir)
                    
                    # Save updated job metadata after download
                    # This updates the YouTube ID folder with complete download info
                    self.job_manager.save_job_metadata(job_id)
                    logger.info(f"Updated job metadata after YouTube download for {job_id}")
                    
                    self._emit_progress(job_id, 'processing', 10, 'Download complete, starting separation...')
                else:
                    # Regular file upload
                    input_file = input_dir / job.filename
                    
                    if not input_file.exists():
                        raise FileNotFoundError(f"Input file not found: {input_file}")
                    
                    # Check duration for uploaded files
                    duration = self.get_audio_duration(input_file)
                    if duration is None:
                        raise Exception("Could not determine audio duration")
                    
                    job.duration = duration
                    
                    if duration > MAX_DURATION_SECONDS:
                        raise Exception(f"Sorry, songs are limited to 10 minutes. This file is {duration // 60} minutes {duration % 60} seconds.")
                
                # Build demucs command
                cmd = self._build_demucs_command(
                    input_file=str(input_file),
                    output_dir=str(output_dir),
                    model=job.model,
                    output_format=job.output_format,
                    stems=job.stems
                )
                
                # Run demucs with progress tracking
                self._run_demucs_with_progress(job_id, cmd)
                
                # Check if job was cancelled during processing
                if self.job_manager.is_job_cancelled(job_id):
                    raise Exception("Job was cancelled")
                
                # Flatten the output structure: move files from <model>/<songname>/ to <model>/
                self._flatten_output_structure(job_id)
                
                # Check if output was created
                if not self._verify_output(job_id):
                    raise Exception("Demucs completed but output files not found")
                
                # Update status to completed
                self.job_manager.update_job_status(job_id, 'completed', 100)
                self._emit_progress(job_id, 'completed', 100, 'Processing complete!')
            
            finally:
                # Mark processing as ended (allows next job to start)
                self.job_manager.mark_processing_end(job_id)
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Job {job_id} failed: {error_msg}", exc_info=True)
            self.job_manager.update_job_status(job_id, 'failed', error_message=error_msg)
            self._emit_error(job_id, error_msg)
            # Make sure to release the processing lock
            self.job_manager.mark_processing_end(job_id)
    
    def _build_demucs_command(self, input_file: str, output_dir: str, 
                             model: str, output_format: str, stems: str) -> list:
        """Build the demucs command"""
        # Set environment variable to force progress bars even without TTY
        import os
        os.environ['FORCE_COLOR'] = '1'
        
        cmd = [
            'python3', '-m', 'demucs',
            '-n', model,
            '--out', output_dir,
        ]
        
        # Output format
        if output_format == 'mp3':
            cmd.append('--mp3')
        
        # Two-stems mode (single stem extraction)
        if stems != 'all':
            cmd.extend(['--two-stems', stems])
        
        # Add input file
        cmd.append(input_file)
        
        return cmd
    
    def _run_demucs_with_progress(self, job_id: str, cmd: list):
        """Run demucs command and track progress"""
        import re
        import sys
        
        # Force unbuffered output
        env = os.environ.copy()
        env['PYTHONUNBUFFERED'] = '1'
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr to stdout (tqdm writes to stderr)
            text=True,
            bufsize=0,  # Unbuffered
            universal_newlines=True,
            env=env
        )
        
        # Store process reference for cancellation
        with self.process_lock:
            self.current_process = process
        
        last_progress = 10  # Start after download/setup
        last_emit_progress = 0  # Track last emitted progress to avoid spam but allow frequent updates
        current_stage = "initializing"
        
        # Track progress from stdout/stderr
        for line in iter(process.stdout.readline, ''):
            # Check if job was cancelled
            if self.job_manager.is_job_cancelled(job_id):
                # Kill the process
                process.terminate()
                with self.process_lock:
                    self.current_process = None
                raise Exception("Job was cancelled")
            
            line = line.strip()
            if line:
                
                # Parse actual percentage from progress bars
                # Demucs outputs lines like: "100%|████████| 1234/1234 [00:30<00:00, 40.47it/s]"
                # or just "42%|████▌     | 520/1234 [00:13<00:17, 40.47it/s]"
                percentage_match = re.search(r'(\d+)%\|', line)
                if percentage_match:
                    raw_percent = int(percentage_match.group(1))
                    # Map to our progress range (10-95%)
                    # Demucs progress is typically for the separation stage
                    progress = 10 + int(raw_percent * 0.85)  # 10% to 95%
                    
                    # Also parse the processing speed (it/s)
                    speed_match = re.search(r'([\d.]+)it/s', line)
                    speed_str = ""
                    if speed_match:
                        speed = float(speed_match.group(1))
                        speed_str = f" ({speed:.1f}it/s)"
                    
                    # Parse time remaining if available
                    time_remaining_match = re.search(r'<(\d+:\d+)', line)
                    time_str = ""
                    if time_remaining_match:
                        time_remaining = time_remaining_match.group(1)
                        time_str = f" ETA: {time_remaining}"
                    
                    # Emit every 1% change (or more) for real-time updates
                    if progress > last_progress or (progress - last_emit_progress) >= 1:
                        last_progress = max(last_progress, progress)
                        last_emit_progress = progress
                        # Don't save metadata on every progress update (too much I/O)
                        self.job_manager.update_job_status(job_id, 'processing', progress, save_metadata=False)
                        
                        # Build detailed progress message
                        message = f'Separating stems: {raw_percent}%{speed_str}{time_str}'
                        self._emit_progress(job_id, 'processing', progress, message)
                    continue
                
                # Parse stage information
                if 'Selected model' in line or 'Loading model' in line:
                    if current_stage != "loading":
                        current_stage = "loading"
                        progress = 10
                        last_progress = progress
                        self.job_manager.update_job_status(job_id, 'processing', progress, save_metadata=False)
                        self._emit_progress(job_id, 'processing', progress, 'Loading model...')
                
                elif 'Separating' in line or 'Processing' in line:
                    if current_stage != "separating":
                        current_stage = "separating"
                        progress = 15
                        last_progress = progress
                        self.job_manager.update_job_status(job_id, 'processing', progress, save_metadata=False)
                        self._emit_progress(job_id, 'processing', progress, 'Separating audio...')
                
                elif 'Saving' in line or 'Writing' in line or 'Exporting' in line:
                    if current_stage != "saving":
                        current_stage = "saving"
                        progress = 95
                        last_progress = progress
                        self.job_manager.update_job_status(job_id, 'processing', progress, save_metadata=False)
                        self._emit_progress(job_id, 'processing', progress, 'Saving stems...')
        
        # Wait for process to complete
        return_code = process.wait()
        
        # Clear process reference
        with self.process_lock:
            self.current_process = None
        
        if return_code != 0:
            raise Exception(f"Demucs process failed with exit code {return_code}")
    
    def _flatten_output_structure(self, job_id: str):
        """
        Flatten output structure from <model>/<songname>/<file> to <model>/<file>
        Demucs creates a songname subdirectory which we don't need
        """
        import shutil
        
        try:
            job = self.job_manager.get_job(job_id)
            output_dir = self.job_manager.get_job_output_dir(job_id)
            
            # Demucs creates: output_dir/<model>/<songname>/<files>
            model_dir = output_dir / job.model
            
            if not model_dir.exists():
                return
            
            # Find the songname directory (should be only one)
            track_dirs = [d for d in model_dir.iterdir() if d.is_dir()]
            
            if not track_dirs:
                return
            
            track_dir = track_dirs[0]
            
            # Move all files from <model>/<songname>/ to <model>/
            for file_path in track_dir.iterdir():
                if file_path.is_file():
                    dest_path = model_dir / file_path.name
                    shutil.move(str(file_path), str(dest_path))
            
            # Remove the now-empty songname directory
            track_dir.rmdir()
        
        except Exception as e:
            logger.error(f"Error flattening output structure for job {job_id}: {str(e)}")
    
    def _parse_progress(self, line: str) -> Optional[int]:
        """
        Parse progress from demucs output
        
        Demucs doesn't output exact progress, so we estimate based on stages:
        - Loading model: 10%
        - Processing: 10% -> 90% (we simulate this)
        - Saving: 90% -> 100%
        """
        line_lower = line.lower()
        
        if 'loading' in line_lower or 'model' in line_lower:
            return 10
        elif 'separating' in line_lower or 'processing' in line_lower:
            return 50  # Middle of processing
        elif 'saving' in line_lower or 'writing' in line_lower:
            return 90
        
        return None
    
    def _verify_output(self, job_id: str) -> bool:
        """Verify that output files were created"""
        job = self.job_manager.get_job(job_id)
        output_dir = self.job_manager.get_job_output_dir(job_id)
        
        # After flattening: output_dir/<model>/<stem>.<format>
        model_dir = output_dir / job.model
        
        if not model_dir.exists():
            logger.error(f"Model output directory not found: {model_dir}")
            return False
        
        # Check for output files directly in model directory
        expected_stems = ['bass', 'drums', 'vocals', 'other'] if job.stems == 'all' else [job.stems]
        extension = job.output_format
        
        for stem in expected_stems:
            stem_file = model_dir / f"{stem}.{extension}"
            if not stem_file.exists():
                logger.error(f"Expected output file not found: {stem_file}")
                return False
        
        return True
    
    def create_output_zip(self, job_id: str) -> Optional[Path]:
        """Create a ZIP file of the output stems (includes metadata.json for YouTube)"""
        try:
            job = self.job_manager.get_job(job_id)
            output_dir = self.job_manager.get_job_output_dir(job_id)
            input_dir = self.job_manager.get_job_input_dir(job_id)
            
            # After flattening, files are directly in model directory
            model_dir = output_dir / job.model
            
            if not model_dir.exists():
                return None
            
            # Create ZIP file
            zip_path = self.job_manager.get_job_dir(job_id) / f"stems_{job_id}.zip"
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add all stem files directly from model directory
                for file_path in model_dir.iterdir():
                    if file_path.is_file():
                        # Add file to ZIP with just the filename (no directory structure)
                        zipf.write(file_path, file_path.name)
                
                # Add metadata.json if it exists (YouTube downloads)
                metadata_path = input_dir / "metadata.json"
                if metadata_path.exists():
                    zipf.write(metadata_path, "metadata.json")
            
            return zip_path
        
        except Exception as e:
            logger.error(f"Error creating ZIP for job {job_id}: {str(e)}", exc_info=True)
            return None
    
    def _emit_progress(self, job_id: str, status: str, progress: int, message: str):
        """Emit progress update via Socket.IO"""
        try:
            self.socketio.emit(
                'progress',
                {
                    'job_id': job_id,
                    'status': status,
                    'progress': progress,
                    'message': message
                },
                room=job_id,
                namespace='/progress'
            )
        except Exception as e:
            logger.error(f"Error emitting progress: {str(e)}")
    
    def _emit_error(self, job_id: str, error_message: str):
        """Emit error event via Socket.IO"""
        try:
            self.socketio.emit(
                'error',
                {
                    'job_id': job_id,
                    'error_message': error_message
                },
                room=job_id,
                namespace='/progress'
            )
        except Exception as e:
            logger.error(f"Error emitting error: {str(e)}")

