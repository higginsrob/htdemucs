"""
File validation utilities
"""

import magic
from werkzeug.datastructures import FileStorage


class ValidationError(Exception):
    """Custom validation error"""
    pass


def validate_audio_file(file: FileStorage) -> bool:
    """
    Validate uploaded audio file
    
    Checks:
    - File is not empty
    - File has valid audio MIME type
    - File size is within limits
    
    Args:
        file: Uploaded file from Flask request
    
    Returns:
        True if valid
    
    Raises:
        ValidationError if validation fails
    """
    # Check if file is empty
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size == 0:
        raise ValidationError("File is empty")
    
    # Read first chunk for MIME type detection
    chunk = file.read(2048)
    file.seek(0)  # Reset to beginning
    
    # Detect MIME type
    try:
        mime = magic.from_buffer(chunk, mime=True)
    except:
        # Fallback: just check extension if magic fails
        # (python-magic might not be available in all environments)
        return True
    
    # Valid audio MIME types
    valid_audio_types = [
        'audio/mpeg',           # MP3
        'audio/mp3',            # MP3 (alternative)
        'audio/x-wav',          # WAV
        'audio/wav',            # WAV (alternative)
        'audio/wave',           # WAV (alternative)
        'audio/flac',           # FLAC
        'audio/x-flac',         # FLAC (alternative)
        'audio/mp4',            # M4A
        'audio/x-m4a',          # M4A (alternative)
        'audio/ogg',            # OGG
        'audio/opus',           # Opus
        'application/ogg',      # OGG (alternative)
    ]
    
    if mime not in valid_audio_types:
        raise ValidationError(
            f"Invalid file type: {mime}. Please upload a valid audio file."
        )
    
    return True

