// Demucs Chatbot - Static Knowledge Base
// This chatbot helps users understand how to use the Demucs web app

class DemucsChatbot {
    constructor() {
        this.knowledgeBase = this.initializeKnowledgeBase();
        this.chatHistory = [];
        this.isOpen = false;
    }

    initializeKnowledgeBase() {
        return [
            // ===== GETTING STARTED =====
            {
                keywords: ['hello', 'hi', 'hey', 'start', 'help', 'how'],
                question: "Hello! How can I help you?",
                answer: "👋 Hi! I'm here to help you use Demucs to separate audio into different stems (vocals, bass, drums, etc.). You can:\n\n• Upload audio files or paste YouTube URLs\n• Choose different quality models\n• Monitor processing progress\n• Play separated tracks with a mixer\n\nWhat would you like to know more about?"
            },
            {
                keywords: ['what is', 'demucs', 'what does'],
                question: "What is Demucs?",
                answer: "🎵 Demucs is an AI-powered music source separation tool developed by Facebook Research. It uses deep learning to split a song into separate tracks:\n\n• 🎤 **Vocals** - singing/voice\n• 🎸 **Bass** - bass guitar/bass sounds\n• 🥁 **Drums** - percussion/drums\n• 🎹 **Other** - everything else (piano, guitars, synths, etc.)\n• 🎸 **Guitar** + 🎹 **Piano** (in 6-stem models)\n\nThis is perfect for creating karaoke tracks, remixes, or practicing with isolated instruments!"
            },
            {
                keywords: ['getting started', 'begin', 'first time', 'new user'],
                question: "How do I get started?",
                answer: "🚀 Getting started is easy!\n\n**Step 1:** Go to the 'Add' view (the first tab)\n**Step 2:** Choose your input source:\n   • Upload an audio file (MP3, WAV, FLAC, etc.)\n   • Paste a YouTube URL\n**Step 3:** Select your options (model quality, output format)\n**Step 4:** Click 'Separate Stems'\n**Step 5:** Monitor progress in the 'Monitor' view\n**Step 6:** Download or play your separated stems!\n\nThat's it! The process typically takes 2-5 minutes per song."
            },

            // ===== FILE UPLOAD & INPUT =====
            {
                keywords: ['upload', 'file', 'audio file', 'how to upload'],
                question: "How do I upload an audio file?",
                answer: "📁 To upload an audio file:\n\n1. Click the 'Add' view tab\n2. Make sure 'Upload File' is selected\n3. Click the file selector or drag & drop\n4. Choose your audio file (max 100MB)\n5. Select your processing options\n6. Click 'Separate Stems'\n\n**Supported formats:** MP3, WAV, FLAC, M4A, OGG, Opus\n**Max file size:** 100MB"
            },
            {
                keywords: ['youtube', 'url', 'youtube url', 'video'],
                question: "Can I use YouTube videos?",
                answer: "▶️ Yes! YouTube support is built-in:\n\n1. Click 'YouTube URL' in the Add view\n2. Paste the YouTube video or playlist URL\n3. The audio will be automatically downloaded\n4. Processing starts automatically\n\n**Features:**\n• Single videos supported\n• Full playlist processing (queued)\n• Videos over 10 minutes are skipped\n• Metadata (title, artist, thumbnail) preserved\n\n**Note:** Only the audio is processed, not video."
            },
            {
                keywords: ['playlist', 'multiple videos', 'batch'],
                question: "Can I process YouTube playlists?",
                answer: "📋 Absolutely! Playlist support is included:\n\n1. Paste a YouTube playlist URL\n2. All videos are added to the queue\n3. They process one at a time (FIFO)\n4. Videos over 10 minutes are automatically skipped\n5. Each video appears in your Library when complete\n\n**Tip:** Use the Monitor view to watch progress on all queued videos!"
            },
            {
                keywords: ['supported formats', 'file types', 'what formats'],
                question: "What file formats are supported?",
                answer: "🎵 **Supported Input Formats:**\n• MP3 (most common)\n• WAV (uncompressed)\n• FLAC (lossless)\n• M4A (Apple/AAC)\n• OGG/Vorbis\n• Opus\n\n**Output Formats (you choose):**\n• MP3 (320 kbps) - smaller files\n• WAV (44.1kHz, 16-bit) - highest quality\n\n**Max file size:** 100MB for uploads"
            },
            {
                keywords: ['file size', 'too large', 'size limit', 'max size'],
                question: "What's the maximum file size?",
                answer: "📏 **File Size Limits:**\n\n• **Uploads:** 100MB maximum\n• **YouTube:** No limit (downloads automatically)\n• **Duration:** No strict limit, but longer songs take more time\n\n**Tips for large files:**\n• Use YouTube URL instead of uploading\n• Compress your audio before uploading\n• Songs over 10 minutes may be slower to process"
            },

            // ===== MODELS & QUALITY =====
            {
                keywords: ['model', 'models', 'which model', 'quality'],
                question: "Which model should I use?",
                answer: "🎯 **Model Comparison:**\n\n**Fast Processing (mdx_extra):**\n• Fastest processing time\n• Good quality for most songs\n• Best for quick jobs\n\n**Standard Quality (htdemucs):**\n• Balanced speed and quality\n• Default choice\n• Great for most use cases\n\n**High Quality (htdemucs_ft) ⭐ RECOMMENDED:**\n• Best separation quality\n• 4x slower than standard\n• Perfect for important projects\n\n**6 Stems (htdemucs_6s):**\n• Separates Guitar + Piano too\n• Piano separation not perfect yet\n• Experimental feature"
            },
            {
                keywords: ['best quality', 'highest quality', 'recommended'],
                question: "Which model gives the best quality?",
                answer: "⭐ **htdemucs_ft (High Quality)** is the best!\n\n**Why it's recommended:**\n• Fine-tuned for superior separation\n• Fewer artifacts and bleed-through\n• Best vocal isolation\n• Trained on 800+ songs\n\n**Trade-off:**\n• Takes 4x longer to process\n• Worth it for important projects\n\n**For most users:** Start with 'Standard Quality' and upgrade to 'High Quality' if you need better results."
            },
            {
                keywords: ['6 stems', 'guitar', 'piano', 'six stems'],
                question: "What is the 6-stem model?",
                answer: "🎸 The **6-Stem Model (htdemucs_6s)** separates:\n\n1. 🎤 Vocals\n2. 🎸 Bass\n3. 🥁 Drums\n4. 🎹 Other\n5. 🎸 **Guitar** (NEW)\n6. 🎹 **Piano** (NEW)\n\n**Note:** Guitar separation is decent, but piano separation is experimental and not always accurate.\n\n**When to use:**\n• You specifically need isolated guitar\n• You want to experiment with piano\n• You're willing to accept lower accuracy\n\n**When NOT to use:**\n• You need reliable piano isolation\n• You want the fastest/best results"
            },
            {
                keywords: ['fast', 'fastest', 'quick', 'speed'],
                question: "Which model is fastest?",
                answer: "⚡ **Fast Processing (mdx_extra)** is the fastest!\n\n**Speed comparison:**\n• **mdx_extra:** ~1-2 minutes per song\n• **htdemucs:** ~2-3 minutes per song\n• **htdemucs_ft:** ~8-12 minutes per song\n\n**Good for:**\n• Testing/experimenting\n• Quick previews\n• Batch processing many songs\n\n**Trade-off:** Slightly lower quality than the other models, but still very good!"
            },

            // ===== OUTPUT & STEMS =====
            {
                keywords: ['stems', 'what are stems', 'tracks'],
                question: "What are stems?",
                answer: "🎼 **Stems** are the individual audio tracks that make up a song:\n\n• 🎤 **Vocals** - all singing/voice\n• 🎸 **Bass** - bass guitar/bass frequencies\n• 🥁 **Drums** - all percussion/drums\n• 🎹 **Other** - everything else (guitar, piano, synths, strings, etc.)\n\n**Example:** If you extract stems from a rock song, you'll get:\n- One file with just the vocals\n- One file with just the bass line\n- One file with just the drums\n- One file with all the other instruments\n\n**Why it's useful:**\n• Create karaoke tracks (remove vocals)\n• Make remixes\n• Practice with isolated instruments\n• Study song arrangements"
            },
            {
                keywords: ['mp3', 'wav', 'output format', 'format'],
                question: "Should I choose MP3 or WAV output?",
                answer: "💾 **MP3 vs WAV:**\n\n**MP3 (320 kbps)** ✓ Recommended\n• Smaller file sizes (10-20MB per stem)\n• Fast downloads\n• High quality\n• Compatible with everything\n• **Best for:** Most users\n\n**WAV (uncompressed)**\n• Larger files (40-60MB per stem)\n• Maximum quality (no compression)\n• Professional standard\n• **Best for:** Audio engineers, professional use\n\n**Bottom line:** Choose MP3 unless you have a specific reason to need WAV!"
            },
            {
                keywords: ['vocals only', 'karaoke', 'remove vocals', 'instrumental'],
                question: "How do I create a karaoke track?",
                answer: "🎤 To create a karaoke/instrumental track:\n\n**Option 1: Extract Vocals Only**\n1. Select 'Vocals Only' in the stems dropdown\n2. Process the song\n3. Invert the vocals to subtract from original\n\n**Option 2: Better Method - Extract All Stems**\n1. Select 'All Stems' (default)\n2. After processing, download all stems\n3. Mix Bass + Drums + Other together\n4. You now have a perfect instrumental!\n\n**Option 3: Use the Player**\n1. Process with 'All Stems'\n2. Load in the Player\n3. Mute the vocals track\n4. Play and enjoy!\n\n**Tip:** Option 2 gives you the most flexibility!"
            },
            {
                keywords: ['download', 'get stems', 'save'],
                question: "How do I download my separated stems?",
                answer: "⬇️ **Downloading your stems:**\n\n**From Monitor View:**\n• Click the download button on any completed job\n• Downloads as a ZIP file\n• Contains all stems as separate audio files\n\n**From Library View:**\n• Click the download icon (⬇️) next to any song\n• Same ZIP file format\n\n**Download All:**\n• Click the 📦 icon in Monitor view\n• Downloads all completed jobs at once\n\n**Inside the ZIP:**\n• bass.mp3 (or .wav)\n• drums.mp3\n• vocals.mp3\n• other.mp3\n• metadata.json (song info)"
            },
            {
                keywords: ['extract drums', 'drums only', 'only drums'],
                question: "Can I extract just one instrument?",
                answer: "🎯 Yes! You can extract specific stems:\n\n**Available options:**\n• Vocals Only\n• Drums Only\n• Bass Only\n• Other Only\n• All Stems (default)\n\n**How to do it:**\n1. In the Add view, find 'Extract Stems' dropdown\n2. Select the stem you want\n3. Process as normal\n4. Only that stem will be in your download\n\n**Note:** Processing time is the same whether you extract one stem or all stems. I recommend extracting all stems for maximum flexibility!"
            },

            // ===== PROCESSING & QUEUE =====
            {
                keywords: ['how long', 'processing time', 'duration', 'wait time'],
                question: "How long does processing take?",
                answer: "⏱️ **Processing times vary by model:**\n\n**Fast Processing (mdx_extra):**\n• 1-2 minutes for a 3-minute song\n\n**Standard Quality (htdemucs):**\n• 2-3 minutes for a 3-minute song\n\n**High Quality (htdemucs_ft):**\n• 8-12 minutes for a 3-minute song\n\n**Factors that affect speed:**\n• Song length (longer = slower)\n• Server load\n• Model quality setting\n• Your CPU/GPU speed\n\n**Tip:** Use Fast Processing for testing, then use High Quality for final results."
            },
            {
                keywords: ['queue', 'monitor', 'progress', 'check status'],
                question: "How do I monitor processing?",
                answer: "👁️ **Monitoring your jobs:**\n\n**Monitor View:**\n• Shows all active and completed jobs\n• Real-time progress bars\n• Detailed status messages\n• Filter by status (All, Active, Queued, Completed)\n\n**View Badge:**\n• The Monitor tab shows a badge with active job count\n• Updates automatically\n\n**What you'll see:**\n• ⏳ Queued - waiting to start\n• ⚙️ Processing - currently running (with % progress)\n• ✅ Completed - ready to download\n• ❌ Failed - error occurred\n\n**Tip:** Jobs process one at a time in order (FIFO queue)"
            },
            {
                keywords: ['cancel', 'stop', 'abort'],
                question: "Can I cancel a job?",
                answer: "❌ Yes, you can cancel queued or processing jobs:\n\n**How to cancel:**\n1. Go to Monitor or Library view\n2. Find the job you want to cancel\n3. Click the cancel button (❌)\n4. Confirm the cancellation\n\n**What happens:**\n• Job stops immediately\n• Removed from queue\n• Partial results deleted\n• Cannot be resumed\n\n**Note:** You can only cancel jobs that are 'Queued' or 'Processing'. Completed jobs cannot be cancelled (but can be deleted)."
            },
            {
                keywords: ['multiple', 'batch', 'many files', 'several'],
                question: "Can I process multiple files at once?",
                answer: "📚 **Batch processing is supported!**\n\n**For multiple files:**\n1. Upload or add them one at a time\n2. They're automatically added to the queue\n3. They process sequentially (one at a time)\n4. Monitor all jobs in the Monitor view\n\n**For playlists:**\n• Paste a YouTube playlist URL\n• All videos are queued automatically\n• Process one by one\n\n**Why sequential?**\n• Prevents system overload\n• Better quality results\n• Predictable processing times\n\n**Tip:** Use playlists or add multiple files quickly - the queue handles everything!"
            },
            {
                keywords: ['cached', 'cache', 'already processed'],
                question: "What does 'cached' mean?",
                answer: "💾 **Cached** means the song was already processed!\n\n**What happens:**\n• System checks if this exact song was processed before\n• If yes, instantly returns the previous results\n• No processing needed\n• Saves time and resources\n\n**How it works:**\n• Uses a unique hash of the audio content\n• Same song from YouTube = cached\n• Re-uploading same file = cached\n• Different quality/format of same song = may not be cached\n\n**Benefits:**\n• Instant results (0 seconds)\n• No waiting in queue\n• Same quality as original processing"
            },

            // ===== LIBRARY & HISTORY =====
            {
                keywords: ['library', 'history', 'past', 'previous'],
                question: "What is the Library view?",
                answer: "📚 **The Library** shows all your processed songs:\n\n**Features:**\n• Complete history of all jobs\n• Searchable and sortable\n• Shows status, duration, thumbnail\n• Quick access to download/play\n\n**What you can do:**\n• ⬇️ Download stems again\n• 🎵 Load into player\n• 🔄 Reprocess with different settings\n• 🗑️ Delete old jobs\n\n**Info shown:**\n• Song title\n• Artist/channel\n• Duration\n• Status (completed, processing, etc.)\n• Thumbnail (for YouTube videos)\n\n**Tip:** Click on a song thumbnail or title to load it into the Player!"
            },
            {
                keywords: ['delete', 'remove', 'clear'],
                question: "How do I delete old jobs?",
                answer: "🗑️ **Deleting jobs:**\n\n**Delete individual job:**\n1. Go to Library view\n2. Click the delete button (🗑️) next to the song\n3. Confirm deletion\n4. Job and all files are permanently removed\n\n**Clear completed history (Monitor view):**\n1. Go to Monitor view\n2. Click the clear history button (🗑️)\n3. Only removes from view, files stay in Library\n\n**Warning:** Deletion is permanent and cannot be undone!\n\n**Tip:** Delete old jobs to free up storage space."
            },
            {
                keywords: ['reprocess', 'process again', 'different model'],
                question: "Can I reprocess a song with different settings?",
                answer: "🔄 **Yes, you can reprocess any song!**\n\n**How to reprocess:**\n1. Go to Library view\n2. Find the song\n3. Click the refresh button (🔄)\n4. Confirm reprocessing\n5. Job is queued with same settings\n\n**Use cases:**\n• Try a different model (higher quality)\n• Re-extract with different stem options\n• Original processing failed\n• Want better results\n\n**Note:** \n• Original output is deleted\n• Uses the same model/settings as before\n• To change settings, upload/add again\n\n**Tip:** For cached YouTube videos, reprocessing is free!"
            },

            // ===== PLAYER & MIXER =====
            {
                keywords: ['player', 'play', 'listen', 'playback'],
                question: "How does the player work?",
                answer: "🎵 **The Player lets you listen to separated stems!**\n\n**How to use:**\n1. Process a song (wait for completion)\n2. Go to Library view\n3. Click on the song thumbnail or title\n4. Player view opens automatically\n5. Press play!\n\n**Features:**\n• Play/pause controls\n• Skip between tracks\n• Timeline scrubbing\n• Mixer for each stem\n• Master volume control\n\n**Mixer features:**\n• Individual volume for each stem\n• Pan left/right\n• Mute/solo buttons\n• Save mixer settings (auto-saved)\n\n**Tip:** Use mute/solo to isolate specific instruments while listening!"
            },
            {
                keywords: ['mixer', 'volume', 'mute', 'solo'],
                question: "How do I use the mixer?",
                answer: "🎛️ **Mixer Controls:**\n\n**Access the mixer:**\n1. Load a song in Player view\n2. Click the mixer button (🎛️)\n3. Mixer panel appears\n\n**For each stem:**\n• **Volume knob:** Drag up/down to adjust\n• **Pan knob:** Drag to pan left/right\n• **M button:** Mute this stem\n• **S button:** Solo this stem (mutes all others)\n\n**Master section:**\n• Controls overall volume\n• Affects all stems together\n\n**Tips:**\n• Solo vocals to hear just the singing\n• Mute vocals for karaoke mode\n• Pan different instruments for spatial effect\n• Settings auto-save for each song\n\n**How to use knobs:** Click and drag UP to increase, DOWN to decrease"
            },
            {
                keywords: ['mute vocals', 'isolate', 'solo drums'],
                question: "How do I isolate specific instruments?",
                answer: "🎯 **Isolating instruments in the Player:**\n\n**Method 1: Solo**\n1. Open the mixer (🎛️ button)\n2. Click 'S' (Solo) on the instrument you want\n3. All other stems are muted\n4. Perfect for focused listening\n\n**Method 2: Mute**\n1. Open the mixer\n2. Click 'M' (Mute) on instruments you don't want\n3. Leave target instrument unmuted\n4. More manual but more flexible\n\n**Examples:**\n• Solo vocals = Click 'S' on vocals stem\n• Karaoke = Click 'M' on vocals stem\n• Just rhythm = Mute vocals and other\n\n**Tip:** Solo is faster for isolating; mute is better for creating custom mixes!"
            },
            {
                keywords: ['pan', 'panning', 'stereo', 'left right'],
                question: "What does the pan control do?",
                answer: "↔️ **Panning controls stereo positioning:**\n\n**What it does:**\n• **Center (C):** Sound equally in both ears\n• **Left (L):** Sound more in left ear/speaker\n• **Right (R):** Sound more in right ear/speaker\n\n**How to use:**\n1. Open mixer in Player\n2. Find the 'Pan' knob for any stem\n3. Drag up/down to adjust\n4. Watch the value change (L, C, R)\n\n**Creative uses:**\n• Pan drums to one side, bass to other\n• Create wide stereo field\n• Emphasize specific instruments\n• Make space in the mix\n\n**Tip:** Most stems sound best at center (C), but experiment!"
            },
            {
                keywords: ['navigate', 'skip', 'prev next', 'previous next'],
                question: "How do I navigate between songs in the player?",
                answer: "⏭️ **Player Navigation:**\n\n**Transport controls:**\n• ⏮ **Prev Track:** Load previous song in library\n• ⏪ **Restart:** Jump to beginning of current song\n• ▶️/⏸ **Play/Pause:** Toggle playback\n• ⏭ **Next Track:** Load next song in library\n• 🎛️ **Mixer:** Show/hide mixer controls\n\n**Timeline:**\n• Click anywhere on timeline to jump\n• Drag while playing to scrub\n\n**Tip:** Prev/Next buttons cycle through your Library, so you can listen to all your separated tracks in sequence!"
            },

            // ===== TECHNICAL & TROUBLESHOOTING =====
            {
                keywords: ['slow', 'taking long', 'stuck', 'not moving'],
                question: "Processing is very slow. What can I do?",
                answer: "🐌 **Troubleshooting slow processing:**\n\n**Normal processing times:**\n• Fast: 1-2 min\n• Standard: 2-3 min\n• High Quality: 8-12 min\n\n**If it's slower than this:**\n\n1. **Check queue position**\n   • Multiple jobs? They process one at a time\n   • Check Monitor view for your position\n\n2. **Try a faster model**\n   • Switch to 'Fast Processing' (mdx_extra)\n\n3. **Refresh the page**\n   • Progress continues server-side\n   • Reconnect by refreshing\n\n4. **Server load**\n   • Peak times may be slower\n   • Try again later\n\n5. **Very long songs**\n   • 10+ minute songs take proportionally longer\n\n**Still stuck? Refresh the page or try canceling and restarting.**"
            },
            {
                keywords: ['error', 'failed', 'not working'],
                question: "My job failed. What should I do?",
                answer: "❌ **Job failure troubleshooting:**\n\n**Common causes:**\n\n1. **File format issue**\n   • Try converting to MP3 first\n   • Some rare formats may not work\n\n2. **File too large**\n   • Max upload is 100MB\n   • Try shorter clip or use YouTube URL\n\n3. **Corrupted file**\n   • Re-download the original\n   • Try a different source\n\n4. **YouTube video issues**\n   • Video might be private/deleted\n   • Age-restricted videos may fail\n   • Try different video\n\n5. **Server timeout**\n   • Very long songs may timeout\n   • Try shorter clip\n\n**What to do:**\n• Check error message in Monitor view\n• Try uploading again\n• Try different file format\n• Contact support if persists"
            },
            {
                keywords: ['quality', 'sounds bad', 'artifacts', 'distorted'],
                question: "The separated audio has artifacts or sounds bad",
                answer: "🔊 **Improving separation quality:**\n\n**Try these solutions:**\n\n1. **Use a better model**\n   • Switch to 'High Quality (htdemucs_ft)'\n   • Worth the extra processing time\n\n2. **Check input quality**\n   • Use highest quality source file\n   • Avoid low bitrate MP3s\n   • YouTube videos vary in quality\n\n3. **Understand limitations**\n   • AI separation isn't perfect\n   • Some songs separate better than others\n   • Complex arrangements are harder\n\n4. **Genre matters**\n   • Rock/pop: Usually excellent\n   • Electronic/heavy processing: May have artifacts\n   • Classical/jazz: Can be challenging\n\n**Tips:**\n• Start with high quality input\n• Use htdemucs_ft for best results\n• Some 'bleed' between stems is normal"
            },
            {
                keywords: ['websocket', 'progress not updating', 'connection'],
                question: "Progress updates aren't showing",
                answer: "🔌 **Progress tracking issues:**\n\n**Quick fixes:**\n\n1. **Refresh the page**\n   • Processing continues server-side\n   • Progress will update after refresh\n\n2. **Check Monitor view**\n   • Go to Monitor tab\n   • Click refresh button (🔄)\n\n3. **Check internet connection**\n   • WebSocket requires stable connection\n   • Try switching networks\n\n4. **Clear browser cache**\n   • Force refresh (Ctrl+Shift+R or Cmd+Shift+R)\n\n5. **Check firewall**\n   • Some corporate networks block WebSockets\n\n**How it works:**\n• Real-time updates via WebSocket\n• Falls back to periodic checks\n• Your job is still processing even if updates stop\n\n**Tip:** Even if progress doesn't update, check back in a few minutes - your job is still running!"
            },
            {
                keywords: ['browser', 'compatibility', 'which browser'],
                question: "Which browsers are supported?",
                answer: "🌐 **Browser Compatibility:**\n\n**Fully Supported:**\n• ✅ Chrome/Chromium (recommended)\n• ✅ Firefox\n• ✅ Safari (macOS/iOS)\n• ✅ Edge (Chromium-based)\n\n**Features requiring modern browser:**\n• WebSocket for real-time progress\n• Web Audio API for player/mixer\n• File upload API\n• Tone.js for audio playback\n\n**Recommended:**\n• **Chrome** or **Firefox** for best experience\n• Keep browser updated\n• Enable JavaScript\n• Allow cookies (for settings)\n\n**Mobile:**\n• Works on mobile browsers\n• Player may have limited features\n• Upload may be slower\n\n**Tip:** For best experience, use latest Chrome or Firefox on desktop!"
            },

            // ===== ADVANCED FEATURES =====
            {
                keywords: ['metadata', 'information', 'song info'],
                question: "Is song metadata preserved?",
                answer: "📋 **Metadata Handling:**\n\n**For YouTube videos:**\n• ✅ Title\n• ✅ Artist/Channel name\n• ✅ Duration\n• ✅ Thumbnail image\n• ✅ Description\n• ✅ Upload date\n\n**For uploaded files:**\n• ✅ Filename\n• ✅ Duration (detected)\n• ❌ ID3 tags (not read)\n\n**Where it's used:**\n• Library view (shows all metadata)\n• Player view (displays title/artist)\n• Download ZIP (metadata.json file)\n\n**metadata.json includes:**\n```json\n{\n  \"title\": \"Song Name\",\n  \"artist\": \"Artist Name\",\n  \"model\": \"htdemucs_ft\",\n  \"duration\": 245,\n  \"format\": \"mp3\"\n}\n```"
            },
            {
                keywords: ['api', 'integration', 'automate'],
                question: "Is there an API for automation?",
                answer: "🔧 **API Endpoints:**\n\nYes! The backend has a REST API:\n\n**Main endpoints:**\n• `POST /api/upload` - Upload audio file\n• `POST /api/youtube` - Process YouTube URL\n• `GET /api/status/{job_id}` - Check job status\n• `GET /api/jobs` - List all jobs\n• `GET /api/download/{job_id}` - Download stems\n• `POST /api/cancel/{job_id}` - Cancel job\n• `DELETE /api/jobs/{job_id}` - Delete job\n\n**WebSocket:**\n• `/progress` namespace\n• Real-time progress updates\n• Subscribe to specific jobs\n\n**Documentation:**\n• Check server/README.md for details\n• API returns JSON responses\n• Standard HTTP status codes\n\n**Tip:** You can build custom tools/scripts using these endpoints!"
            },
            {
                keywords: ['storage', 'space', 'disk space'],
                question: "How much storage do stems use?",
                answer: "💾 **Storage Requirements:**\n\n**Per song (4 stems):**\n\n**MP3 output (320 kbps):**\n• ~10-20 MB per stem\n• Total: ~40-80 MB per song\n• **Recommended for most users**\n\n**WAV output (uncompressed):**\n• ~40-60 MB per stem\n• Total: ~160-240 MB per song\n• For professional/archival use\n\n**6-stem model:**\n• Add ~50% more storage\n\n**Tips to save space:**\n• Use MP3 output format\n• Delete old jobs you don't need\n• Download and delete from server\n• Process on-demand instead of batch\n\n**Example:** 100 songs in MP3 = ~5-8 GB"
            },
            {
                keywords: ['offline', 'local', 'privacy'],
                question: "Does this work offline? Is my data private?",
                answer: "🔒 **Privacy & Offline:**\n\n**Privacy:**\n• Audio is processed on the server\n• Files stored temporarily during processing\n• You can delete files anytime\n• No data shared with third parties\n\n**Offline:**\n• ❌ Requires internet connection\n• Processing happens server-side\n• Downloads work normally\n\n**Your data:**\n• Uploaded files: Stored temporarily\n• YouTube: Only audio downloaded\n• Results: Kept until you delete\n• Metadata: Stored in Library\n\n**Self-hosting:**\n• This app can be self-hosted\n• Full control over your data\n• See deployment docs\n\n**Tip:** For maximum privacy, self-host or process files locally using the command-line Demucs tool!"
            },

            // ===== TIPS & TRICKS =====
            {
                keywords: ['tips', 'tricks', 'best practices', 'advice'],
                question: "What are some tips and tricks?",
                answer: "💡 **Pro Tips:**\n\n**For best quality:**\n1. Use highest quality source files\n2. Choose 'High Quality' model (htdemucs_ft)\n3. Use WAV output for archival\n\n**For speed:**\n1. Use 'Fast Processing' model\n2. Extract only the stem you need\n3. Use YouTube URLs (no upload time)\n\n**Workflow tips:**\n1. Process multiple songs via playlist\n2. Use Library view to organize\n3. Load songs in Player to preview\n4. Export mixer settings for consistent sound\n\n**Creative uses:**\n1. Create practice tracks (mute vocals)\n2. Make remixes (isolate stems)\n3. Study arrangements (solo instruments)\n4. Create stems for live performance\n\n**Shortcuts:**\n• Click thumbnail to quick-load in Player\n• Use 📦 to download all completed jobs\n• Refresh button (🔄) for instant updates"
            },
            {
                keywords: ['use cases', 'what can i do', 'examples'],
                question: "What can I do with separated stems?",
                answer: "🎨 **Creative Use Cases:**\n\n**Music Production:**\n• 🎧 Create remixes\n• 🔄 Mashups with other songs\n• 🎹 Add your own instruments\n• 🎚️ Better mixing/mastering\n\n**Practice & Learning:**\n• 🎸 Practice with isolated backing tracks\n• 🎵 Study arrangements and production\n• 🎤 Learn vocals without music\n• 🥁 Drum along to isolated tracks\n\n**Performance:**\n• 🎤 Karaoke tracks (remove vocals)\n• 🎸 Live backing tracks\n• 🎼 Cover songs with custom arrangements\n• 🎪 DJ sets with isolated elements\n\n**Content Creation:**\n• 🎬 Video background music\n• 📹 Podcast intros\n• 🎮 Game streaming overlays\n• 📱 Social media content\n\n**Fun stuff:**\n• 🤪 Create acapella versions\n• 🎵 Make 'only drums' memes\n• 🔊 Hear your favorite songs differently"
            },
            {
                keywords: ['copyright', 'legal', 'licensing'],
                question: "Is using Demucs for stem separation legal?",
                answer: "⚖️ **Legal & Copyright:**\n\n**The tool itself:**\n• ✅ Demucs is open-source (MIT license)\n• ✅ Legal to use for separation\n• ✅ No restrictions on the software\n\n**The content:**\n• ⚠️ You must own rights to the audio\n• ⚠️ Or have permission to process it\n• ⚠️ Copyright still applies to the music\n\n**Legal uses:**\n• ✅ Your own music\n• ✅ Royalty-free/Creative Commons tracks\n• ✅ Personal practice/education\n• ✅ With explicit permission\n\n**Questionable uses:**\n• ⚠️ Copyrighted songs for performance\n• ⚠️ Commercial use without license\n• ⚠️ Distribution of separated stems\n\n**Disclaimer:**\n• This is not legal advice\n• Check your local laws\n• Respect artists' rights\n• When in doubt, get permission\n\n**Tip:** Stick to your own music or licensed content!"
            },

            // ===== COMPARISON & ALTERNATIVES =====
            {
                keywords: ['vs', 'compared', 'alternative', 'better than'],
                question: "How does Demucs compare to other tools?",
                answer: "⚖️ **Demucs vs Alternatives:**\n\n**Demucs Advantages:**\n• ✅ State-of-the-art quality\n• ✅ Open source & free\n• ✅ Active development\n• ✅ Multiple models\n• ✅ Research-backed (Facebook/Meta)\n\n**Competitors:**\n\n**Spleeter (Deezer):**\n• Older technology\n• Faster but lower quality\n• Good for quick previews\n\n**UVR (Ultimate Vocal Remover):**\n• GUI application\n• Uses multiple models (including Demucs)\n• More features but steeper learning curve\n\n**Online services:**\n• Often use Demucs under the hood\n• More convenient\n• Usually paid/limited\n\n**Why Demucs wins:**\n• Best quality available\n• Free and open\n• Self-hostable\n• Well-documented\n\n**This web app adds:**\n• Easy-to-use interface\n• YouTube integration\n• Queue management\n• Built-in player"
            },

            // ===== MISC & HELP =====
            {
                keywords: ['support', 'contact', 'bug', 'issue'],
                question: "How do I report bugs or get help?",
                answer: "🆘 **Getting Help:**\n\n**In-app help:**\n1. This chatbot (you're using it!)\n2. Check error messages in Monitor view\n3. Review documentation\n\n**For bugs:**\n• Check browser console (F12)\n• Note the error message\n• Try refreshing the page\n• Report via GitHub issues\n\n**Documentation:**\n• README.md - Basic usage\n• TROUBLESHOOTING.md - Common issues\n• QUICKREF.md - Quick reference\n• server/README.md - API docs\n\n**Community:**\n• GitHub discussions\n• Check existing issues\n• Contribute improvements\n\n**What to include in bug reports:**\n• Browser and version\n• Steps to reproduce\n• Error messages\n• Job ID (if applicable)\n\n**Tip:** Most issues can be solved by refreshing the page or trying a different model!"
            },
            {
                keywords: ['contribute', 'development', 'code'],
                question: "Can I contribute to this project?",
                answer: "🤝 **Contributing:**\n\n**Ways to contribute:**\n\n**Code:**\n• Fix bugs\n• Add features\n• Improve UI/UX\n• Optimize performance\n\n**Documentation:**\n• Improve README\n• Add tutorials\n• Translate to other languages\n• Update troubleshooting guide\n\n**Testing:**\n• Report bugs\n• Test new features\n• Suggest improvements\n\n**Getting started:**\n1. Fork the repository\n2. Read DEVELOPMENT.md\n3. Make your changes\n4. Submit a pull request\n\n**Tech stack:**\n• Backend: Python (Flask)\n• Frontend: Vanilla JavaScript\n• Processing: Demucs\n• Audio: Tone.js\n\n**Tip:** Check GitHub issues for 'good first issue' labels!"
            },
            {
                keywords: ['thank', 'thanks', 'awesome', 'great'],
                question: "Thank you!",
                answer: "🎉 You're welcome! I'm glad I could help!\n\nRemember:\n• Start with 'Standard Quality' for testing\n• Use 'High Quality' for important projects\n• The Player is great for previewing stems\n• YouTube playlists can process in batch\n\nEnjoy separating your audio! Feel free to ask if you have any other questions. 🎵"
            },
            {
                keywords: ['commands', 'what can you do', 'help topics'],
                question: "What topics can you help with?",
                answer: "🎯 **I can help with:**\n\n**Getting Started:**\n• How to upload files\n• Using YouTube URLs\n• Choosing models\n\n**Processing:**\n• Understanding stems\n• Output formats\n• Queue management\n• Processing times\n\n**Features:**\n• Player and mixer\n• Library management\n• Batch processing\n\n**Troubleshooting:**\n• Failed jobs\n• Slow processing\n• Quality issues\n\n**Advanced:**\n• API usage\n• Best practices\n• Tips and tricks\n\n**Just ask me anything like:**\n• 'How do I upload a file?'\n• 'Which model is best?'\n• 'How to create karaoke?'\n• 'What are stems?'\n\nI'm here to help! 🎵"
            }
        ];
    }

    findBestMatch(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const words = lowerMessage.split(/\s+/);
        
        let bestMatch = null;
        let bestScore = 0;

        for (const item of this.knowledgeBase) {
            let score = 0;
            
            // Check each keyword against the message
            for (const keyword of item.keywords) {
                if (lowerMessage.includes(keyword.toLowerCase())) {
                    // Longer keyword matches score higher
                    score += keyword.split(' ').length;
                }
            }

            // Boost score if multiple keywords match
            const matchCount = item.keywords.filter(k => 
                lowerMessage.includes(k.toLowerCase())
            ).length;
            score *= (1 + matchCount * 0.5);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = item;
            }
        }

        // If no good match found, return default help
        if (bestScore < 1) {
            return this.knowledgeBase[0]; // Return first (hello/help) item
        }

        return bestMatch;
    }

    chat(userMessage) {
        const match = this.findBestMatch(userMessage);
        
        this.chatHistory.push({
            type: 'user',
            message: userMessage,
            timestamp: new Date()
        });

        this.chatHistory.push({
            type: 'bot',
            message: match.answer,
            timestamp: new Date()
        });

        return match.answer;
    }

    getSuggestions() {
        // Return random suggestions
        const suggestions = [
            "How do I upload a file?",
            "Which model should I use?",
            "How do I create karaoke tracks?",
            "What are stems?",
            "How long does processing take?",
            "Can I use YouTube URLs?",
            "How do I use the mixer?",
            "What does the 6-stem model do?",
            "Tips and tricks?"
        ];
        
        // Return 3 random suggestions
        return suggestions.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    clearHistory() {
        this.chatHistory = [];
    }
}

// Export for use in app
window.DemucsChatbot = DemucsChatbot;

