// YouTube Data API Configuration
// To get an API key:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing
// 3. Enable "YouTube Data API v3"
// 4. Create credentials (API key)
// 5. Replace the API_KEY below with your key

const YOUTUBE_CONFIG = {
    API_KEY: 'AIzaSyBTdiiit471dw-xCTlih18sHX0rQ3-scbU',
    CHANNEL_ID: 'UC7-Mf5EnfDVBr8tziq8s1-g',
    MAX_RESULTS: 12
};

// State
let videos = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scroll to nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Check for API key and load videos
    if (YOUTUBE_CONFIG.API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        showPlaceholderVideos();
    } else {
        loadVideos();
    }
});

// Show placeholder videos when API key is not configured
function showPlaceholderVideos() {
    const loadingElement = document.getElementById('videos-loading');
    const warningElement = document.getElementById('api-key-warning');
    const container = document.getElementById('videos-container');
    
    if (loadingElement) loadingElement.classList.add('hidden');
    if (warningElement) warningElement.classList.remove('hidden');
    
    // Show placeholder message in container
    if (container) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📺</div>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">
                    Add your YouTube API key to display videos dynamically
                </p>
            </div>
        `;
    }
}

// Load videos from YouTube
async function loadVideos() {
    const loadingElement = document.getElementById('videos-loading');
    const container = document.getElementById('videos-container');
    
    try {
        // Show loading state
        if (loadingElement) loadingElement.classList.remove('hidden');
        
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `key=${YOUTUBE_CONFIG.API_KEY}` +
            `&channelId=${YOUTUBE_CONFIG.CHANNEL_ID}` +
            `&part=snippet` +
            `&order=date` +
            `&maxResults=${YOUTUBE_CONFIG.MAX_RESULTS}` +
            `&type=video`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        videos = data.items || [];
        
        // Hide loading
        if (loadingElement) loadingElement.classList.add('hidden');
        
        // Display videos
        displayVideos();
        
    } catch (error) {
        console.error('Error loading videos:', error);
        
        if (loadingElement) loadingElement.classList.add('hidden');
        
        // Show error message
        // if (container) {
        //     container.innerHTML = `
        //         <div style="text-align: center; padding: 2rem;">
        //             <p style="color: var(--danger); margin-bottom: 1rem;">
        //                 Failed to load videos: ${error.message}
        //             </p>
        //             <p style="color: var(--text-muted);">
        //                 Please check your API key in script.js
        //             </p>
        //         </div>
        //     `;
        // }
    }
}

// Display videos in grid
function displayVideos() {
    const container = document.getElementById('videos-container');
    
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                Coming soon...
            </div>
        `;
        return;
    }
    
    container.innerHTML = videos.map(video => `
        <div class="video-card" onclick="openLightbox('${video.id.videoId}')">
            <img 
                src="${video.snippet.thumbnails.medium.url}" 
                alt="${escapeHtml(video.snippet.title)}"
                class="video-thumbnail"
            >
            <div class="video-info">
                <div class="video-title">${escapeHtml(video.snippet.title)}</div>
                <div class="video-meta">
                    <span>📅 ${formatDate(video.snippet.publishedAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Open video in lightbox
function openLightbox(videoId) {
    const lightbox = document.getElementById('lightbox');
    const lightboxBody = document.getElementById('lightbox-body');
    
    if (!lightbox || !lightboxBody) return;
    
    lightboxBody.innerHTML = `
        <iframe 
            class="lightbox-video"
            src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
    
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Add keyboard listener
    document.addEventListener('keydown', handleLightboxKeydown);
}

// Close lightbox
function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxBody = document.getElementById('lightbox-body');
    
    if (!lightbox || !lightboxBody) return;
    
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    lightboxBody.innerHTML = '';
    
    // Remove keyboard listener
    document.removeEventListener('keydown', handleLightboxKeydown);
}

// Handle keyboard events for lightbox
function handleLightboxKeydown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

// Close lightbox on click outside
document.addEventListener('click', (event) => {
    const lightbox = document.getElementById('lightbox');
    if (lightbox && !lightbox.classList.contains('hidden')) {
        if (event.target.classList.contains('lightbox-backdrop')) {
            closeLightbox();
        }
    }
});

