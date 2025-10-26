"""
Demucs Processor - Handles running demucs on audio files
"""

import os
import subprocess
import threading
import zipfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class DemucsProcessor:
    """Processes audio files using Demucs"""
    
    def __init__(self, socketio, job_manager):
        self.socketio = socketio
        self.job_manager = job_manager
        logger.info("DemucsProcessor initialized")
    
    def process_job(self, job_id: str):
        """Process a job in a background thread"""
        thread = threading.Thread(target=self._process_job_sync, args=(job_id,), daemon=True)
        thread.start()
    
    def _process_job_sync(self, job_id: str):
        """Synchronous job processing (runs in thread)"""
        try:
            job = self.job_manager.get_job(job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return
            
            logger.info(f"Starting processing for job {job_id}")
            
            # Update status to processing
            self.job_manager.update_job_status(job_id, 'processing', 0)
            self._emit_progress(job_id, 'processing', 0, 'Starting demucs processing...')
            
            # Get paths
            input_dir = self.job_manager.get_job_input_dir(job_id)
            output_dir = self.job_manager.get_job_output_dir(job_id)
            output_dir.mkdir(parents=True, exist_ok=True)
            
            input_file = input_dir / job.filename
            
            if not input_file.exists():
                raise FileNotFoundError(f"Input file not found: {input_file}")
            
            # Build demucs command
            cmd = self._build_demucs_command(
                input_file=str(input_file),
                output_dir=str(output_dir),
                model=job.model,
                output_format=job.output_format,
                stems=job.stems
            )
            
            logger.info(f"Running demucs command: {' '.join(cmd)}")
            
            # Run demucs with progress tracking
            self._run_demucs_with_progress(job_id, cmd)
            
            # Check if output was created
            if not self._verify_output(job_id):
                raise Exception("Demucs completed but output files not found")
            
            # Update status to completed
            self.job_manager.update_job_status(job_id, 'completed', 100)
            self._emit_progress(job_id, 'completed', 100, 'Processing complete!')
            
            logger.info(f"Job {job_id} completed successfully")
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Job {job_id} failed: {error_msg}", exc_info=True)
            self.job_manager.update_job_status(job_id, 'failed', error_message=error_msg)
            self._emit_error(job_id, error_msg)
    
    def _build_demucs_command(self, input_file: str, output_dir: str, 
                             model: str, output_format: str, stems: str) -> list:
        """Build the demucs command"""
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
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Track progress from stdout
        for line in process.stdout:
            line = line.strip()
            if line:
                logger.debug(f"Demucs output: {line}")
                
                # Try to parse progress from output
                progress = self._parse_progress(line)
                if progress is not None:
                    self.job_manager.update_job_status(job_id, 'processing', progress)
                    self._emit_progress(job_id, 'processing', progress, line)
        
        # Wait for process to complete
        return_code = process.wait()
        
        if return_code != 0:
            raise Exception(f"Demucs process failed with exit code {return_code}")
    
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
        
        # Demucs creates: output_dir/{model}/{filename_without_ext}/{stem}.{format}
        model_dir = output_dir / job.model
        
        if not model_dir.exists():
            logger.error(f"Model output directory not found: {model_dir}")
            return False
        
        # Find the track directory (should be only one)
        track_dirs = [d for d in model_dir.iterdir() if d.is_dir()]
        
        if not track_dirs:
            logger.error(f"No track directory found in {model_dir}")
            return False
        
        track_dir = track_dirs[0]
        
        # Check for output files
        expected_stems = ['bass', 'drums', 'vocals', 'other'] if job.stems == 'all' else [job.stems]
        extension = job.output_format
        
        for stem in expected_stems:
            stem_file = track_dir / f"{stem}.{extension}"
            if not stem_file.exists():
                logger.error(f"Expected output file not found: {stem_file}")
                return False
        
        logger.info(f"Output verification passed for job {job_id}")
        return True
    
    def create_output_zip(self, job_id: str) -> Optional[Path]:
        """Create a ZIP file of the output stems"""
        try:
            job = self.job_manager.get_job(job_id)
            output_dir = self.job_manager.get_job_output_dir(job_id)
            
            # Find the track directory
            model_dir = output_dir / job.model
            track_dirs = [d for d in model_dir.iterdir() if d.is_dir()]
            
            if not track_dirs:
                return None
            
            track_dir = track_dirs[0]
            
            # Create ZIP file
            zip_path = self.job_manager.get_job_dir(job_id) / f"stems_{job_id}.zip"
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in track_dir.iterdir():
                    if file_path.is_file():
                        # Add file to ZIP with just the filename (no directory structure)
                        zipf.write(file_path, file_path.name)
            
            logger.info(f"Created ZIP file for job {job_id}: {zip_path}")
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

