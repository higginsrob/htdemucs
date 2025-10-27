# Demucs Web Application

A modern web application for audio source separation using [Demucs](https://github.com/adefossez/demucs). Split music tracks into separate stems (bass, drums, vocals, and other instruments) through an intuitive web interface with real-time progress tracking.

## Based On

This project is **based on** [xserrat/docker-facebook-demucs](https://github.com/xserrat/docker-facebook-demucs), which provides an excellent Dockerized implementation of Demucs. This repository extends that foundation with a full-featured web application, real-time processing updates, YouTube integration, and an interactive audio player.

## Features

- 🎵 **Web-Based Interface** - Upload audio files or paste YouTube URLs directly in your browser
- 📊 **Real-Time Progress** - Watch separation progress with live updates via Socket.IO
- 🎚️ **Interactive Audio Player** - Play and mix separated stems with individual volume controls
- 📋 **Job Queue Management** - Process multiple tracks and view job history
- 🎬 **YouTube Integration** - Download and process audio from YouTube videos automatically
- 🎯 **Multiple Models** - Choose from htdemucs, htdemucs_ft, htdemucs_6s, and more
- 💬 **AI Chatbot Assistant** - Get instant help with 50+ pre-programmed Q&A scenarios
- 🔄 **Persistent Storage** - All processed tracks saved and accessible via the UI
- 🎨 **Modern UI** - Clean, responsive interface with dark theme support

## Quick Start

### Prerequisites

- Docker installed and running
- Make utility (standard on macOS/Linux)
- 4GB+ RAM recommended
- Optional: NVIDIA GPU with CUDA support for faster processing

Check your system:
```bash
make check
```

### Running the Development Server

1. **Clone this repository**
   ```bash
   git clone git@github.com:higginsrob/htdemucs.git demucs
   cd demucs
   ```

2. **Start the server**
   ```bash
   make dev
   ```
   
   This will:
   - Build the Docker image (first time only)
   - Start the web server on http://localhost:8080
   - Mount the static files for live editing
   - Stream logs to your terminal

3. **Open in your browser**
   ```
   http://localhost:8080
   ```

### Production Mode

For production deployment with background running:

```bash
# Build and start server in background
make server-run

# View logs
make server-logs

# Stop server
make server-stop
```

### With GPU Support

If you have an NVIDIA GPU with CUDA:

```bash
make server-run-gpu
```

## How It Works

### Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (Static HTML)  │
└────────┬────────┘
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│  Flask Server   │
│  + Socket.IO    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────┐
│  Job Manager    │────→│ Demucs Core  │
│  (Queue System) │     │  (Processor) │
└─────────────────┘     └──────────────┘
         │
         ↓
┌─────────────────┐
│  File Storage   │
│   /app/output   │
└─────────────────┘
```

### Processing Flow

1. **Upload** - User uploads audio file or provides YouTube URL
2. **Queue** - Job added to processing queue with unique ID
3. **Download** (if YouTube) - Audio downloaded via yt-dlp
4. **Process** - Demucs separates audio into stems
5. **Progress** - Real-time updates sent via Socket.IO
6. **Complete** - Stems saved and available for playback/download
7. **Persist** - All output saved to mounted volume

### API Endpoints

- `POST /api/upload` - Upload audio file for processing
- `POST /api/upload_youtube` - Submit YouTube URL for processing  
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/<job_id>` - Get job status
- `GET /api/jobs/<job_id>/stems` - List available stems
- `GET /api/jobs/<job_id>/stems/<stem>` - Stream audio stem
- `DELETE /api/jobs/<job_id>` - Cancel/delete job

### Socket.IO Events

- `progress` - Processing progress updates (0-100%)
- `completed` - Job completed successfully
- `failed` - Job failed with error message

## Development

### Project Structure

```
.
├── demucs/                  # Demucs Docker base image
│   ├── Dockerfile          # Base Demucs image
│   ├── models/             # Downloaded model cache (persisted)
│   └── output/             # Processed stems (persisted)
├── server/                  # Web application
│   ├── Dockerfile          # Web server image (extends demucs)
│   ├── app/
│   │   ├── server.py       # Flask application
│   │   ├── services/       # Business logic
│   │   │   ├── demucs_processor.py
│   │   │   ├── job_manager.py
│   │   │   └── youtube_service.py
│   │   └── utils/          # Validation, helpers
│   ├── static/             # Frontend assets
│   │   ├── index.html      # Main UI
│   │   ├── css/style.css   # Styling
│   │   └── js/             # Client-side JavaScript
│   │       ├── app.js      # Main application
│   │       └── chatbot.js  # AI assistant
│   └── requirements.txt    # Python dependencies
├── scripts/                 # Helper scripts
├── Makefile                # Build and run commands
└── README.md               # This file
```

### Development Workflow

1. **Edit static files** (HTML/CSS/JS)
   ```bash
   # Files are live-mounted, just refresh browser
   # Edit: server/static/**/*
   ```

2. **Edit Python code**
   ```bash
   # Rebuild and restart
   make dev
   ```

3. **Test changes**
   ```bash
   # Upload a test file via the web UI
   # Watch logs in the terminal
   ```

4. **View logs**
   ```bash
   make server-logs
   ```

### Available Commands

```bash
make help            # Show all available commands
make check           # Check system prerequisites
make build           # Build base Demucs image
make server-build    # Build web server image
make server-run      # Run in background (production)
make dev             # Run in foreground (development)
make server-stop     # Stop server
make server-logs     # View logs
make clean-outputs   # Clean processed files
make clean-all       # Clean everything
```

## Features in Detail

### AI Chatbot Assistant

The web interface includes an intelligent chatbot that can answer questions about:

- Uploading files and using YouTube URLs
- Choosing the right model for your needs
- Understanding processing times and requirements
- Creating karaoke tracks or instrumental versions
- Troubleshooting errors
- Using the audio player and mixer
- And 50+ more scenarios

Click the chat icon in the bottom-right corner to start!

See **[server/CHATBOT_GUIDE.md](server/CHATBOT_GUIDE.md)** for complete documentation.

### Audio Models

| Model | Description | Stems | Best For |
|-------|-------------|-------|----------|
| `htdemucs` | Hybrid Transformer Demucs | 4 | General use, balanced quality/speed |
| `htdemucs_ft` | Fine-tuned version (default) | 4 | Best quality, recommended |
| `htdemucs_6s` | 6-stem model | 6 | Bass, drums, vocals, guitar, piano, other |
| `mdx_extra` | MDX-Net Extra | 4 | Alternative high-quality option |

### YouTube Integration

1. Paste any YouTube URL into the web interface
2. Audio is automatically downloaded (audio-only, no video)
3. Processing begins immediately
4. Metadata (title, artist) extracted and saved

## Documentation

- **[instructions/DEVELOPMENT.md](instructions/DEVELOPMENT.md)** - Development guide
- **[server/CHATBOT_GUIDE.md](server/CHATBOT_GUIDE.md)** - Chatbot documentation
- **[server/TESTING.md](server/TESTING.md)** - Testing guide
- **[instructions/TROUBLESHOOTING.md](instructions/TROUBLESHOOTING.md)** - Troubleshooting

## Troubleshooting

### Server won't start

```bash
# Check Docker is running
docker info

# Check port 8080 is available
lsof -i :8080

# View detailed logs
make server-logs
```

### Processing is slow

- Use `make server-run-gpu` if you have an NVIDIA GPU
- Choose `htdemucs` instead of `htdemucs_ft` for faster processing
- Shorter audio files process faster

### Models re-downloading

Make sure the models volume is properly mounted:
```bash
docker inspect demucs | grep models
```

### Out of disk space

```bash
# Clean old outputs
make clean-outputs
```

## Contributing

Contributions welcome! Please see [instructions/DEVELOPMENT.md](instructions/DEVELOPMENT.md) for guidelines.

## Credits

- **[Meta's Demucs](https://github.com/adefossez/demucs)** - The core audio separation engine
- **[xserrat/docker-facebook-demucs](https://github.com/xserrat/docker-facebook-demucs)** - Dockerized Demucs foundation that this project builds upon

## License

This repository is released under the MIT license as found in the [LICENSE](LICENSE) file.
