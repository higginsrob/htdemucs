# Landing Page Setup Guide

## Quick Start

1. **Get YouTube API Key** (Required for video gallery)
2. **Add API Key** to `script.js`
3. **Test locally** 
4. **Deploy to GitHub Pages**

## Step-by-Step Instructions

### Step 1: Get YouTube API Key

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "htdemucs-landing")
3. Navigate to **APIs & Services** → **Library**
4. Search for "YouTube Data API v3"
5. Click **Enable**
6. Go to **Credentials** → **Create Credentials** → **API Key**
7. Copy your API key
8. (Optional) Restrict the key to YouTube Data API v3 and add website restrictions

### Step 2: Configure the API Key

Open `script.js` and replace this line:

```javascript
API_KEY: 'YOUR_YOUTUBE_API_KEY_HERE',
```

With your actual API key:

```javascript
API_KEY: 'AIzaSyCXXXXXXXXXXXXXXXXXXXXXXX',
```

### Step 3: Test Locally

```bash
# Navigate to the landing page folder
cd landing-page

# Start a local server (choose one method)

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if you have npx)
npx serve

# PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000`

### Step 4: Deploy to GitHub Pages

#### Option A: Automatic Deploy (Recommended)

1. The GitHub Actions workflow is already created (`.github/workflows/deploy-landing.yml`)
2. Enable GitHub Pages in repository settings:
   - Go to **Settings** → **Pages**
   - Under **Source**, select **GitHub Actions**
3. Push your changes to `main` branch
4. The workflow will automatically deploy
5. Your site will be at: `https://yourusername.github.io/htdemucs/`

#### Option B: Manual GitHub Pages Settings

1. Go to **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Choose:
   - Branch: `main`
   - Folder: `/landing-page`
4. Click **Save**
5. Your site will be available in a few minutes

## Configuration Options

### Change Maximum Videos Shown

Edit `script.js`:

```javascript
MAX_RESULTS: 12  // Change this number
```

### Change YouTube Channel

To showcase a different channel, update:

```javascript
CHANNEL_ID: 'UC7-Mf5EnfDVBr8tziq8s1-g',  // Your channel ID
```

How to find a YouTube Channel ID:
1. Go to the YouTube channel
2. View page source
3. Search for `"channelId"`
4. Or use a [Channel ID finder tool](https://commentpicker.com/youtube-channel-id.php)

### Customize Colors

Edit `styles.css` to change the color scheme:

```css
:root {
    --primary: #6366f1;      /* Main color */
    --secondary: #ec4899;     /* Accent color */
    --dark: #0f172a;          /* Background */
    --text: #f8fafc;          /* Text color */
}
```

### Customize Content

- **Hero Section**: Edit the hero content in `index.html` (lines ~40-80)
- **Features**: Add/remove feature cards in `index.html` (lines ~120-150)
- **Docker Commands**: Update the commands section (lines ~200-300)

## Troubleshooting

### Videos Not Showing

**Problem**: No videos appear in the gallery.

**Solutions**:
- Check that your API key is correctly set in `script.js`
- Verify your API key has YouTube Data API v3 enabled
- Check browser console for error messages
- Ensure the channel ID is correct
- Make sure the channel has published videos

### API Quota Exceeded

**Problem**: Error message about quota being exceeded.

**Solutions**:
- YouTube API has a daily quota limit (10,000 units/day by default)
- Video search uses 100 units per request
- If you expect high traffic, request a quota increase in Google Cloud Console
- Consider caching results or reducing update frequency

### Deployment Issues

**Problem**: Changes not appearing on GitHub Pages.

**Solutions**:
- Wait 5-10 minutes for deployment to complete
- Check the **Actions** tab for workflow status
- Verify the correct folder is set in GitHub Pages settings
- Clear browser cache
- Check that files are committed to the `main` branch

### Lightbox Not Working

**Problem**: Video doesn't open in lightbox.

**Solutions**:
- Check browser console for JavaScript errors
- Ensure `script.js` is loaded (check browser DevTools Network tab)
- Verify YouTube video IDs are valid
- Check that CORS is not blocking the requests

## Security Notes

- Never commit your YouTube API key to a public repository
- If you accidentally commit it, rotate the key immediately in Google Cloud Console
- Consider using GitHub Secrets if you need to use the API key in workflows

## Features

✅ Responsive design (works on mobile, tablet, desktop)  
✅ Dark theme with gradient backgrounds  
✅ Smooth scrolling navigation  
✅ Video lightbox with keyboard support (ESC to close)  
✅ Dynamic YouTube integration  
✅ Docker command examples  
✅ Getting started guide  
✅ Features showcase  

## Next Steps

1. Customize the content to match your needs
2. Update colors if desired
3. Test on multiple devices
4. Add your API key
5. Deploy to GitHub Pages
6. Share your landing page!

## Support

- [HTDemucs GitHub Repository](https://github.com/higginsrob/htdemucs)
- [Demucs Project](https://github.com/adefossez/demucs)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3/docs)

