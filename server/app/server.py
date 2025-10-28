#!/usr/bin/env python3
"""
Demucs Web Server - Main Application

Flask + Socket.IO server for audio source separation.
Handles file uploads, processing, and real-time progress updates.
"""

import os
import logging
from pathlib import Path

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from werkzeug.utils import secure_filename

from app.services.demucs_processor import DemucsProcessor
from app.services.job_manager import JobManager
from app.services.youtube_service import YouTubeService
from app.utils.validation import validate_audio_file, ValidationError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='../static')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_UPLOAD_SIZE', 104857600))  # 100MB default
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'demucs-server-secret-key-change-in-production')

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Socket.IO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='gevent',
    logger=False,
    engineio_logger=False
)

# Initialize services
job_manager = JobManager(output_dir=os.getenv('OUTPUT_DIR', '/app/output'))
demucs_processor = DemucsProcessor(socketio, job_manager)
youtube_service = YouTubeService()

# Supported audio formats
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a', 'ogg', 'opus'}

# Supported models
SUPPORTED_MODELS = {
    'htdemucs': 'Standard quality, 4 stems',
    'htdemucs_ft': 'High quality (fine-tuned), 4 stems',
    'htdemucs_6s': 'High quality, 6 stems',
    'mdx_extra': 'Fast processing, 4 stems'
}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================================================
# Web Routes - Serve static frontend
# ============================================================================

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    """Serve static files (CSS, JS, etc.)"""
    return send_from_directory(app.static_folder, path)


# ============================================================================
# API Routes
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'jobs': {
            'active': job_manager.get_active_job_count(),
            'queued': job_manager.get_queued_job_count()
        }
    }), 200


@app.route('/api/info', methods=['GET'])
def get_info():
    """Get server information and capabilities"""
    return jsonify({
        'version': '1.0.0',
        'supported_models': SUPPORTED_MODELS,
        'supported_formats': list(ALLOWED_EXTENSIONS),
        'max_file_size_mb': app.config['MAX_CONTENT_LENGTH'] // (1024 * 1024),
        'job_retention_hours': int(os.getenv('JOB_RETENTION_HOURS', 1))
    }), 200


@app.route('/api/upload', methods=['POST'])
def upload_audio():
    """
    Upload audio file for processing
    
    Form data:
        audio_file: File (required) - Audio file to process
        model: String (optional) - Model to use (default: htdemucs_ft)
        output_format: String (optional) - Output format: mp3 or wav (default: mp3)
        stems: String (optional) - Stems to extract: all, bass, drums, vocals, other (default: all)
    
    Returns:
        JSON with job_id, status, and created_at timestamp
    """
    try:
        # Check if file is in request
        if 'audio_file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio_file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file extension
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'Invalid file format. Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Get optional parameters
        model = request.form.get('model', 'htdemucs_ft')
        output_format = request.form.get('output_format', 'mp3')
        stems = request.form.get('stems', 'all')
        
        # Validate model
        if model not in SUPPORTED_MODELS:
            return jsonify({
                'error': f'Invalid model. Supported models: {", ".join(SUPPORTED_MODELS.keys())}'
            }), 400
        
        # Validate output format
        if output_format not in ['mp3', 'wav']:
            return jsonify({'error': 'Invalid output format. Use mp3 or wav'}), 400
        
        # Validate stems
        valid_stems = ['all', 'bass', 'drums', 'vocals', 'other']
        if stems not in valid_stems:
            return jsonify({
                'error': f'Invalid stems option. Valid options: {", ".join(valid_stems)}'
            }), 400
        
        # Validate file content
        try:
            validate_audio_file(file)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        
        # Save file temporarily to compute hash
        filename = secure_filename(file.filename)
        temp_dir = Path('/tmp/demucs-uploads')
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file_path = temp_dir / filename
        file.save(str(temp_file_path))
        
        try:
            # Compute file hash
            file_hash = job_manager.compute_file_hash(temp_file_path)
            
            # Check if this file has been processed before with the SAME model and output format
            existing_job = job_manager.find_job_by_file_hash(file_hash, model=model, output_format=output_format)
            if existing_job:
                logger.info(f"File already exists (hash: {file_hash[:8]}...) with model {model}, returning cached job {existing_job.job_id}")
                # Clean up temp file
                temp_file_path.unlink()
                
                return jsonify({
                    'job_id': existing_job.job_id,
                    'status': existing_job.status,
                    'created_at': existing_job.created_at.isoformat(),
                    'filename': existing_job.filename,
                    'model': existing_job.model,
                    'cached': True,
                    'message': f'This file was already processed with {model}. Using cached result.'
                }), 200
            
            # Create job with hash as ID
            job = job_manager.create_job(
                filename=filename,
                model=model,
                output_format=output_format,
                stems=stems,
                file_hash=file_hash,
                use_hash_as_id=True
            )
            
            # Move file to job input directory
            job_input_dir = job_manager.get_job_input_dir(job.job_id)
            job_input_dir.mkdir(parents=True, exist_ok=True)
            input_file_path = job_input_dir / filename
            temp_file_path.rename(input_file_path)
            
            logger.info(f"Job {job.job_id} created: {filename} (model={model}, format={output_format}, stems={stems})")
            
            # Start processing in background
            demucs_processor.process_job(job.job_id)
            
            return jsonify({
                'job_id': job.job_id,
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'filename': filename,
                'model': model,
                'cached': False
            }), 201
        
        except Exception as e:
            # Clean up temp file on error
            if temp_file_path.exists():
                temp_file_path.unlink()
            raise
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/youtube', methods=['POST'])
def process_youtube():
    """
    Process YouTube video or playlist
    
    JSON body:
        url: String (required) - YouTube video or playlist URL
        model: String (optional) - Model to use (default: htdemucs_ft)
        output_format: String (optional) - Output format: mp3 or wav (default: mp3)
        stems: String (optional) - Stems to extract: all, bass, drums, vocals, other (default: all)
    
    Returns:
        For single video: JSON with job_id
        For playlist: JSON with array of job_ids
    """
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({'error': 'YouTube URL is required'}), 400
        
        url = data['url']
        
        # Validate YouTube URL
        if not youtube_service.is_youtube_url(url):
            return jsonify({'error': 'Invalid YouTube URL'}), 400
        
        # Get optional parameters
        model = data.get('model', 'htdemucs_ft')
        output_format = data.get('output_format', 'mp3')
        stems = data.get('stems', 'all')
        
        # Validate model
        if model not in SUPPORTED_MODELS:
            return jsonify({
                'error': f'Invalid model. Supported models: {", ".join(SUPPORTED_MODELS.keys())}'
            }), 400
        
        # Validate output format
        if output_format not in ['mp3', 'wav']:
            return jsonify({'error': 'Invalid output format. Use mp3 or wav'}), 400
        
        # Validate stems
        valid_stems = ['all', 'bass', 'drums', 'vocals', 'other']
        if stems not in valid_stems:
            return jsonify({
                'error': f'Invalid stems option. Valid options: {", ".join(valid_stems)}'
            }), 400
        
        # Check if it's a playlist or single video
        is_playlist, playlist_id = youtube_service.is_playlist(url)
        
        if is_playlist:
            # Process playlist - create jobs for all videos
            logger.info(f"Processing YouTube playlist: {url}")
            videos = youtube_service.get_playlist_videos(url)
            
            if not videos:
                return jsonify({'error': 'Could not extract videos from playlist'}), 400
            
            jobs = []
            cached = 0
            
            for idx, video in enumerate(videos, 1):
                try:
                    # Use video ID from playlist data (already available, no need to fetch metadata yet)
                    video_id = video['id']
                    
                    # Check if this YouTube video has been processed before with the SAME model and output format
                    existing_job = job_manager.find_job_by_youtube_id(video_id, model=model, output_format=output_format)
                    if existing_job:
                        logger.info(f"Video already exists with model {model}: {video['title']} (job_id: {existing_job.job_id})")
                        jobs.append({
                            'job_id': existing_job.job_id,
                            'title': video['title'],
                            'position': idx,
                            'status': existing_job.status,
                            'cached': True
                        })
                        cached += 1
                        continue
                    
                    # Create job for each video with basic info
                    # Full metadata will be fetched when job is actually processed
                    filename = f"{video['title']}.mp3"
                    job = job_manager.create_job(
                        filename=filename,
                        model=model,
                        output_format=output_format,
                        stems=stems,
                        source_type='youtube',
                        youtube_url=video['url'],
                        youtube_metadata=None,  # Will be fetched during processing
                        playlist_id=playlist_id,
                        playlist_position=idx,
                        youtube_id=video_id,
                        duration=None,  # Will be fetched during processing
                        use_hash_as_id=True
                    )
                    
                    # Start processing (will be queued)
                    demucs_processor.process_job(job.job_id)
                    
                    jobs.append({
                        'job_id': job.job_id,
                        'title': video['title'],
                        'position': idx,
                        'status': job.status,
                        'cached': False
                    })
                
                except Exception as e:
                    logger.error(f"Error creating job for playlist video {video['title']}: {str(e)}")
                    # Continue with other videos even if one fails
            
            new_jobs = len(jobs) - cached
            logger.info(f"Playlist {playlist_id}: {new_jobs} new jobs created, {cached} cached")
            
            response = {
                'type': 'playlist',
                'playlist_id': playlist_id,
                'total_videos': len(videos),
                'jobs_created': new_jobs,
                'jobs_cached': cached,
                'jobs': jobs,
                'message': f'Added {len(jobs)} videos ({new_jobs} new, {cached} cached)'
            }
            
            return jsonify(response), 201
        
        else:
            # Single video
            logger.info(f"Processing YouTube video: {url}")
            
            # Get video metadata
            metadata = youtube_service.get_video_metadata(url)
            if not metadata:
                return jsonify({'error': 'Could not extract video information'}), 400
            
            # Check duration before processing
            if metadata.duration > 600:  # 10 minutes
                return jsonify({
                    'error': f'Sorry, songs are limited to 10 minutes. This video is {metadata.duration // 60} minutes {metadata.duration % 60} seconds.'
                }), 400
            
            # Check if this YouTube video has been processed before with the SAME model and output format
            existing_job = job_manager.find_job_by_youtube_id(metadata.id, model=model, output_format=output_format)
            if existing_job:
                logger.info(f"YouTube video {metadata.id} already exists with model {model}, returning cached job {existing_job.job_id}")
                
                return jsonify({
                    'type': 'video',
                    'job_id': existing_job.job_id,
                    'status': existing_job.status,
                    'created_at': existing_job.created_at.isoformat(),
                    'title': metadata.title,
                    'duration': metadata.duration,
                    'model': existing_job.model,
                    'cached': True,
                    'message': 'Video already exists, skipping processing'
                }), 200
            
            # Create job with YouTube ID
            filename = f"{metadata.title}.mp3"  # Will be updated when downloaded
            job = job_manager.create_job(
                filename=filename,
                model=model,
                output_format=output_format,
                stems=stems,
                source_type='youtube',
                youtube_url=url,
                youtube_metadata=metadata.__dict__,
                youtube_id=metadata.id,
                duration=metadata.duration,
                use_hash_as_id=True
            )
            
            # Start processing (will be queued)
            demucs_processor.process_job(job.job_id)
            
            logger.info(f"Job {job.job_id} created for YouTube video: {metadata.title}")
            
            return jsonify({
                'type': 'video',
                'job_id': job.job_id,
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'title': metadata.title,
                'duration': metadata.duration,
                'model': model,
                'cached': False
            }), 201
    
    except Exception as e:
        logger.error(f"YouTube processing error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """
    Get job status and progress
    
    Returns:
        JSON with job details including status, progress, and timestamps
    """
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        response = {
            'job_id': job.job_id,
            'status': job.status,
            'progress': job.progress,
            'filename': job.filename,
            'model': job.model,
            'created_at': job.created_at.isoformat(),
            'output_format': job.output_format,
            'stems': job.stems,
            'duration': job.duration,
            'source_type': job.source_type
        }
        
        if job.started_at:
            response['started_at'] = job.started_at.isoformat()
        
        if job.completed_at:
            response['completed_at'] = job.completed_at.isoformat()
            if job.started_at:
                response['processing_time_seconds'] = (job.completed_at - job.started_at).total_seconds()
            else:
                # Fallback to created_at if started_at is not set
                response['processing_time_seconds'] = (job.completed_at - job.created_at).total_seconds()
        
        if job.error_message:
            response['error_message'] = job.error_message
        
        # Add YouTube-specific fields
        if job.youtube_metadata:
            response['youtube_metadata'] = job.youtube_metadata
        if job.youtube_id:
            response['youtube_id'] = job.youtube_id
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/download/<job_id>', methods=['GET'])
def download_results(job_id):
    """
    Download processed stems as a ZIP file
    
    Returns:
        ZIP file containing separated audio stems
    """
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        if job.status != 'completed':
            return jsonify({
                'error': f'Job is not completed yet. Current status: {job.status}'
            }), 400
        
        # Create ZIP file
        zip_path = demucs_processor.create_output_zip(job_id)
        
        if not zip_path or not zip_path.exists():
            return jsonify({'error': 'Output files not found'}), 404
        
        logger.info(f"Job {job_id} downloaded")
        
        # Send file and schedule cleanup
        response = send_file(
            str(zip_path),
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'stems_{job_id}.zip'
        )
        
        # Schedule job cleanup after download
        job_manager.schedule_cleanup(job_id)
        
        return response
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/stream/<job_id>/<track_name>', methods=['GET'])
def stream_track_http(job_id, track_name):
    """
    HTTP endpoint for streaming individual track (alternative to socket.io)
    
    Returns:
        Audio file for the requested track
    """
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        if job.status != 'completed':
            return jsonify({'error': 'Job not completed yet'}), 400
        
        # Get output directory
        output_dir = job_manager.get_output_dir_for_job(job_id)
        
        # Determine the correct model output directory
        model_dir = output_dir / job.model
        if not model_dir.exists():
            # Try alternative model directory names
            for possible_dir in output_dir.iterdir():
                if possible_dir.is_dir():
                    model_dir = possible_dir
                    break
        
        # Find the track file
        track_file = None
        output_format = job.output_format or 'mp3'
        
        # Try exact match first
        possible_file = model_dir / f'{track_name}.{output_format}'
        if possible_file.exists():
            track_file = possible_file
        else:
            # Search for the file
            for file in model_dir.iterdir():
                if file.stem == track_name and file.suffix[1:] == output_format:
                    track_file = file
                    break
        
        if not track_file or not track_file.exists():
            return jsonify({'error': f'Track file not found: {track_name}'}), 404
        
        # Determine MIME type
        mime_type = 'audio/mpeg' if output_format == 'mp3' else 'audio/wav'
        
        logger.info(f"Streaming track {track_name} for job {job_id}")
        
        return send_file(
            str(track_file),
            mimetype=mime_type,
            as_attachment=False,
            download_name=f'{track_name}.{output_format}'
        )
        
    except Exception as e:
        logger.error(f"Stream error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/streams/<job_id>', methods=['GET'])
def get_available_streams(job_id):
    """
    Get list of available stem files for a job
    
    Returns:
        JSON with array of available stem names
    """
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        if job.status != 'completed':
            return jsonify({'error': 'Job not completed yet'}), 400
        
        # Get output directory
        output_dir = job_manager.get_output_dir_for_job(job_id)
        
        # Determine the correct model output directory
        model_dir = output_dir / job.model
        if not model_dir.exists():
            # Try alternative model directory names
            for possible_dir in output_dir.iterdir():
                if possible_dir.is_dir():
                    model_dir = possible_dir
                    break
        
        if not model_dir.exists():
            return jsonify({'error': 'Output directory not found'}), 404
        
        # List all audio files in the model directory
        output_format = job.output_format or 'mp3'
        available_stems = []
        
        for file in model_dir.iterdir():
            if file.is_file() and file.suffix[1:] == output_format:
                stem_name = file.stem
                available_stems.append(stem_name)
        
        # Sort stems to put them in a consistent order
        # Order: vocals, bass, drums, guitar, piano, other, then any "no_*" stems
        def sort_key(stem):
            order = {
                'vocals': 0,
                'bass': 1,
                'drums': 2,
                'guitar': 3,
                'piano': 4,
                'other': 5
            }
            
            # Check if it's a "no_*" stem
            if stem.startswith('no_'):
                # Sort no_* stems after their positive counterparts
                base_stem = stem[3:]  # Remove 'no_' prefix
                base_order = order.get(base_stem, 999)
                return base_order + 100
            else:
                return order.get(stem, 999)
        
        available_stems.sort(key=sort_key)
        
        return jsonify({'stems': available_stems}), 200
        
    except Exception as e:
        logger.error(f"Get streams error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/jobs', methods=['GET'])
def list_jobs():
    """
    List recent jobs (for debugging/monitoring)
    
    Query params:
        limit: Number of jobs to return (default: 10, max: 100)
    
    Returns:
        JSON array of recent jobs
    """
    try:
        limit = min(int(request.args.get('limit', 10)), 100)
        jobs = job_manager.list_recent_jobs(limit)
        
        return jsonify({
            'jobs': [
                {
                    'job_id': job.job_id,
                    'status': job.status,
                    'filename': job.filename,
                    'model': job.model,
                    'progress': job.progress,
                    'created_at': job.created_at.isoformat(),
                    'duration': job.duration,
                    'youtube_metadata': job.youtube_metadata
                }
                for job in jobs
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"List jobs error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/library', methods=['GET'])
def get_library():
    """
    Get paginated library of all jobs
    
    Query params:
        page: Page number (default: 1)
        page_size: Jobs per page (default: 50, max: 300)
    
    Returns:
        JSON with paginated jobs and metadata
    """
    try:
        page = int(request.args.get('page', 1))
        page_size = min(int(request.args.get('page_size', 50)), 300)
        
        result = job_manager.get_all_jobs_paginated(page, page_size)
        
        # Convert jobs to dict format
        jobs_data = []
        for job in result['jobs']:
            job_data = {
                'job_id': job.job_id,
                'status': job.status,
                'filename': job.filename,
                'model': job.model,
                'output_format': job.output_format,
                'stems': job.stems,
                'progress': job.progress,
                'created_at': job.created_at.isoformat(),
                'duration': job.duration,
                'source_type': job.source_type
            }
            
            # Add YouTube-specific fields
            if job.youtube_metadata:
                job_data['thumbnail'] = job.youtube_metadata.get('thumbnail')
                job_data['uploader'] = job.youtube_metadata.get('uploader')
                job_data['description'] = job.youtube_metadata.get('description', '')[:200]  # Truncate
                job_data['channel'] = job.youtube_metadata.get('channel')
            
            if job.error_message:
                job_data['error_message'] = job.error_message
            
            jobs_data.append(job_data)
        
        return jsonify({
            'jobs': jobs_data,
            'page': result['page'],
            'page_size': result['page_size'],
            'total_jobs': result['total_jobs'],
            'total_pages': result['total_pages']
        }), 200
        
    except Exception as e:
        logger.error(f"Library error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/jobs/<job_id>', methods=['DELETE'])
def delete_job(job_id):
    """
    Delete a job and all its files
    
    Returns:
        JSON with success message
    """
    try:
        success = job_manager.delete_job(job_id)
        
        if success:
            logger.info(f"Job {job_id} deleted via API")
            return jsonify({'message': 'Job deleted successfully'}), 200
        else:
            return jsonify({'error': 'Job not found or could not be deleted'}), 404
        
    except Exception as e:
        logger.error(f"Delete job error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/cancel/<job_id>', methods=['POST'])
def cancel_job(job_id):
    """
    Cancel a queued or processing job
    
    Returns:
        JSON with success message
    """
    try:
        job = job_manager.get_job(job_id)
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        if job.status in ['completed', 'failed', 'cancelled']:
            return jsonify({'error': f'Cannot cancel job with status: {job.status}'}), 400
        
        # Cancel the job
        success = job_manager.cancel_job(job_id)
        
        # If job is currently processing, kill the subprocess
        if job.status == 'processing':
            demucs_processor.cancel_current_job()
        
        if success:
            # Emit cancelled status
            socketio.emit(
                'progress',
                {
                    'job_id': job_id,
                    'status': 'cancelled',
                    'progress': 0,
                    'message': 'Job cancelled'
                },
                room=job_id,
                namespace='/progress'
            )
            return jsonify({'message': 'Job cancelled successfully'}), 200
        else:
            return jsonify({'error': 'Could not cancel job'}), 400
        
    except Exception as e:
        logger.error(f"Cancel job error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/refresh/<job_id>', methods=['POST'])
def refresh_job(job_id):
    """
    Refresh a job by deleting its output and re-adding to queue
    
    JSON body (optional):
        model: New model to use (default: keep existing)
        output_format: New output format (default: keep existing)
        stems: New stems option (default: keep existing)
    
    Returns:
        JSON with new job information
    """
    try:
        # Get existing job
        old_job = job_manager.get_job(job_id)
        if not old_job:
            return jsonify({'error': 'Job not found'}), 404
        
        # Get new parameters (or use existing)
        data = request.get_json() or {}
        model = data.get('model', old_job.model)
        output_format = data.get('output_format', old_job.output_format)
        stems = data.get('stems', old_job.stems)
        
        # Delete the old job output
        output_dir = job_manager.get_output_dir_for_job(job_id)
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
            logger.info(f"Deleted output for job {job_id} for refresh")
        
        # Create new job with same source
        if old_job.source_type == 'youtube':
            # Re-create YouTube job
            new_job = job_manager.create_job(
                filename=old_job.filename,
                model=model,
                output_format=output_format,
                stems=stems,
                source_type='youtube',
                youtube_url=old_job.youtube_url,
                youtube_metadata=old_job.youtube_metadata,
                youtube_id=old_job.youtube_id,
                duration=old_job.duration,
                use_hash_as_id=True
            )
        else:
            # Re-create upload job
            new_job = job_manager.create_job(
                filename=old_job.filename,
                model=model,
                output_format=output_format,
                stems=stems,
                source_type='upload',
                file_hash=old_job.file_hash,
                duration=old_job.duration,
                use_hash_as_id=True
            )
            
            # Copy input file back if it still exists
            old_input_dir = job_manager.get_job_input_dir(job_id)
            if old_input_dir.exists():
                new_input_dir = job_manager.get_job_input_dir(new_job.job_id)
                new_input_dir.mkdir(parents=True, exist_ok=True)
                
                import shutil
                for file in old_input_dir.iterdir():
                    if file.is_file():
                        shutil.copy2(file, new_input_dir / file.name)
        
        # Start processing
        demucs_processor.process_job(new_job.job_id)
        
        logger.info(f"Job {job_id} refreshed as {new_job.job_id}")
        
        return jsonify({
            'job_id': new_job.job_id,
            'status': new_job.status,
            'created_at': new_job.created_at.isoformat(),
            'filename': new_job.filename,
            'model': model,
            'message': 'Job refreshed and added to queue'
        }), 201
        
    except Exception as e:
        logger.error(f"Refresh job error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# Socket.IO Events
# ============================================================================

@socketio.on('connect', namespace='/progress')
def handle_connect():
    """Client connected to progress namespace"""
    emit('connected', {'message': 'Connected to progress updates'})


@socketio.on('disconnect', namespace='/progress')
def handle_disconnect():
    """Client disconnected from progress namespace"""
    pass


@socketio.on('subscribe', namespace='/progress')
def handle_subscribe(data):
    """Client subscribes to job updates"""
    job_id = data.get('job_id')
    if job_id:
        join_room(job_id, namespace='/progress')
        
        # Send current job status
        job = job_manager.get_job(job_id)
        if job:
            emit('progress', {
                'job_id': job.job_id,
                'status': job.status,
                'progress': job.progress,
                'message': f'Current status: {job.status}'
            }, room=request.sid)


# ============================================================================
# Audio Streaming Socket.IO Events
# ============================================================================

@socketio.on('connect', namespace='/audio')
def handle_audio_connect():
    """Client connected to audio streaming namespace"""
    logger.info('Audio streaming client connected')
    emit('connected', {'message': 'Connected to audio streaming'})


@socketio.on('disconnect', namespace='/audio')
def handle_audio_disconnect():
    """Client disconnected from audio streaming namespace"""
    logger.info('Audio streaming client disconnected')


@socketio.on('stream_track', namespace='/audio')
def handle_stream_track(data):
    """Stream audio track to client"""
    job_id = data.get('job_id')
    track_name = data.get('track_name')
    
    if not job_id or not track_name:
        emit('error', {'message': 'Missing job_id or track_name'})
        return
    
    logger.info(f'Streaming request for job {job_id}, track: {track_name}')
    
    # Get job details
    job = job_manager.get_job(job_id)
    if not job:
        emit('error', {'message': 'Job not found'})
        return
    
    if job.status != 'completed':
        emit('error', {'message': 'Job not completed yet'})
        return
    
    # Get output directory
    output_dir = job_manager.get_output_dir_for_job(job_id)
    
    # Determine the correct model output directory
    model_dir = output_dir / job.model
    if not model_dir.exists():
        # Try alternative model directory names
        for possible_dir in output_dir.iterdir():
            if possible_dir.is_dir():
                model_dir = possible_dir
                break
    
    # Find the track file
    track_file = None
    output_format = job.output_format or 'mp3'
    
    # Try exact match first
    possible_file = model_dir / f'{track_name}.{output_format}'
    if possible_file.exists():
        track_file = possible_file
    else:
        # Search for the file
        for file in model_dir.iterdir():
            if file.stem == track_name and file.suffix[1:] == output_format:
                track_file = file
                break
    
    if not track_file or not track_file.exists():
        logger.error(f'Track file not found: {track_name}.{output_format} in {model_dir}')
        emit('error', {'message': f'Track file not found: {track_name}'})
        return
    
    logger.info(f'Found track file: {track_file}')
    
    # Get audio duration using mutagen or similar
    import subprocess
    try:
        # Use ffprobe to get duration
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
             '-of', 'default=noprint_wrappers=1:nokey=1', str(track_file)],
            capture_output=True,
            text=True,
            timeout=5
        )
        duration = float(result.stdout.strip())
    except Exception as e:
        logger.warning(f'Could not get audio duration: {e}')
        duration = job.duration or 0
    
    # Stream file in chunks
    chunk_size = 64 * 1024  # 64KB chunks
    
    try:
        with open(track_file, 'rb') as f:
            chunk_num = 0
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                
                # Convert to base64 for transmission
                import base64
                chunk_b64 = base64.b64encode(chunk).decode('utf-8')
                
                # Send chunk
                emit('audio_chunk', {
                    'track_name': track_name,
                    'chunk': chunk_b64,
                    'chunk_num': chunk_num,
                    'is_complete': False,
                    'duration': duration
                })
                
                chunk_num += 1
                
                # Small delay to prevent overwhelming the client
                socketio.sleep(0.01)
            
            # Send completion message
            emit('audio_chunk', {
                'track_name': track_name,
                'chunk': '',
                'chunk_num': chunk_num,
                'is_complete': True,
                'duration': duration
            })
            
            logger.info(f'Completed streaming {track_name} ({chunk_num} chunks)')
            
    except Exception as e:
        logger.error(f'Error streaming track {track_name}: {str(e)}', exc_info=True)
        emit('error', {'message': f'Error streaming track: {str(e)}'})


# ============================================================================
# Background Tasks
# ============================================================================

def start_cleanup_scheduler():
    """Start background task to clean up old jobs"""
    import threading
    import time
    
    def cleanup_loop():
        # Wait before first run (don't cleanup immediately after loading jobs from disk)
        time.sleep(900)  # Wait 15 minutes before first cleanup
        
        while True:
            try:
                cleaned = job_manager.cleanup_old_jobs()
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} old jobs")
            except Exception as e:
                logger.error(f"Cleanup error: {str(e)}", exc_info=True)
            
            # Run every 15 minutes
            time.sleep(900)
    
    thread = threading.Thread(target=cleanup_loop, daemon=True)
    thread.start()
    logger.info("Cleanup scheduler started (first run in 15 minutes)")


# ============================================================================
# Main
# ============================================================================

def main():
    """Start the server"""
    port = int(os.getenv('SERVER_PORT', 8080))
    
    logger.info("=" * 60)
    logger.info("Demucs Web Server Starting")
    logger.info("=" * 60)
    logger.info(f"Port: {port}")
    logger.info(f"Max upload size: {app.config['MAX_CONTENT_LENGTH'] // (1024 * 1024)}MB")
    logger.info(f"Supported models: {', '.join(SUPPORTED_MODELS.keys())}")
    logger.info(f"Job retention: {os.getenv('JOB_RETENTION_HOURS', 1)} hours")
    logger.info("=" * 60)
    
    # Start cleanup scheduler
    start_cleanup_scheduler()
    
    # Start server
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False
    )


if __name__ == '__main__':
    main()

