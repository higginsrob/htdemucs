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
    logger=True,
    engineio_logger=False
)

# Initialize services
job_manager = JobManager()
demucs_processor = DemucsProcessor(socketio, job_manager)

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
        
        # Create job and save file
        filename = secure_filename(file.filename)
        job = job_manager.create_job(filename, model, output_format, stems)
        
        # Save uploaded file
        job_input_dir = job_manager.get_job_input_dir(job.job_id)
        job_input_dir.mkdir(parents=True, exist_ok=True)
        input_file_path = job_input_dir / filename
        file.save(str(input_file_path))
        
        logger.info(f"Job {job.job_id} created: {filename} (model={model}, format={output_format}, stems={stems})")
        
        # Start processing in background
        demucs_processor.process_job(job.job_id)
        
        return jsonify({
            'job_id': job.job_id,
            'status': job.status,
            'created_at': job.created_at.isoformat(),
            'filename': filename,
            'model': model
        }), 201
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
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
        }
        
        if job.started_at:
            response['started_at'] = job.started_at.isoformat()
        
        if job.completed_at:
            response['completed_at'] = job.completed_at.isoformat()
            response['processing_time_seconds'] = (job.completed_at - job.started_at).total_seconds()
        
        if job.error_message:
            response['error_message'] = job.error_message
        
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
                    'created_at': job.created_at.isoformat()
                }
                for job in jobs
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"List jobs error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# Socket.IO Events
# ============================================================================

@socketio.on('connect', namespace='/progress')
def handle_connect():
    """Client connected to progress namespace"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to progress updates'})


@socketio.on('disconnect', namespace='/progress')
def handle_disconnect():
    """Client disconnected from progress namespace"""
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on('subscribe', namespace='/progress')
def handle_subscribe(data):
    """Client subscribes to job updates"""
    job_id = data.get('job_id')
    if job_id:
        join_room(job_id, namespace='/progress')
        logger.info(f"Client {request.sid} subscribed to job {job_id}")
        
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
# Background Tasks
# ============================================================================

def start_cleanup_scheduler():
    """Start background task to clean up old jobs"""
    import threading
    import time
    
    def cleanup_loop():
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
    logger.info("Cleanup scheduler started")


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

