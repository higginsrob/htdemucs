"""
YouTube Service - Handles YouTube video/playlist downloads and metadata
Uses command-line yt-dlp for better YouTube compatibility
"""

import os
import json
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class YouTubeMetadata:
    """Metadata for a YouTube video"""
    id: str
    title: str
    uploader: str
    duration: int  # seconds
    url: str
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    upload_date: Optional[str] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    channel: Optional[str] = None
    channel_url: Optional[str] = None


class YouTubeService:
    """Service for downloading and processing YouTube content using CLI"""
    
    def __init__(self):
        # Base command-line arguments for yt-dlp with aggressive bypass options
        self.base_args = [
            '--no-warnings',
            '--no-check-certificates',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--referer', 'https://www.youtube.com/',
            # Use multiple player clients to bypass restrictions
            '--extractor-args', 'youtube:player_client=android,ios,web,mweb',
            # Additional headers to avoid detection
            '--add-header', 'Accept-Language:en-US,en;q=0.9',
            '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            '--add-header', 'Sec-Fetch-Mode:navigate',
            # Use IPv4 to avoid IPv6 issues
            '--force-ipv4',
        ]
        
        # Check if cookies file exists (helps avoid bot detection)
        cookies_path = Path('/app/youtube_cookies.txt')
        if cookies_path.exists():
            self.base_args.extend(['--cookies', str(cookies_path)])
            logger.info("Using cookies file for YouTube authentication")
        
        logger.info("YouTubeService initialized (using CLI yt-dlp with aggressive bypass)")
    
    def _run_ytdlp(self, args: List[str]) -> Optional[Dict]:
        """
        Run yt-dlp CLI command and return JSON output
        
        Args:
            args: List of command-line arguments
            
        Returns:
            Parsed JSON output or None if failed
        """
        try:
            cmd = ['yt-dlp'] + self.base_args + args
            logger.info(f"Running yt-dlp: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"yt-dlp error: {result.stderr}")
                return None
            
            # Parse JSON output if present
            if '--dump-json' in args or '--dump-single-json' in args:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON: {e}")
                    return None
            
            return {'success': True, 'stdout': result.stdout}
            
        except subprocess.TimeoutExpired:
            logger.error("yt-dlp command timed out")
            return None
        except Exception as e:
            logger.error(f"Error running yt-dlp: {str(e)}", exc_info=True)
            return None
    
    def is_youtube_url(self, url: str) -> bool:
        """Check if URL is a valid YouTube URL"""
        youtube_domains = [
            'youtube.com',
            'youtu.be',
            'www.youtube.com',
            'm.youtube.com',
        ]
        return any(domain in url for domain in youtube_domains)
    
    def is_playlist(self, url: str) -> Tuple[bool, Optional[str]]:
        """
        Check if URL is a playlist
        
        Returns:
            (is_playlist, playlist_id)
        """
        try:
            # Use --dump-single-json to get one JSON object instead of multiple
            args = ['--dump-single-json', '--flat-playlist', '--no-download', url]
            info = self._run_ytdlp(args)
            
            if info and info.get('_type') == 'playlist':
                return True, info.get('id')
            else:
                return False, None
        
        except Exception as e:
            logger.error(f"Error checking if playlist: {str(e)}")
            return False, None
    
    def get_video_metadata(self, url: str) -> Optional[YouTubeMetadata]:
        """
        Extract metadata from a YouTube video
        
        Args:
            url: YouTube video URL
        
        Returns:
            YouTubeMetadata object or None if failed
        """
        try:
            # Use --dump-single-json to ensure we get one JSON object
            args = ['--dump-single-json', '--no-download', '--no-playlist', url]
            info = self._run_ytdlp(args)
            
            if not info:
                return None
            
            metadata = YouTubeMetadata(
                id=info.get('id', ''),
                title=info.get('title', 'Unknown'),
                uploader=info.get('uploader', 'Unknown'),
                duration=info.get('duration', 0),
                url=info.get('webpage_url', url),
                thumbnail=info.get('thumbnail'),
                description=info.get('description'),
                upload_date=info.get('upload_date'),
                view_count=info.get('view_count'),
                like_count=info.get('like_count'),
                channel=info.get('channel'),
                channel_url=info.get('channel_url'),
            )
            
            logger.info(f"Extracted metadata for video: {metadata.title}")
            return metadata
        
        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}", exc_info=True)
            return None
    
    def get_playlist_videos(self, url: str) -> List[Dict[str, str]]:
        """
        Get list of videos in a playlist
        
        Args:
            url: YouTube playlist URL
        
        Returns:
            List of dicts with 'url', 'title', 'id' for each video
        """
        try:
            args = ['--dump-single-json', '--flat-playlist', '--no-download', url]
            info = self._run_ytdlp(args)
            
            if not info or info.get('_type') != 'playlist':
                logger.error("URL is not a playlist")
                return []
            
            videos = []
            for entry in info.get('entries', []):
                if entry:  # Some entries might be None
                    videos.append({
                        'id': entry.get('id', ''),
                        'title': entry.get('title', 'Unknown'),
                        'url': f"https://www.youtube.com/watch?v={entry.get('id')}"
                    })
            
            logger.info(f"Found {len(videos)} videos in playlist: {info.get('title')}")
            return videos
        
        except Exception as e:
            logger.error(f"Error extracting playlist: {str(e)}", exc_info=True)
            return []
    
    def download_audio(self, url: str, output_path: Path) -> Tuple[Optional[Path], Optional[YouTubeMetadata]]:
        """
        Download audio from YouTube video using CLI
        
        Args:
            url: YouTube video URL
            output_path: Directory to save the audio file
        
        Returns:
            (Path to downloaded file, YouTubeMetadata) or (None, None) if failed
        """
        try:
            # First get metadata
            metadata = self.get_video_metadata(url)
            if not metadata:
                logger.error("Failed to get metadata, cannot download")
                return None, None
            
            # Create safe filename
            safe_title = "".join(c for c in metadata.title if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_title = safe_title[:100]  # Limit length
            
            output_template = str(output_path / f"{safe_title}.%(ext)s")
            
            logger.info(f"Downloading audio for: {metadata.title}")
            
            # Download using yt-dlp CLI
            args = [
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '0',  # Best quality
                '--output', output_template,
                '--no-playlist',
                url
            ]
            
            result = self._run_ytdlp(args)
            
            if not result:
                logger.error("Download failed")
                return None, None
            
            # Find the downloaded file
            downloaded_file = output_path / f"{safe_title}.mp3"
            
            if downloaded_file.exists():
                logger.info(f"Successfully downloaded: {downloaded_file}")
                return downloaded_file, metadata
            else:
                logger.error(f"Downloaded file not found: {downloaded_file}")
                return None, None
        
        except Exception as e:
            logger.error(f"Error downloading audio: {str(e)}", exc_info=True)
            return None, None
    
    def save_metadata_json(self, metadata: YouTubeMetadata, output_path: Path) -> Path:
        """
        Save metadata as JSON file
        
        Args:
            metadata: YouTubeMetadata object
            output_path: Path to save the JSON file
        
        Returns:
            Path to the saved JSON file
        """
        try:
            json_path = output_path / "metadata.json"
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(asdict(metadata), f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved metadata to: {json_path}")
            return json_path
        
        except Exception as e:
            logger.error(f"Error saving metadata: {str(e)}", exc_info=True)
            raise

