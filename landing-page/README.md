# HTDemucs Landing Page

A beautiful landing page for the HTDemucs project that dynamically displays YouTube channel videos.

## Features

- 🎨 Modern, responsive design with gradient backgrounds
- 📱 Mobile-friendly layout
- 🎬 Dynamic YouTube video gallery with lightbox
- 🐳 Complete Docker command reference
- 📖 Getting started guide
- ⚡ Fast loading and optimized for GitHub Pages

## Setup

### 1. Get YouTube API Key

To display videos from the YouTube channel, you need a YouTube Data API v3 key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "YouTube Data API v3"
4. Go to Credentials → Create Credentials → API Key
5. Copy your API key

### 2. Configure the API Key

Edit `script.js` and replace the placeholder:

```javascript
const YOUTUBE_CONFIG = {
    API_KEY: 'YOUR_YOUTUBE_API_KEY_HERE',  // ← Replace this
    CHANNEL_ID: 'UC7-Mf5EnfDVBr8tziq8s1-g',
    MAX_RESULTS: 12
};
```

### 3. Test Locally

Open `index.html` in your browser or use a local server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve

# Then visit http://localhost:8000
```

## Publishing to GitHub Pages

### Method 1: Automatic Deploy with GitHub Actions

Create `.github/workflows/deploy-landing.yml`:

```yaml
name: Deploy Landing Page

on:
  push:
    branches: [ main ]
    paths:
      - 'landing-page/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Pages
        uses: actions/configure-pages@v2
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: 'landing-page'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

### Method 2: Manual Deploy with gh-pages

```bash
# Install gh-pages CLI
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d landing-page"

# Deploy
npm run deploy
```

### Method 3: GitHub Pages Settings

1. Go to your repository Settings → Pages
2. Select "Deploy from a branch"
3. Select "main" branch and "/landing-page" folder
4. Click Save

Then your site will be at: `https://yourusername.github.io/htdemucs/`

## Project Structure

```text
landing-page/
├── index.html          # Main HTML file
├── styles.css          # All styling
├── script.js           # YouTube API integration and interactivity
└── README.md          # This file
```

## Customization

### Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary: #6366f1;
    --secondary: #ec4899;
    --dark: #0f172a;
    /* ... */
}
```

### Maximum Videos

Change the `MAX_RESULTS` in `script.js`:

```javascript
MAX_RESULTS: 12  // Change this number
```

### Channel ID

If you want to showcase a different YouTube channel, update:

```javascript
CHANNEL_ID: 'UC7-Mf5EnfDVBr8tziq8s1-g'  // Your channel ID
```

## Features in Detail

### Sections

1. **Hero** - Main introduction with badges and CTA buttons
2. **Features** - 6 key features of HTDemucs
3. **Getting Started** - Docker setup instructions
4. **Docker Commands** - Complete command reference
5. **Video Gallery** - Dynamic YouTube videos
6. **Footer** - Links and resources

### Video Lightbox

- Click any video thumbnail to open in lightbox
- Press ESC to close
- Click outside video to close
- Autoplay enabled when opened

### Responsive Design

- Mobile-first approach
- Works on all screen sizes
- Touch-friendly interactions
- Optimized performance

## License

This landing page is part of the HTDemucs project and is released under the MIT license.
