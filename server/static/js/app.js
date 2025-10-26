// Demucs Web UI - Client-side JavaScript

let currentJobId = null;
let socket = null;

// DOM Elements
const uploadSection = document.getElementById('upload-section');
const progressSection = document.getElementById('progress-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');

const uploadForm = document.getElementById('upload-form');
const audioFileInput = document.getElementById('audio-file');
const fileNameSpan = document.getElementById('file-name');
const submitBtn = document.getElementById('submit-btn');

const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const statusMessage = document.getElementById('status-message');

const downloadBtn = document.getElementById('download-btn');
const newUploadBtn = document.getElementById('new-upload-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    connectSocket();
});

function setupEventListeners() {
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

    // Form submit
    uploadForm.addEventListener('submit', handleUpload);

    // Buttons
    downloadBtn.addEventListener('click', handleDownload);
    newUploadBtn.addEventListener('click', resetToUpload);
    retryBtn.addEventListener('click', resetToUpload);
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
        updateProgress(data.progress, data.message);
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showError(data.error_message);
    });

    socket.on('connected', (data) => {
        console.log('Connected to progress updates:', data);
    });
}

async function handleUpload(e) {
    e.preventDefault();

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

        // Show progress section
        showProgress(file.name);

    } catch (error) {
        console.error('Upload error:', error);
        showError(error.message);
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
    }
}

function showProgress(filename) {
    uploadSection.style.display = 'none';
    progressSection.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    document.querySelector('.processing-file').textContent = `Processing: ${filename}`;
    updateProgress(0, 'Uploading file...');
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
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultSection.style.display = 'block';
    errorSection.style.display = 'none';

    const resultInfo = document.getElementById('result-info');
    resultInfo.innerHTML = `
        <p><strong>Job ID:</strong> ${currentJobId}</p>
        <p><strong>Status:</strong> Completed ✅</p>
        <p>Your separated stems are ready to download as a ZIP file.</p>
    `;
}

function showError(message) {
    uploadSection.style.display = 'none';
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'block';

    errorMessage.textContent = message;
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '🎯 Separate Stems';
}

function handleDownload() {
    if (!currentJobId) return;

    // Open download in new window
    window.location.href = `/api/download/${currentJobId}`;
}

function resetToUpload() {
    uploadSection.style.display = 'block';
    progressSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    // Reset form
    uploadForm.reset();
    fileNameSpan.textContent = 'Choose an audio file...';
    fileNameSpan.style.color = 'var(--text-secondary)';
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = '🎯 Separate Stems';

    currentJobId = null;
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

