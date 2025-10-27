// Demucs Web UI - Client-side JavaScript (with YouTube support)

let currentJobId = null;
let currentSourceType = 'file'; // 'file' or 'youtube'
let socket = null;
let playlistJobs = [];
let queueJobs = {}; // Store all jobs by ID for quick lookup
let currentFilter = 'all'; // Queue filter: all, processing, queued, completed
let queueRefreshInterval = null;
let currentView = 'add'; // Current view: 'add', 'monitor', or 'library'

// Library state
let libraryJobs = [];
let currentPage = 1;
let totalPages = 1;
let totalJobs = 0;
const pageSize = 50;

// Player state
let currentPlayerJob = null;
let playerTracks = {};  // Stores Tone.js Player instances for each track
let playerIsPlaying = false;
let playerDuration = 0;
let playerCurrentTime = 0;  // Track current playback position
let playbackStartTime = 0;  // Timestamp when playback started
let playerUpdateInterval = null;
let mixerVisible = false;
let trackConfigs = {
    '4': ['vocals', 'bass', 'drums', 'other'],
    '6': ['vocals', 'bass', 'drums', 'other', 'guitar', 'piano']
};
let masterGain = null;
let audioSocket = null; // Separate socket for audio streaming

// ============================================================================
// Toast Notification Functions
// ============================================================================

function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toast-container');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    
    container.appendChild(toast);
    
    // Close on button click
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }
}

function removeToast(toast) {
    toast.classList.add('slide-out');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// DOM Elements
const uploadSection = document.getElementById('upload-section');
const progressSection = document.getElementById('progress-section');
const playlistSection = document.getElementById('playlist-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');
const queueSection = document.getElementById('queue-section');

// Source selector
const fileSourceBtn = document.getElementById('file-source-btn');
const youtubeSourceBtn = document.getElementById('youtube-source-btn');
const uploadForm = document.getElementById('upload-form');
const youtubeForm = document.getElementById('youtube-form');

// Form inputs
const audioFileInput = document.getElementById('audio-file');
const fileNameSpan = document.getElementById('file-name');
const youtubeUrlInput = document.getElementById('youtube-url');
const submitBtn = document.getElementById('submit-btn');

// Progress
const processingFile = document.getElementById('processing-file');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const statusMessage = document.getElementById('status-message');
const queueInfo = document.getElementById('queue-info');
const queueMessage = document.getElementById('queue-message');

// Playlist
const playlistMessage = document.getElementById('playlist-message');
const playlistJobsDiv = document.getElementById('playlist-jobs');
const viewQueueBtn = document.getElementById('view-queue-btn');
const newUploadFromPlaylistBtn = document.getElementById('new-upload-from-playlist-btn');

// Result
const downloadBtn = document.getElementById('download-btn');
const newUploadBtn = document.getElementById('new-upload-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

// Queue
const queueList = document.getElementById('queue-list');
const refreshQueueBtn = document.getElementById('refresh-queue-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const statProcessing = document.getElementById('stat-processing');
const statQueued = document.getElementById('stat-queued');
const statCompleted = document.getElementById('stat-completed');
const toggleStatsBtn = document.getElementById('toggle-stats-btn');
const queueStats = document.getElementById('queue-stats');

// View Switcher
const addViewBtn = document.getElementById('add-view-btn');
const monitorViewBtn = document.getElementById('monitor-view-btn');
const libraryViewBtn = document.getElementById('library-view-btn');
const addView = document.getElementById('add-view');
const monitorView = document.getElementById('monitor-view');
const libraryView = document.getElementById('library-view');
const activeJobsBadge = document.getElementById('active-jobs-badge');

// Library elements
const refreshLibraryBtn = document.getElementById('refresh-library-btn');
const libraryTableBody = document.getElementById('library-table-body');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageNumbers = document.getElementById('page-numbers');
const pageInfo = document.getElementById('page-info');
const libStatTotal = document.getElementById('lib-stat-total');
const libStatCompleted = document.getElementById('lib-stat-completed');
const libStatProcessing = document.getElementById('lib-stat-processing');
const toggleLibraryStatsBtn = document.getElementById('toggle-library-stats-btn');
const libraryStats = document.getElementById('library-stats');
const libraryPagination = document.getElementById('library-pagination');
const paginationInfo = document.getElementById('pagination-info');

// Player elements
const playerViewBtn = document.getElementById('player-view-btn');
const playerView = document.getElementById('player-view');
const playerArtworkImg = document.getElementById('player-artwork-img');
const playerArtworkPlaceholder = document.getElementById('player-artwork-placeholder');
const playerSongTitle = document.getElementById('player-song-title');
const playerArtist = document.getElementById('player-artist');
const playerModelInfo = document.getElementById('player-model-info');
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const restartBtn = document.getElementById('restart-btn');
const prevTrackBtn = document.getElementById('prev-track-btn');
const nextTrackBtn = document.getElementById('next-track-btn');
const toggleMixerBtn = document.getElementById('toggle-mixer-btn');
const currentTimeDisplay = document.getElementById('current-time');
const totalTimeDisplay = document.getElementById('total-time');
const timelineTrack = document.getElementById('timeline-track');
const timelineProgress = document.getElementById('timeline-progress');
const timelineHandle = document.getElementById('timeline-handle');
const playerMixer = document.getElementById('player-mixer');
const mixerChannels = document.getElementById('mixer-channels');
const masterVolumeKnob = document.getElementById('master-volume-knob');
const masterVolumeValue = document.getElementById('master-volume-value');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    restoreUIState(); // Restore saved UI state first
    setupEventListeners();
    connectSocket();
    initQueue();
    initPlayer();
});

// ============================================================================
// UI State Persistence (localStorage)
// ============================================================================

function saveViewState(view) {
    try {
        localStorage.setItem('demucs_current_view', view);
    } catch (error) {
        console.warn('Failed to save view state to localStorage:', error);
    }
}

function restoreViewState() {
    try {
        const savedView = localStorage.getItem('demucs_current_view');
        if (savedView && ['add', 'monitor', 'library', 'player'].includes(savedView)) {
            return savedView;
        }
    } catch (error) {
        console.warn('Failed to restore view state from localStorage:', error);
    }
    return 'add'; // Default to 'add' view
}

function saveStatsState(statsId, isVisible) {
    try {
        localStorage.setItem(`demucs_stats_visible_${statsId}`, String(isVisible));
    } catch (error) {
        console.warn(`Failed to save stats state for ${statsId}:`, error);
    }
}

function restoreStatsState(statsId) {
    try {
        const saved = localStorage.getItem(`demucs_stats_visible_${statsId}`);
        return saved === 'true';
    } catch (error) {
        console.warn(`Failed to restore stats state for ${statsId}:`, error);
    }
    return false; // Default to hidden
}

function restoreUIState() {
    // Restore view state
    const savedView = restoreViewState();
    
    // Restore stats visibility
    const queueStatsVisible = restoreStatsState('queue');
    const libraryStatsVisible = restoreStatsState('library');
    
    // Set initial states before any other rendering happens
    if (queueStats) {
        queueStats.style.display = queueStatsVisible ? 'grid' : 'none';
    }
    if (libraryStats) {
        libraryStats.style.display = libraryStatsVisible ? 'grid' : 'none';
    }
    
    // Switch to saved view (this will also activate the button)
    if (savedView && savedView !== 'add') {
        switchView(savedView, false); // Don't save again
    }
}

// ============================================================================
// Mixer State Persistence (localStorage)
// ============================================================================

function saveMixerState(jobId) {
    try {
        const mixerState = {
            master: {
                volume: masterGain ? masterGain.gain.value : 0.8
            },
            tracks: {}
        };
        
        Object.entries(playerTracks).forEach(([trackName, track]) => {
            mixerState.tracks[trackName] = {
                volume: track.volume || 1.0,
                pan: track.panValue || 0,
                muted: track.muted || false,
                solo: track.solo || false
            };
        });
        
        localStorage.setItem(`demucs_mixer_${jobId}`, JSON.stringify(mixerState));
    } catch (error) {
        console.warn('Failed to save mixer state:', error);
    }
}

function restoreMixerState(jobId) {
    try {
        const saved = localStorage.getItem(`demucs_mixer_${jobId}`);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to restore mixer state:', error);
    }
    return null;
}

function applyMixerState(mixerState) {
    if (!mixerState) return;
    
    // Apply master volume
    if (mixerState.master && masterGain) {
        const masterVolume = mixerState.master.volume;
        masterGain.gain.value = masterVolume;
        
        // Update master knob visual
        const rotation = (masterVolume - 0.5) * 270;
        masterVolumeKnob.querySelector('.knob-indicator').style.transform = `rotate(${rotation}deg)`;
        masterVolumeValue.textContent = `${Math.round(masterVolume * 100)}%`;
    }
    
    // Apply track settings
    if (mixerState.tracks) {
        Object.entries(mixerState.tracks).forEach(([trackName, settings]) => {
            const track = playerTracks[trackName];
            if (!track) return;
            
            // Set volume
            track.volume = settings.volume;
            track.panValue = settings.pan;
            track.muted = settings.muted;
            track.solo = settings.solo;
            
            // Update audio nodes
            track.pan.pan.value = settings.pan;
            
            // Update visual indicators
            updateTrackKnobVisuals(trackName, settings);
            
            // Update mute/solo buttons
            const muteBtn = document.getElementById(`${trackName}-mute`);
            const soloBtn = document.getElementById(`${trackName}-solo`);
            if (muteBtn) muteBtn.classList.toggle('active', settings.muted);
            if (soloBtn) soloBtn.classList.toggle('active', settings.solo);
        });
        
        // Apply gain values considering mute/solo state
        updateAllTrackGains();
    }
}

function updateTrackKnobVisuals(trackName, settings) {
    // Update volume knob
    const volumeKnob = document.getElementById(`${trackName}-volume-knob`);
    const volumeValue = document.getElementById(`${trackName}-volume-value`);
    if (volumeKnob && volumeValue) {
        const volumeRotation = (settings.volume - 0.5) * 270;
        volumeKnob.querySelector('.knob-indicator').style.transform = `rotate(${volumeRotation}deg)`;
        volumeValue.textContent = `${Math.round(settings.volume * 100)}%`;
    }
    
    // Update pan knob
    const panKnob = document.getElementById(`${trackName}-pan-knob`);
    const panValue = document.getElementById(`${trackName}-pan-value`);
    if (panKnob && panValue) {
        const panRotation = settings.pan * 135;
        panKnob.querySelector('.knob-indicator').style.transform = `rotate(${panRotation}deg)`;
        
        if (settings.pan < -0.1) {
            panValue.textContent = `L${Math.round(Math.abs(settings.pan) * 100)}`;
        } else if (settings.pan > 0.1) {
            panValue.textContent = `R${Math.round(settings.pan * 100)}`;
        } else {
            panValue.textContent = 'C';
        }
    }
}

function updateAllTrackGains() {
    const anySoloed = Object.values(playerTracks).some(t => t.solo);
    
    Object.entries(playerTracks).forEach(([name, track]) => {
        if (anySoloed) {
            track.gain.gain.value = track.solo ? track.volume : 0;
        } else {
            track.gain.gain.value = track.muted ? 0 : track.volume;
        }
    });
}

function setupEventListeners() {
    // Source type switching
    fileSourceBtn.addEventListener('click', () => switchSource('file'));
    youtubeSourceBtn.addEventListener('click', () => switchSource('youtube'));

    // File input change
    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            fileNameSpan.textContent = file.name;
            fileNameSpan.style.color = 'var(--text-primary)';
        } else {
            fileNameSpan.textContent = 'Choose an audio file...';
            fileNameSpan.style.color = 'var(--text-secondary)';
        }
    });

    // Form submit (handles both file and YouTube)
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentSourceType === 'file') {
            handleFileUpload();
        } else {
            handleYoutubeSubmit();
        }
    });

    // Buttons
    downloadBtn.addEventListener('click', handleDownload);
    newUploadBtn.addEventListener('click', resetToUpload);
    newUploadFromPlaylistBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', resetToUpload);
    viewQueueBtn.addEventListener('click', () => switchView('monitor'));

    // Queue controls
    refreshQueueBtn.addEventListener('click', () => {
        refreshQueue();
        // Add a brief rotation animation
        refreshQueueBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshQueueBtn.style.transform = '';
        }, 500);
    });

    clearHistoryBtn.addEventListener('click', clearQueueStorage);
    downloadAllBtn.addEventListener('click', downloadAllCompleted);

    // Queue filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderQueue();
        });
    });
    
    // Toggle stats
    toggleStatsBtn.addEventListener('click', () => {
        const isVisible = queueStats.style.display !== 'none';
        queueStats.style.display = isVisible ? 'none' : 'grid';
        saveStatsState('queue', !isVisible);
    });

    // View switcher
    addViewBtn.addEventListener('click', () => switchView('add'));
    monitorViewBtn.addEventListener('click', () => switchView('monitor'));
    libraryViewBtn.addEventListener('click', () => switchView('library'));
    playerViewBtn.addEventListener('click', () => switchView('player'));
    
    // Player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    restartBtn.addEventListener('click', restartPlayback);
    prevTrackBtn.addEventListener('click', playPreviousTrack);
    nextTrackBtn.addEventListener('click', playNextTrack);
    toggleMixerBtn.addEventListener('click', toggleMixer);
    
    // Timeline scrubbing
    timelineTrack.addEventListener('mousedown', startTimelineScrub);
    timelineTrack.addEventListener('touchstart', startTimelineScrub);
    
    // Master volume knob
    masterVolumeKnob.addEventListener('mousedown', (e) => startKnobDrag(e, 'master', 'volume'));
    masterVolumeKnob.addEventListener('touchstart', (e) => startKnobDrag(e, 'master', 'volume'));
    
    // Library controls
    refreshLibraryBtn.addEventListener('click', () => {
        fetchLibrary(currentPage);
        // Add a brief rotation animation
        refreshLibraryBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshLibraryBtn.style.transform = '';
        }, 500);
    });
    
    // Toggle library stats
    toggleLibraryStatsBtn.addEventListener('click', () => {
        const isVisible = libraryStats.style.display !== 'none';
        libraryStats.style.display = isVisible ? 'none' : 'grid';
        saveStatsState('library', !isVisible);
    });
    
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchLibrary(currentPage - 1);
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchLibrary(currentPage + 1);
        }
    });
}

function switchSource(sourceType) {
    currentSourceType = sourceType;
    
    if (sourceType === 'file') {
        fileSourceBtn.classList.add('active');
        youtubeSourceBtn.classList.remove('active');
        uploadForm.classList.add('active');
        youtubeForm.classList.remove('active');
    } else {
        youtubeSourceBtn.classList.add('active');
        fileSourceBtn.classList.remove('active');
        youtubeForm.classList.add('active');
        uploadForm.classList.remove('active');
    }
}

function connectSocket() {
    socket = io('/progress', {
        transports: ['websocket', 'polling']
    });

    // socket.on('connect', () => {
    //     console.log('Socket.IO connected');
    // });

    // socket.on('disconnect', () => {
    //     console.log('Socket.IO disconnected');
    // });

    socket.on('progress', (data) => {
        // console.log('Progress update:', data);
        
        // Update current job if viewing progress
        if (currentJobId === data.job_id) {
            updateProgress(data.progress, data.message);
        }
        
        // Update queue with new job data
        updateQueueJob(data.job_id, {
            status: data.status,
            progress: data.progress,
            progress_message: data.message  // Store the detailed message
        });
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showError(data.error_message);
    });

    // socket.on('connected', (data) => {
    //     console.log('Connected to progress updates:', data);
    // });
}

async function handleFileUpload() {
    const file = audioFileInput.files[0];
    if (!file) {
        showToast('warning', 'No File Selected', 'Please select a file to upload.');
        return;
    }

    // Check file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('error', 'File Too Large', 'File is too large. Maximum size is 100MB.');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Uploading...';

    // Prepare form data
    const formData = new FormData();
    formData.append('audio_file', file);
    formData.append('model', document.getElementById('model').value);
    formData.append('output_format', document.getElementById('output-format').value);
    formData.append('stems', document.getElementById('stems').value);

    try {
        // Upload file
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        // Store job ID and subscribe to updates
        currentJobId = data.job_id;
        socket.emit('subscribe', { job_id: currentJobId });

        // Add to queue (will be refreshed from server automatically)
        queueJobs[data.job_id] = {
            job_id: data.job_id,
            status: data.status,
            filename: data.filename,
            model: data.model,
            output_format: document.getElementById('output-format').value,
            stems: document.getElementById('stems').value,
            progress: 0,
            created_at: data.created_at,
            cached: data.cached || false
        };
        renderQueue();
        
        // Immediately refresh from server to get complete data
        setTimeout(() => refreshQueue(), 500);

        // Auto-switch to monitor view
        switchView('monitor');

        // Show cached message if applicable
        if (data.cached && data.message) {
            showToast('success', 'Cached', data.message);
        }

        // Show progress section
        showProgress(file.name);

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
    }
}

async function handleYoutubeSubmit() {
    const url = youtubeUrlInput.value.trim();
    if (!url) {
        showToast('warning', 'No URL Provided', 'Please enter a YouTube URL.');
        return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Processing...';

    try {
        // Submit YouTube URL
        const response = await fetch('/api/youtube', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                model: document.getElementById('model').value,
                output_format: document.getElementById('output-format').value,
                stems: document.getElementById('stems').value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'YouTube processing failed');
        }

        if (data.type === 'playlist') {
            // Add all playlist jobs to queue (will be refreshed from server)
            data.jobs.forEach(job => {
                queueJobs[job.job_id] = {
                    job_id: job.job_id,
                    status: job.status,
                    filename: job.title,
                    model: data.jobs[0].model || document.getElementById('model').value,
                    output_format: document.getElementById('output-format').value,
                    stems: document.getElementById('stems').value,
                    progress: 0,
                    created_at: new Date().toISOString(),
                    cached: job.cached || false
                };
            });
            renderQueue();
            
            // Immediately refresh from server to get complete data
            setTimeout(() => refreshQueue(), 500);
            
            // Auto-switch to monitor view
            switchView('monitor');
            
            // Show playlist response with stats
            let title = 'Playlist Added';
            let message = data.message;
            if (data.jobs_cached > 0) {
                message += ` | ${data.jobs_cached} video(s) already processed (cached)`;
            }
            message += ' | Note: Videos over 10 minutes will be skipped during processing.';
            showToast('success', title, message, 8000);
            
            // Show playlist queue
            showPlaylist(data);
        } else {
            // Single video - show progress
            currentJobId = data.job_id;
            socket.emit('subscribe', { job_id: currentJobId });
            
            // Add to queue (will be refreshed from server)
            queueJobs[data.job_id] = {
                job_id: data.job_id,
                status: data.status,
                filename: data.title,
                model: document.getElementById('model').value,
                output_format: document.getElementById('output-format').value,
                stems: document.getElementById('stems').value,
                progress: 0,
                created_at: data.created_at,
                cached: data.cached || false
            };
            renderQueue();
            
            // Immediately refresh from server to get complete data
            setTimeout(() => refreshQueue(), 500);
            
            // Auto-switch to monitor view
            switchView('monitor');
            
            // Show cached message if applicable
            if (data.cached && data.message) {
                showToast('success', 'Cached', data.message);
            }
            
            showProgress(data.title);
        }

    } catch (error) {
        console.error('YouTube error:', error);
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
    }
}

function showProgress(filename) {
    // Don't show individual progress section - use queue instead
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    playlistSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    // The queue will show the progress
    // processingFile.textContent = `Processing: ${filename}`;
    // updateProgress(0, 'Waiting in queue...');
}

function showPlaylist(data) {
    // Don't show playlist section - queue shows everything
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    playlistSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    playlistJobs = data.jobs;
    
    // Subscribe to updates for all jobs
    data.jobs.forEach(job => {
        socket.emit('subscribe', { job_id: job.job_id });
    });

    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
}

function updateProgress(progress, message) {
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;
    statusMessage.textContent = message || 'Processing...';

    if (progress >= 100) {
        setTimeout(() => showResult(), 500);
    }
}

function showResult() {
    // Don't show result section - downloads are in queue
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    playlistSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // Queue will show the download button
}

function showError(message) {
    // Show error in queue instead
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    playlistSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Show error toast
    showToast('error', 'Error', message);
    
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
    
    // Switch back to Add view so user can try again
    switchView('add');
}

function handleDownload() {
    if (!currentJobId) return;

    // Open download in current window
    window.location.href = `/api/download/${currentJobId}`;
}

function resetToUpload() {
    uploadSection.style.display = 'block';
    progressSection.style.display = 'none';
    playlistSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Reset forms
    audioFileInput.value = '';
    youtubeUrlInput.value = '';
    fileNameSpan.textContent = 'Choose an audio file...';
    fileNameSpan.style.color = 'var(--text-secondary)';
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '🎯 Separate Stems';

    currentJobId = null;
    playlistJobs = [];
    
    // Switch to add view
    switchView('add');
}

// Check status periodically (fallback if websocket fails)
function checkStatus() {
    if (!currentJobId) return;

    fetch(`/api/status/${currentJobId}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'completed') {
                showResult();
            } else if (data.status === 'failed') {
                showError(data.error_message || 'Processing failed');
            } else {
                updateProgress(data.progress, `Status: ${data.status}`);
                setTimeout(checkStatus, 2000);
            }
        })
        .catch(error => {
            console.error('Status check error:', error);
        });
}

// ============================================================================
// Queue Management
// ============================================================================

function initQueue() {
    // Load jobs from backend on startup
    // console.log('Initializing queue - loading from server...');
    refreshQueue();
    
    // Auto-refresh every 15 seconds (WebSocket provides real-time updates)
    queueRefreshInterval = setInterval(() => {
        refreshQueue();
    }, 15000);
}

function clearQueueStorage() {
    if (confirm('Are you sure you want to clear the completed job history from view? Active jobs will remain.')) {
        // Keep only active jobs (queued/processing)
        const activeJobs = {};
        Object.entries(queueJobs).forEach(([jobId, job]) => {
            if (job.status && (job.status.toLowerCase() === 'queued' || job.status.toLowerCase() === 'processing')) {
                activeJobs[jobId] = job;
            }
        });
        queueJobs = activeJobs;
        renderQueue();
    }
}

async function refreshQueue() {
    try {
        const response = await fetch('/api/jobs?limit=100');
        const data = await response.json();
        
        if (data.jobs) {
            // console.log(`Loaded ${data.jobs.length} jobs from server`);
            
            // Replace local queue with server data (server is source of truth)
            queueJobs = {};
            data.jobs.forEach(job => {
                queueJobs[job.job_id] = job;
                
                // Subscribe to WebSocket updates for this job
                if (socket && socket.connected) {
                    socket.emit('subscribe', { job_id: job.job_id });
                }
            });
            
            renderQueue();
        }
    } catch (error) {
        console.error('Error refreshing queue:', error);
    }
}

function updateQueueJob(jobId, updates) {
    if (queueJobs[jobId]) {
        // Update local copy for immediate UI feedback
        queueJobs[jobId] = { ...queueJobs[jobId], ...updates };
        renderQueue();
    } else {
        // New job from WebSocket, fetch full details from server
        fetch(`/api/status/${jobId}`)
            .then(response => response.json())
            .then(job => {
                queueJobs[jobId] = job;
                renderQueue();
            })
            .catch(error => {
                console.error('Error fetching job:', error);
            });
    }
}

function renderQueue() {
    const jobs = Object.values(queueJobs);
    
    // Debug: Log all job statuses
    // console.log('=== RENDER QUEUE DEBUG ===');
    // console.log('Total jobs:', jobs.length);
    // console.log('Current filter:', currentFilter);
    // jobs.forEach(job => {
    //     console.log(`Job ${job.job_id}: status="${job.status}" (type: ${typeof job.status})`);
    // });
    
    // Sort by created_at (most recent first)
    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Filter jobs - normalize status for comparison
    const filteredJobs = jobs.filter(job => {
        if (!job.status) {
            // console.log(`Job ${job.job_id}: NO STATUS - filtered out`);
            return false; // Skip jobs without status
        }
        
        const status = job.status.toLowerCase().trim();
        let match = false;
        
        if (currentFilter === 'all') {
            match = true;
        } else if (currentFilter === 'processing') {
            match = status === 'processing';
        } else if (currentFilter === 'queued') {
            match = status === 'queued';
        } else if (currentFilter === 'completed') {
            match = status === 'completed';
        }
        
        // console.log(`Job ${job.job_id}: status="${status}" vs filter="${currentFilter}" => ${match ? 'SHOW' : 'HIDE'}`);
        return match;
    });
    
    // console.log('Filtered jobs:', filteredJobs.length);
    // console.log('=========================');
    
    // Update stats
    updateQueueStats(jobs);
    
    // Render job list
    if (filteredJobs.length === 0) {
        queueList.innerHTML = `
            <div class="empty-queue">
                <p>${currentFilter === 'all' ? 
                    'No jobs yet. Upload a file or submit a YouTube URL to get started!' :
                    `No ${currentFilter} jobs.`}</p>
            </div>
        `;
    } else {
        queueList.innerHTML = filteredJobs.map(job => renderQueueItem(job)).join('');
        
        // Add event listeners to download buttons
        filteredJobs.forEach(job => {
            if (job.status && job.status.toLowerCase() === 'completed') {
                const downloadBtn = document.getElementById(`download-${job.job_id}`);
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', () => handleQueueDownload(job.job_id));
                }
            }
        });
        
        // Add event listeners to cancel buttons
        filteredJobs.forEach(job => {
            const status = job.status && job.status.toLowerCase();
            if (status === 'queued' || status === 'processing') {
                const cancelBtn = document.getElementById(`cancel-${job.job_id}`);
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => handleQueueCancel(job.job_id));
                }
            }
        });
    }
}

function renderQueueItem(job) {
    const status = job.status ? job.status.toLowerCase() : 'unknown';
    const statusClass = status;
    const showProgress = status === 'processing' || status === 'queued';
    const canDownload = status === 'completed';
    const canCancel = status === 'queued' || status === 'processing';
    
    // Safe defaults for optional fields
    const model = job.model || 'htdemucs_ft';
    const outputFormat = job.output_format || 'mp3';
    const stems = job.stems || 'all';
    const progress = job.progress || 0;
    
    // Format timestamps
    const createdAt = new Date(job.created_at).toLocaleString();
    const processingTime = job.processing_time_seconds ? 
        `${Math.round(job.processing_time_seconds)}s` : '-';
    
    return `
        <div class="queue-item ${statusClass}" data-job-id="${job.job_id}">
            <div class="queue-item-header">
                <div class="queue-item-title">${escapeHtml(job.filename)}</div>
                <div class="queue-item-status ${statusClass}">
                    ${getStatusIcon(job.status)} ${job.status.toUpperCase()}
                </div>
            </div>
            
            <div class="queue-item-info">
                <div class="queue-item-info-item">
                    <span>🎵</span>
                    <span>${model}</span>
                </div>
                <div class="queue-item-info-item">
                    <span>📦</span>
                    <span>${outputFormat.toUpperCase()}</span>
                </div>
                <div class="queue-item-info-item">
                    <span>🎼</span>
                    <span>${stems === 'all' ? 'All Stems' : stems}</span>
                </div>
                <div class="queue-item-info-item">
                    <span>🕐</span>
                    <span>${createdAt}</span>
                </div>
                ${status === 'completed' ? `
                <div class="queue-item-info-item">
                    <span>⚡</span>
                    <span>${processingTime}</span>
                </div>
                ` : ''}
            </div>
            
            ${showProgress ? `
                <div class="queue-item-progress">
                    <div class="queue-item-progress-bar">
                        <div class="queue-item-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="queue-item-progress-text">${progress}%</div>
                </div>
                ${job.progress_message ? `
                    <div class="queue-item-progress-message">
                        ${escapeHtml(job.progress_message)}
                    </div>
                ` : ''}
            ` : ''}
            
            ${job.error_message ? `
                <div class="queue-item-error">
                    ⚠️ ${escapeHtml(job.error_message || 'Unknown error')}
                </div>
            ` : ''}
            
            ${canDownload ? `
                <div class="queue-item-actions">
                    <button class="queue-item-btn download" id="download-${job.job_id}">
                        <span>⬇️</span>
                        <span>Download ZIP</span>
                    </button>
                </div>
            ` : ''}
            
            ${canCancel ? `
                <div class="queue-item-actions">
                    <button class="queue-item-btn cancel" id="cancel-${job.job_id}">
                        <span>❌</span>
                        <span>Cancel</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function updateQueueStats(jobs) {
    const processing = jobs.filter(j => j.status && j.status.toLowerCase() === 'processing').length;
    const queued = jobs.filter(j => j.status && j.status.toLowerCase() === 'queued').length;
    const completed = jobs.filter(j => j.status && j.status.toLowerCase() === 'completed').length;
    
    statProcessing.textContent = processing;
    statQueued.textContent = queued;
    statCompleted.textContent = completed;
    
    // Update badge on monitor view button
    const activeJobs = processing + queued;
    if (activeJobs > 0) {
        activeJobsBadge.textContent = activeJobs;
        activeJobsBadge.style.display = 'block';
    } else {
        activeJobsBadge.style.display = 'none';
    }
    
    // Show/hide download all button
    if (completed > 1) {
        downloadAllBtn.style.display = 'block';
        downloadAllBtn.title = `Download all ${completed} completed jobs`;
    } else {
        downloadAllBtn.style.display = 'none';
    }
}

function getStatusIcon(status) {
    const icons = {
        'queued': '⏳',
        'processing': '⚙️',
        'completed': '✅',
        'failed': '❌'
    };
    return icons[status.toLowerCase()] || '❓';
}

function handleQueueDownload(jobId) {
    window.location.href = `/api/download/${jobId}`;
}

async function handleQueueCancel(jobId) {
    if (!confirm('Are you sure you want to cancel this job? It will stop processing and be removed from the queue.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cancel/${jobId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Remove from queue
            delete queueJobs[jobId];
            renderQueue();
            showToast('success', 'Job Cancelled', 'The job has been removed from the queue.');
        } else {
            showToast('error', 'Cancel Failed', data.error || 'Failed to cancel job');
        }
    } catch (error) {
        console.error('Error cancelling job:', error);
        showToast('error', 'Cancel Failed', 'Error cancelling job');
    }
}

async function downloadAllCompleted() {
    const completedJobs = Object.values(queueJobs).filter(
        job => job.status && job.status.toLowerCase() === 'completed'
    );
    
    if (completedJobs.length === 0) {
        showToast('info', 'Nothing to Download', 'No completed jobs to download.');
        return;
    }
    
    if (!confirm(`Download ${completedJobs.length} completed job(s)? This will start ${completedJobs.length} separate downloads.`)) {
        return;
    }
    
    // Download each job with a small delay to avoid overwhelming the browser
    for (let i = 0; i < completedJobs.length; i++) {
        setTimeout(() => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = `/api/download/${completedJobs[i].job_id}`;
            document.body.appendChild(iframe);
            
            // Remove iframe after download starts
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 5000);
        }, i * 500); // 500ms delay between each download
    }
}

// Note: scrollToQueue is now replaced by switchView('monitor')

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// View Management
// ============================================================================

function switchView(view, saveState = true) {
    currentView = view;
    
    // Save view state to localStorage
    if (saveState) {
        saveViewState(view);
    }
    
    // Update buttons
    addViewBtn.classList.remove('active');
    monitorViewBtn.classList.remove('active');
    libraryViewBtn.classList.remove('active');
    playerViewBtn.classList.remove('active');
    
    addView.classList.remove('active');
    monitorView.classList.remove('active');
    libraryView.classList.remove('active');
    playerView.classList.remove('active');
    
    if (view === 'add') {
        addViewBtn.classList.add('active');
        addView.classList.add('active');
        
        // Ensure upload section is visible and reset form
        uploadSection.style.display = 'block';
        progressSection.style.display = 'none';
        playlistSection.style.display = 'none';
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
        
        // Reset form fields so user can add another
        audioFileInput.value = '';
        youtubeUrlInput.value = '';
        fileNameSpan.textContent = 'Choose an audio file...';
        fileNameSpan.style.color = 'var(--text-secondary)';
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
    } else if (view === 'monitor') {
        monitorViewBtn.classList.add('active');
        monitorView.classList.add('active');
        
        // In Monitor view, hide individual sections (queue shows everything)
        uploadSection.style.display = 'none';
        progressSection.style.display = 'none';
        playlistSection.style.display = 'none';
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
    } else if (view === 'library') {
        libraryViewBtn.classList.add('active');
        libraryView.classList.add('active');
        
        // Load library data
        fetchLibrary(1);
    } else if (view === 'player') {
        playerViewBtn.classList.add('active');
        playerView.classList.add('active');
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// Library Management
// ============================================================================

async function fetchLibrary(page = 1) {
    try {
        const response = await fetch(`/api/library?page=${page}&page_size=${pageSize}`);
        const data = await response.json();
        
        if (response.ok) {
            libraryJobs = data.jobs;
            currentPage = data.page;
            totalPages = data.total_pages;
            totalJobs = data.total_jobs;
            
            renderLibrary();
            updateLibraryPagination();
            updateLibraryStats();
        } else {
            console.error('Failed to fetch library:', data.error);
        }
    } catch (error) {
        console.error('Error fetching library:', error);
    }
}

function renderLibrary() {
    if (libraryJobs.length === 0) {
        libraryTableBody.innerHTML = `
            <tr class="empty-library">
                <td colspan="6">
                    <div class="empty-library-message">
                        <p>No songs in library yet.</p>
                        <p>Upload a file or add a YouTube video to get started!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    libraryTableBody.innerHTML = libraryJobs.map(job => renderLibraryRow(job)).join('');
    
    // Add event listeners to action buttons
    libraryJobs.forEach(job => {
        // Download button
        const downloadBtn = document.getElementById(`lib-download-${job.job_id}`);
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => handleLibraryDownload(job.job_id));
        }
        
        // Cancel button (for processing jobs)
        const cancelBtn = document.getElementById(`lib-cancel-${job.job_id}`);
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => handleLibraryCancel(job.job_id));
        }
        
        // Refresh button
        const refreshBtn = document.getElementById(`lib-refresh-${job.job_id}`);
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => handleLibraryRefresh(job.job_id));
        }
        
        // Delete button
        const deleteBtn = document.getElementById(`lib-delete-${job.job_id}`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => handleLibraryDelete(job.job_id));
        }
    });
}

function renderLibraryRow(job) {
    const status = job.status ? job.status.toLowerCase() : 'unknown';
    const statusClass = status;
    const canDownload = status === 'completed';
    const canCancel = status === 'queued' || status === 'processing';
    const canPlay = status === 'completed';
    
    // Format duration
    const durationStr = job.duration ? 
        `${Math.floor(job.duration / 60)}:${String(job.duration % 60).padStart(2, '0')}` : 
        '-';
    
    // Get metadata
    const thumbnail = job.thumbnail || '';
    const artist = job.uploader || job.channel || '-';
    const song = escapeHtml(job.filename);
    
    return `
        <tr class="library-row ${statusClass}" data-job-id="${job.job_id}">
            <td class="col-thumbnail ${canPlay ? 'clickable' : ''}" ${canPlay ? `onclick="loadTrackIntoPlayer('${job.job_id}')"` : ''}>
                ${thumbnail ? 
                    `<img src="${escapeHtml(thumbnail)}" alt="Thumbnail" class="thumbnail-img">` :
                    '<div class="thumbnail-placeholder">🎵</div>'
                }
            </td>
            <td class="col-song ${canPlay ? 'clickable' : ''}" ${canPlay ? `onclick="loadTrackIntoPlayer('${job.job_id}')"` : ''}>
                <div class="song-title">${song}</div>
                ${job.description ? `<div class="song-description">${escapeHtml(job.description.substring(0, 100))}...</div>` : ''}
            </td>
            <td class="col-artist">${escapeHtml(artist)}</td>
            <td class="col-duration">${durationStr}</td>
            <td class="col-status">
                <span class="status-badge ${statusClass}">
                    ${getStatusIcon(status)} ${status.toUpperCase()}
                </span>
                ${status === 'processing' ? `
                    <div class="progress-mini">${job.progress}%</div>
                    ${job.progress_message ? `
                        <div class="progress-message-mini" title="${escapeHtml(job.progress_message)}">
                            ${escapeHtml(job.progress_message.substring(0, 30))}${job.progress_message.length > 30 ? '...' : ''}
                        </div>
                    ` : ''}
                ` : ''}
            </td>
            <td class="col-actions">
                <div class="action-buttons">
                    ${canDownload ? `
                        <button class="btn-action download" id="lib-download-${job.job_id}" title="Download">
                            ⬇️
                        </button>
                    ` : ''}
                    ${canCancel ? `
                        <button class="btn-action cancel" id="lib-cancel-${job.job_id}" title="Cancel">
                            ❌
                        </button>
                    ` : ''}
                    <button class="btn-action refresh" id="lib-refresh-${job.job_id}" title="Refresh/Reprocess">
                        🔄
                    </button>
                    <button class="btn-action delete" id="lib-delete-${job.job_id}" title="Delete">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function updateLibraryPagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Hide pagination when there are no items or only one page
    if (totalJobs === 0 || totalPages === 1) {
        if (libraryPagination) {
            libraryPagination.style.display = 'none';
        }
        if (paginationInfo) {
            paginationInfo.style.display = 'none';
        }
        return;
    } else {
        if (libraryPagination) {
            libraryPagination.style.display = 'flex';
        }
        if (paginationInfo) {
            paginationInfo.style.display = 'block';
        }
    }
    
    // Update pagination buttons - hide instead of disable
    if (currentPage === 1) {
        prevPageBtn.style.display = 'none';
    } else {
        prevPageBtn.style.display = '';
    }
    
    if (currentPage === totalPages) {
        nextPageBtn.style.display = 'none';
    } else {
        nextPageBtn.style.display = '';
    }
    
    // Generate page numbers
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    const pageButtonsHtml = [];
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'active' : '';
        pageButtonsHtml.push(
            `<button class="page-number ${isActive}" data-page="${i}">${i}</button>`
        );
    }
    
    pageNumbers.innerHTML = pageButtonsHtml.join('');
    
    // Add click handlers to page numbers
    document.querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            fetchLibrary(page);
        });
    });
}

function updateLibraryStats() {
    libStatTotal.textContent = totalJobs;
    
    const completedCount = libraryJobs.filter(j => j.status === 'completed').length;
    const processingCount = libraryJobs.filter(j => j.status === 'processing' || j.status === 'queued').length;
    
    libStatCompleted.textContent = completedCount;
    libStatProcessing.textContent = processingCount;
}

function handleLibraryDownload(jobId) {
    window.location.href = `/api/download/${jobId}`;
}

async function handleLibraryRefresh(jobId) {
    if (!confirm('Are you sure you want to reprocess this song? This will delete the existing output.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/refresh/${jobId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', 'Reprocessing', 'Song queued for reprocessing!');
            fetchLibrary(currentPage);
            
            // Switch to monitor view to see progress
            switchView('monitor');
        } else {
            showToast('error', 'Refresh Failed', data.error);
        }
    } catch (error) {
        console.error('Error refreshing job:', error);
        showToast('error', 'Refresh Failed', 'Failed to refresh song');
    }
}

async function handleLibraryCancel(jobId) {
    if (!confirm('Are you sure you want to cancel this job? It will stop processing and be removed from the queue.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cancel/${jobId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', 'Job Cancelled', 'The job has been removed from the queue.');
            fetchLibrary(currentPage);
        } else {
            showToast('error', 'Cancel Failed', data.error || 'Failed to cancel job');
        }
    } catch (error) {
        console.error('Error cancelling job:', error);
        showToast('error', 'Cancel Failed', 'Error cancelling job');
    }
}

async function handleLibraryDelete(jobId) {
    if (!confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', 'Deleted', 'Song deleted successfully!');
            fetchLibrary(currentPage);
        } else {
            showToast('error', 'Delete Failed', data.error);
        }
    } catch (error) {
        console.error('Error deleting job:', error);
        showToast('error', 'Delete Failed', 'Failed to delete song');
    }
}

// ============================================================================
// Player Management
// ============================================================================

function initPlayer() {
    // Initialize Tone.js master output
    // Note: We defer AudioContext creation until first user interaction
    // to comply with browser autoplay policies
    
    // Note: We use HTTP streaming for audio instead of socket.io for simplicity and reliability
    // The socket.io implementation is available at /audio namespace if needed for future enhancements
    
    // We'll initialize the master gain lazily on first playback to avoid triggering AudioContext too early
    console.log('Player initialized with Tone.js');
}

async function loadTrackIntoPlayer(jobId) {
    try {
        // Resume AudioContext on user interaction (required by browsers)
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            await Tone.context.resume();
            console.log('AudioContext resumed');
        }
        
        // Fetch job details
        const response = await fetch(`/api/status/${jobId}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to fetch job status:', response.status, errorText);
            showToast('error', 'Error', `Failed to load track: ${response.status}`);
            return;
        }
        
        const job = await response.json();
        
        if (job.status !== 'completed') {
            showToast('warning', 'Not Ready', 'This track is not ready for playback yet.');
            return;
        }
        
        // Stop current playback if any
        if (playerIsPlaying) {
            stopPlayback();
        }
        
        // Clean up old players
        Object.values(playerTracks).forEach(track => {
            if (track.player) {
                track.player.dispose();
            }
        });
        playerTracks = {};
        
        currentPlayerJob = job;
        
        // Determine track configuration (4 or 6 tracks)
        const is6Stem = job.model && job.model.includes('6s');
        const tracks = is6Stem ? trackConfigs['6'] : trackConfigs['4'];
        
        // Update UI
        playerSongTitle.textContent = job.filename || 'Unknown Track';
        playerArtist.textContent = job.youtube_metadata?.uploader || job.youtube_metadata?.channel || 'Unknown Artist';
        const formatDisplay = job.output_format ? job.output_format.toUpperCase() : 'MP3';
        playerModelInfo.textContent = `${job.model || 'Unknown'} • ${formatDisplay}`;
        
        // Update artwork
        if (job.youtube_metadata?.thumbnail) {
            playerArtworkImg.src = job.youtube_metadata.thumbnail;
            playerArtworkImg.style.display = 'block';
            playerArtworkPlaceholder.style.display = 'none';
        } else {
            playerArtworkImg.style.display = 'none';
            playerArtworkPlaceholder.style.display = 'flex';
        }
        
        // Show player view button
        playerViewBtn.style.display = 'flex';
        
        // Initialize tracks
        await initializeTracks(jobId, tracks);
        
        // Build mixer UI
        buildMixerUI(tracks);
        
        // Restore saved mixer state from localStorage
        const savedMixerState = restoreMixerState(jobId);
        if (savedMixerState) {
            // Small delay to ensure mixer UI is fully rendered
            setTimeout(() => {
                applyMixerState(savedMixerState);
            }, 100);
        }
        
        // Switch to player view
        switchView('player');
        
    } catch (error) {
        console.error('Error loading track:', error);
        showToast('error', 'Load Failed', 'Failed to load track into player');
    }
}

async function initializeTracks(jobId, trackNames) {
    // Initialize master gain if not already initialized
    if (!masterGain) {
        masterGain = new Tone.Gain(0.8).toDestination();
    }
    
    // Load audio streams from server via HTTP (simpler and more reliable than socket.io)
    const loadPromises = trackNames.map(async (trackName) => {
        try {
            // Create Tone.js player for each track
            const gainNode = new Tone.Gain(1.0).connect(masterGain);
            const panNode = new Tone.Panner(0).connect(gainNode);
            const player = new Tone.Player().connect(panNode);
            
            playerTracks[trackName] = {
                player: player,
                gain: gainNode,
                pan: panNode,
                muted: false,
                solo: false,
                volume: 1.0,
                panValue: 0,
                loading: true
            };
            
            // Load track via HTTP endpoint
            const trackUrl = `/api/stream/${jobId}/${trackName}`;
            console.log(`Loading ${trackName} from ${trackUrl}`);
            
            await player.load(trackUrl);
            
            playerTracks[trackName].loading = false;
            console.log(`✓ Track ${trackName} loaded successfully`);
            
            // Set duration from first loaded track
            if (!playerDuration && player.buffer.duration) {
                playerDuration = player.buffer.duration;
                totalTimeDisplay.textContent = formatTime(playerDuration);
            }
            
        } catch (error) {
            console.error(`Error loading track ${trackName}:`, error);
            showToast('error', 'Load Error', `Failed to load ${trackName} track`);
            playerTracks[trackName].loading = false;
        }
    });
    
    // Wait for all tracks to load
    await Promise.all(loadPromises);
    
    console.log('All tracks loaded and ready to play');
}

function handleAudioChunk(data) {
    const { track_name, chunk, is_complete, duration } = data;
    
    if (!playerTracks[track_name]) return;
    
    // Append audio chunk to buffer
    if (!playerTracks[track_name].buffer) {
        playerTracks[track_name].buffer = [];
    }
    
    if (chunk) {
        // Decode base64 chunk to binary
        const binaryString = atob(chunk);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        playerTracks[track_name].buffer.push(bytes);
    }
    
    if (is_complete) {
        // Convert buffer to audio and load into player
        const blob = new Blob(playerTracks[track_name].buffer, { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        playerTracks[track_name].player.load(url).then(() => {
            console.log(`Track ${track_name} loaded`);
            
            // Set duration from first completed track
            if (!playerDuration && duration) {
                playerDuration = duration;
                totalTimeDisplay.textContent = formatTime(duration);
            }
        }).catch(error => {
            console.error(`Error loading track ${track_name}:`, error);
            showToast('error', 'Load Error', `Failed to load ${track_name} track`);
        });
    }
}

function buildMixerUI(trackNames) {
    mixerChannels.innerHTML = '';
    
    trackNames.forEach(trackName => {
        const channelDiv = document.createElement('div');
        channelDiv.className = 'mixer-channel';
        channelDiv.innerHTML = `
            <h4>${trackName.charAt(0).toUpperCase() + trackName.slice(1)}</h4>
            <div class="channel-controls">
                <div class="button-controls">
                    <button class="mixer-btn" id="${trackName}-mute" data-track="${trackName}" data-action="mute">M</button>
                    <button class="mixer-btn" id="${trackName}-solo" data-track="${trackName}" data-action="solo">S</button>
                </div>
                <div class="knob-container">
                    <label>Volume</label>
                    <div class="knob" id="${trackName}-volume-knob" data-track="${trackName}" data-param="volume" data-value="1.0">
                        <div class="knob-indicator"></div>
                    </div>
                    <span class="knob-value" id="${trackName}-volume-value">100%</span>
                </div>
                <div class="knob-container">
                    <label>Pan</label>
                    <div class="knob" id="${trackName}-pan-knob" data-track="${trackName}" data-param="pan" data-value="0">
                        <div class="knob-indicator"></div>
                    </div>
                    <span class="knob-value" id="${trackName}-pan-value">C</span>
                </div>
            </div>
        `;
        
        mixerChannels.appendChild(channelDiv);
        
        // Add event listeners
        const muteBtn = document.getElementById(`${trackName}-mute`);
        const soloBtn = document.getElementById(`${trackName}-solo`);
        const volumeKnob = document.getElementById(`${trackName}-volume-knob`);
        const panKnob = document.getElementById(`${trackName}-pan-knob`);
        
        muteBtn.addEventListener('click', () => toggleMute(trackName));
        soloBtn.addEventListener('click', () => toggleSolo(trackName));
        volumeKnob.addEventListener('mousedown', (e) => startKnobDrag(e, trackName, 'volume'));
        volumeKnob.addEventListener('touchstart', (e) => startKnobDrag(e, trackName, 'volume'));
        panKnob.addEventListener('mousedown', (e) => startKnobDrag(e, trackName, 'pan'));
        panKnob.addEventListener('touchstart', (e) => startKnobDrag(e, trackName, 'pan'));
    });
}

function togglePlayPause() {
    if (!currentPlayerJob) {
        showToast('info', 'No Track', 'Please load a track first.');
        return;
    }
    
    if (playerIsPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

async function startPlayback() {
    // Ensure AudioContext is running (required by browsers)
    if (Tone.context.state !== 'running') {
        await Tone.context.resume();
    }
    
    // Start Tone.js transport
    await Tone.start();
    
    // Record start time for current playback position
    if (playerIsPlaying) {
        // Resume from current position
        playbackStartTime = Tone.now() - playerCurrentTime;
    } else {
        // Start from beginning or current position
        playbackStartTime = Tone.now() - playerCurrentTime;
    }
    
    // Start all players at the current position
    Object.values(playerTracks).forEach(track => {
        if (!track.muted && track.player.loaded) {
            track.player.start(0, playerCurrentTime);
        }
    });
    
    playerIsPlaying = true;
    playPauseIcon.textContent = '⏸';
    
    // Start timeline update
    playerUpdateInterval = setInterval(updateTimeline, 100);
}

function pausePlayback() {
    // Update current time before stopping
    if (playerUpdateInterval) {
        clearInterval(playerUpdateInterval);
        playerUpdateInterval = null;
    }
    
    // Calculate elapsed time
    playerCurrentTime = Tone.now() - playbackStartTime;
    
    // Stop all players
    Object.values(playerTracks).forEach(track => {
        track.player.stop();
    });
    
    playerIsPlaying = false;
    playPauseIcon.textContent = '▶️';
}

function stopPlayback() {
    pausePlayback();
    
    // Reset to beginning
    playerCurrentTime = 0;
    playbackStartTime = 0;
    
    Object.values(playerTracks).forEach(track => {
        track.player.seek(0);
    });
    
    updateTimeline();
}

function restartPlayback() {
    playerCurrentTime = 0;
    playbackStartTime = Tone.now();
    
    // Update UI
    currentTimeDisplay.textContent = '0:00';
    timelineProgress.style.width = '0%';
    timelineHandle.style.left = '0%';
    
    // If currently playing, restart all players
    if (playerIsPlaying) {
        Object.values(playerTracks).forEach(track => {
            track.player.stop();
            if (!track.muted && track.player.loaded) {
                track.player.start(0, 0);
            }
        });
    }
}

function playPreviousTrack() {
    // Get previous completed job from library
    if (libraryJobs.length === 0) {
        showToast('info', 'No Tracks', 'No previous tracks available.');
        return;
    }
    
    const currentIndex = libraryJobs.findIndex(j => j.job_id === currentPlayerJob?.job_id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : libraryJobs.length - 1;
    const prevJob = libraryJobs[prevIndex];
    
    if (prevJob && prevJob.status === 'completed') {
        loadTrackIntoPlayer(prevJob.job_id);
    }
}

function playNextTrack() {
    // Get next completed job from library
    if (libraryJobs.length === 0) {
        showToast('info', 'No Tracks', 'No next tracks available.');
        return;
    }
    
    const currentIndex = libraryJobs.findIndex(j => j.job_id === currentPlayerJob?.job_id);
    const nextIndex = (currentIndex + 1) % libraryJobs.length;
    const nextJob = libraryJobs[nextIndex];
    
    if (nextJob && nextJob.status === 'completed') {
        loadTrackIntoPlayer(nextJob.job_id);
    }
}

function toggleMixer() {
    mixerVisible = !mixerVisible;
    playerMixer.style.display = mixerVisible ? 'block' : 'none';
}

function toggleMute(trackName) {
    const track = playerTracks[trackName];
    if (!track) return;
    
    track.muted = !track.muted;
    track.gain.gain.value = track.muted ? 0 : track.volume;
    
    const muteBtn = document.getElementById(`${trackName}-mute`);
    muteBtn.classList.toggle('active', track.muted);
    
    // Save mixer state to localStorage
    if (currentPlayerJob) {
        saveMixerState(currentPlayerJob.job_id);
    }
}

function toggleSolo(trackName) {
    const track = playerTracks[trackName];
    if (!track) return;
    
    track.solo = !track.solo;
    
    const soloBtn = document.getElementById(`${trackName}-solo`);
    soloBtn.classList.toggle('active', track.solo);
    
    // If any track is soloed, mute all non-soloed tracks
    const anySoloed = Object.values(playerTracks).some(t => t.solo);
    
    Object.entries(playerTracks).forEach(([name, t]) => {
        if (anySoloed) {
            t.gain.gain.value = t.solo ? t.volume : 0;
        } else {
            t.gain.gain.value = t.muted ? 0 : t.volume;
        }
    });
    
    // Save mixer state to localStorage
    if (currentPlayerJob) {
        saveMixerState(currentPlayerJob.job_id);
    }
}

function updateTimeline() {
    if (!currentPlayerJob) return;
    
    // Calculate current playback time
    let currentTime = playerCurrentTime;
    if (playerIsPlaying) {
        currentTime = Math.min(playerDuration, Tone.now() - playbackStartTime);
        playerCurrentTime = currentTime;
    }
    
    const progress = (currentTime / playerDuration) * 100;
    
    currentTimeDisplay.textContent = formatTime(currentTime);
    timelineProgress.style.width = `${progress}%`;
    timelineHandle.style.left = `${progress}%`;
    
    // Auto-stop at end
    if (playerIsPlaying && currentTime >= playerDuration) {
        stopPlayback();
    }
}

function startTimelineScrub(e) {
    e.preventDefault();
    
    // Check if currently playing
    const wasPlaying = playerIsPlaying;
    
    // Pause playback if playing (we'll restart after seek)
    if (playerIsPlaying) {
        pausePlayback();
    }
    
    const rect = timelineTrack.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const seekTime = (percent / 100) * playerDuration;
    
    // Update tracked time
    playerCurrentTime = seekTime;
    playbackStartTime = Tone.now() - seekTime;
    
    // Update UI immediately
    updateTimeline();
    
    // Continue scrubbing on mouse move
    const handleMove = (moveEvent) => {
        const moveX = (moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX) - rect.left;
        const movePercent = Math.max(0, Math.min(100, (moveX / rect.width) * 100));
        const moveSeekTime = (movePercent / 100) * playerDuration;
        
        // Update tracked time
        playerCurrentTime = moveSeekTime;
        playbackStartTime = Tone.now() - moveSeekTime;
        
        // Update UI
        currentTimeDisplay.textContent = formatTime(moveSeekTime);
        timelineProgress.style.width = `${movePercent}%`;
        timelineHandle.style.left = `${movePercent}%`;
    };
    
    const handleEnd = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        
        // Restart playback if it was playing
        if (wasPlaying) {
            startPlayback();
        }
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
}

let currentKnobDrag = null;

function startKnobDrag(e, trackName, paramType) {
    e.preventDefault();
    
    const knob = e.currentTarget;
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startX = e.touches ? e.touches[0].clientX : e.clientX;
    
    // Get current value
    let currentValue;
    if (trackName === 'master' && paramType === 'volume') {
        currentValue = masterGain ? masterGain.gain.value : 0.8;
    } else if (playerTracks[trackName]) {
        currentValue = paramType === 'volume' ? playerTracks[trackName].volume : playerTracks[trackName].panValue;
    } else {
        return;
    }
    
    currentKnobDrag = {
        trackName,
        paramType,
        knob,
        startY,
        startX,
        startValue: currentValue
    };
    
    // Add dragging cursor to body
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    
    const handleMove = (moveEvent) => {
        if (!currentKnobDrag) return;
        
        moveEvent.preventDefault(); // Prevent text selection during drag
        
        const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
        const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        
        // Calculate vertical movement (negative is up, positive is down)
        const deltaY = currentKnobDrag.startY - currentY;
        
        // Also track horizontal for fine control (optional)
        const deltaX = currentX - currentKnobDrag.startX;
        
        // Combine vertical and horizontal for circular motion feel
        // Vertical has more weight for natural feel
        const delta = deltaY * 0.004 + deltaX * 0.002;
        
        // Update parameter based on vertical drag
        updateKnobParameterByDelta(currentKnobDrag.trackName, currentKnobDrag.paramType, currentKnobDrag.startValue, delta);
    };
    
    const handleEnd = () => {
        currentKnobDrag = null;
        
        // Reset cursor
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
}

function updateKnobParameterByDelta(trackName, paramType, startValue, delta) {
    // Calculate new value based on start value and total delta
    let newValue;
    
    if (paramType === 'volume') {
        // Volume range: 0 to 1
        newValue = Math.max(0, Math.min(1, startValue + delta));
    } else if (paramType === 'pan') {
        // Pan range: -1 to 1
        newValue = Math.max(-1, Math.min(1, startValue + delta));
    }
    
    if (trackName === 'master' && paramType === 'volume') {
        // Initialize master gain if needed
        if (!masterGain) {
            masterGain = new Tone.Gain(0.8).toDestination();
        }
        
        // Master volume
        masterGain.gain.value = newValue;
        
        const rotation = (newValue - 0.5) * 270; // -135 to +135 degrees
        masterVolumeKnob.querySelector('.knob-indicator').style.transform = `rotate(${rotation}deg)`;
        masterVolumeValue.textContent = `${Math.round(newValue * 100)}%`;
    } else if (playerTracks[trackName]) {
        const track = playerTracks[trackName];
        
        if (paramType === 'volume') {
            track.volume = newValue;
            
            // Update gain if not muted/soloed
            const anySoloed = Object.values(playerTracks).some(t => t.solo);
            if (!track.muted && (!anySoloed || track.solo)) {
                track.gain.gain.value = newValue;
            }
            
            const rotation = (newValue - 0.5) * 270;
            const knob = document.getElementById(`${trackName}-volume-knob`);
            const valueSpan = document.getElementById(`${trackName}-volume-value`);
            knob.querySelector('.knob-indicator').style.transform = `rotate(${rotation}deg)`;
            valueSpan.textContent = `${Math.round(newValue * 100)}%`;
        } else if (paramType === 'pan') {
            track.panValue = newValue;
            track.pan.pan.value = newValue;
            
            const rotation = newValue * 135; // -135 to +135 degrees
            const knob = document.getElementById(`${trackName}-pan-knob`);
            const valueSpan = document.getElementById(`${trackName}-pan-value`);
            knob.querySelector('.knob-indicator').style.transform = `rotate(${rotation}deg)`;
            
            if (newValue < -0.1) {
                valueSpan.textContent = `L${Math.round(Math.abs(newValue) * 100)}`;
            } else if (newValue > 0.1) {
                valueSpan.textContent = `R${Math.round(newValue * 100)}`;
            } else {
                valueSpan.textContent = 'C';
            }
        }
    }
    
    // Save mixer state to localStorage
    if (currentPlayerJob) {
        saveMixerState(currentPlayerJob.job_id);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Chatbot Integration
// ============================================================================

let chatbotInstance = null;
let chatbotOpen = false;

function initChatbot() {
    // Initialize the chatbot
    chatbotInstance = new DemucsChatbot();
    
    // Get elements
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotSuggestions = document.getElementById('chatbot-suggestions');
    const chatbotWelcome = document.getElementById('chatbot-welcome');
    
    // Populate initial suggestions
    const suggestions = chatbotInstance.getSuggestions();
    chatbotSuggestions.innerHTML = suggestions.map(s => 
        `<button class="suggestion-btn" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join('');
    
    // Add event listeners to suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const suggestion = btn.dataset.suggestion;
            sendChatMessage(suggestion);
        });
    });
    
    // Toggle chatbot
    chatbotToggle.addEventListener('click', () => {
        chatbotOpen = !chatbotOpen;
        chatbotContainer.classList.toggle('open', chatbotOpen);
        chatbotToggle.classList.toggle('open', chatbotOpen);
        
        if (chatbotOpen) {
            chatbotInput.focus();
            
            // Hide welcome message after first interaction
            if (chatbotInstance.chatHistory.length > 0) {
                chatbotWelcome.style.display = 'none';
            }
        }
    });
    
    // Close button
    chatbotClose.addEventListener('click', () => {
        chatbotOpen = false;
        chatbotContainer.classList.remove('open');
        chatbotToggle.classList.remove('open');
    });
    
    // Send message on button click
    chatbotSend.addEventListener('click', () => {
        const message = chatbotInput.value.trim();
        if (message) {
            sendChatMessage(message);
            chatbotInput.value = '';
        }
    });
    
    // Send message on Enter key
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const message = chatbotInput.value.trim();
            if (message) {
                sendChatMessage(message);
                chatbotInput.value = '';
            }
        }
    });
    
    // Close chatbot on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && chatbotOpen) {
            chatbotOpen = false;
            chatbotContainer.classList.remove('open');
            chatbotToggle.classList.remove('open');
        }
    });
}

function sendChatMessage(message) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotWelcome = document.getElementById('chatbot-welcome');
    
    // Hide welcome message on first message
    if (chatbotWelcome) {
        chatbotWelcome.style.display = 'none';
    }
    
    // Add user message to UI
    addChatMessage('user', message);
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chatbot-message bot';
    typingIndicator.id = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="message-avatar bot">🤖</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatbotMessages.appendChild(typingIndicator);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    
    // Simulate thinking time (remove typing indicator and show response)
    setTimeout(() => {
        // Remove typing indicator
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
        
        // Get bot response
        const response = chatbotInstance.chat(message);
        
        // Add bot message to UI
        addChatMessage('bot', response);
        
        // Generate new suggestions
        updateSuggestions();
    }, 500 + Math.random() * 500); // Random delay 500-1000ms
}

function addChatMessage(type, message) {
    const chatbotMessages = document.getElementById('chatbot-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${type}`;
    
    const avatar = type === 'bot' ? '🤖' : '👤';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${type}">${avatar}</div>
        <div>
            <div class="message-content">${escapeHtml(message)}</div>
        </div>
    `;
    
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function updateSuggestions() {
    const chatbotSuggestions = document.getElementById('chatbot-suggestions');
    
    // Get new random suggestions
    const suggestions = chatbotInstance.getSuggestions();
    chatbotSuggestions.innerHTML = suggestions.map(s => 
        `<button class="suggestion-btn" data-suggestion="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    ).join('');
    
    // Re-attach event listeners
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const suggestion = btn.dataset.suggestion;
            sendChatMessage(suggestion);
        });
    });
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    // DOM already loaded
    initChatbot();
}
