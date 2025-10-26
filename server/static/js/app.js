// Demucs Web UI - Client-side JavaScript (with YouTube support)

let currentJobId = null;
let currentSourceType = 'file'; // 'file' or 'youtube'
let socket = null;
let playlistJobs = [];
let queueJobs = {}; // Store all jobs by ID for quick lookup
let currentFilter = 'all'; // Queue filter: all, processing, queued, completed
let queueRefreshInterval = null;
let currentView = 'add'; // Current view: 'add' or 'monitor'

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

// View Switcher
const addViewBtn = document.getElementById('add-view-btn');
const monitorViewBtn = document.getElementById('monitor-view-btn');
const addView = document.getElementById('add-view');
const monitorView = document.getElementById('monitor-view');
const activeJobsBadge = document.getElementById('active-jobs-badge');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    connectSocket();
    initQueue();
});

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

    // View switcher
    addViewBtn.addEventListener('click', () => switchView('add'));
    monitorViewBtn.addEventListener('click', () => switchView('monitor'));
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

    socket.on('connect', () => {
        console.log('Socket.IO connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
    });

    socket.on('progress', (data) => {
        console.log('Progress update:', data);
        
        // Update current job if viewing progress
        if (currentJobId === data.job_id) {
            updateProgress(data.progress, data.message);
        }
        
        // Update queue with new job data
        updateQueueJob(data.job_id, {
            status: data.status,
            progress: data.progress
        });
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showError(data.error_message);
    });

    socket.on('connected', (data) => {
        console.log('Connected to progress updates:', data);
    });
}

async function handleFileUpload() {
    const file = audioFileInput.files[0];
    if (!file) {
        alert('Please select a file');
        return;
    }

    // Check file size (100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File is too large. Maximum size is 100MB.');
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
            created_at: data.created_at
        };
        renderQueue();
        
        // Immediately refresh from server to get complete data
        setTimeout(() => refreshQueue(), 500);

        // Auto-switch to monitor view
        switchView('monitor');

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
        alert('Please enter a YouTube URL');
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
                    created_at: new Date().toISOString()
                };
            });
            renderQueue();
            
            // Immediately refresh from server to get complete data
            setTimeout(() => refreshQueue(), 500);
            
            // Auto-switch to monitor view
            switchView('monitor');
            
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
                created_at: data.created_at
            };
            renderQueue();
            
            // Immediately refresh from server to get complete data
            setTimeout(() => refreshQueue(), 500);
            
            // Auto-switch to monitor view
            switchView('monitor');
            
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

    // Alert the error
    alert('Error: ' + message);
    
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
    console.log('Initializing queue - loading from server...');
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
            console.log(`Loaded ${data.jobs.length} jobs from server`);
            
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
    console.log('=== RENDER QUEUE DEBUG ===');
    console.log('Total jobs:', jobs.length);
    console.log('Current filter:', currentFilter);
    jobs.forEach(job => {
        console.log(`Job ${job.job_id}: status="${job.status}" (type: ${typeof job.status})`);
    });
    
    // Sort by created_at (most recent first)
    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Filter jobs - normalize status for comparison
    const filteredJobs = jobs.filter(job => {
        if (!job.status) {
            console.log(`Job ${job.job_id}: NO STATUS - filtered out`);
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
        
        console.log(`Job ${job.job_id}: status="${status}" vs filter="${currentFilter}" => ${match ? 'SHOW' : 'HIDE'}`);
        return match;
    });
    
    console.log('Filtered jobs:', filteredJobs.length);
    console.log('=========================');
    
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
    }
}

function renderQueueItem(job) {
    const status = job.status ? job.status.toLowerCase() : 'unknown';
    const statusClass = status;
    const showProgress = status === 'processing' || status === 'queued';
    const canDownload = status === 'completed';
    
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

async function downloadAllCompleted() {
    const completedJobs = Object.values(queueJobs).filter(
        job => job.status && job.status.toLowerCase() === 'completed'
    );
    
    if (completedJobs.length === 0) {
        alert('No completed jobs to download.');
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

function switchView(view) {
    currentView = view;
    
    // Update buttons
    if (view === 'add') {
        addViewBtn.classList.add('active');
        monitorViewBtn.classList.remove('active');
        addView.classList.add('active');
        monitorView.classList.remove('active');
        
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
    } else {
        monitorViewBtn.classList.add('active');
        addViewBtn.classList.remove('active');
        monitorView.classList.add('active');
        addView.classList.remove('active');
        
        // In Monitor view, hide individual sections (queue shows everything)
        uploadSection.style.display = 'none';
        progressSection.style.display = 'none';
        playlistSection.style.display = 'none';
        resultSection.style.display = 'none';
        errorSection.style.display = 'none';
    }
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
