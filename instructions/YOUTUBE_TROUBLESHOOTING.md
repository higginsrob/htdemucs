# YouTube Bot Detection Troubleshooting

## Problem: "Sign in to confirm you're not a bot"

YouTube sometimes blocks automated downloads with bot detection. Here are solutions:

---

## Solution 1: Use Browser Cookies (Recommended)

The easiest way to avoid bot detection is to use cookies from your browser.

### Steps:

1. **Install browser extension** to export cookies:
   - Chrome/Edge: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. **Go to YouTube** and sign in (if not already)

3. **Export cookies**:
   - Click the extension icon while on youtube.com
   - Save as `youtube_cookies.txt`

4. **Copy cookies to server**:
   ```bash
   # Copy to server directory
   cp youtube_cookies.txt /path/to/demucs/server/
   
   # The server will automatically use it if present at /app/youtube_cookies.txt
   ```

5. **Rebuild and restart server**:
   ```bash
   make server-stop
   make server-build
   make server-run
   ```

---

## Solution 2: Use OAuth Authentication

For more permanent solution, you can use OAuth:

1. Create a Google Cloud Project
2. Enable YouTube Data API
3. Get OAuth credentials
4. Configure yt-dlp with OAuth tokens

(This is more complex and usually not necessary)

---

## Solution 3: Use Different Videos

Some videos are more restricted than others:
- Try videos from different channels
- Public videos work better than unlisted
- Avoid age-restricted or region-locked videos

---

## Solution 4: Rate Limiting

If processing many videos:
- Don't download too many at once
- Space out downloads
- YouTube rate limits aggressive downloading

---

## Solution 5: Update yt-dlp

Keep yt-dlp up to date as YouTube changes detection methods:

Update `server/requirements.txt`:
```
yt-dlp==latest_version
```

Then rebuild:
```bash
make server-build
```

---

## Current Configuration

The server already includes these anti-bot measures:
- ✅ Realistic user-agent (Chrome browser)
- ✅ Android player client fallback
- ✅ Skip webpage parsing when possible
- ✅ Cookie support (if file present)

---

## Testing If Cookies Work

After adding cookies, test with:

```bash
curl -X POST http://localhost:8080/api/youtube \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "model": "mdx_extra"
  }'
```

Check logs:
```bash
make server-logs
```

Look for:
- ✅ "Using cookies file for YouTube authentication"
- ✅ "Successfully downloaded: ..."
- ❌ "Sign in to confirm you're not a bot"

---

## Alternative: Use Local Files

If YouTube downloads keep failing:
1. Download audio manually using a browser extension
2. Upload the file via the "Upload File" tab
3. Process as normal

---

## Docker Volume for Cookies

To persist cookies between rebuilds:

Update `Makefile` `server-run` target:
```makefile
server-run:
	docker run --rm -d \
		--name=demucs-server \
		-p 8080:8080 \
		-v $(current-dir)demucs/models:/data/models \
		-v $(current-dir)server/youtube_cookies.txt:/app/youtube_cookies.txt:ro \
		demucs-server:latest
```

Then:
```bash
# Place cookies in server directory
cp youtube_cookies.txt server/

# Restart server
make server-stop
make server-run
```

---

## Important Notes

⚠️ **Security:**
- Cookies contain authentication tokens
- Don't share cookies publicly
- Don't commit cookies to git
- Add `youtube_cookies.txt` to `.gitignore`

⚠️ **Cookies Expire:**
- Browser cookies expire after some time
- Re-export if downloads start failing again
- Usually good for several weeks/months

⚠️ **Legal:**
- Respect YouTube's Terms of Service
- Only download content you have rights to
- For personal/educational use only

---

## Getting Help

If issues persist:
1. Check server logs: `make server-logs`
2. Try with different videos
3. Verify cookies are valid (re-export)
4. Update yt-dlp to latest version

For the error:
```
ERROR: [youtube] xxxxx: Sign in to confirm you're not a bot
```

The most reliable fix is **using browser cookies** (Solution 1).

---

**Last Updated:** 2025-10-26

