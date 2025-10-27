# Demucs Chatbot Guide

The Demucs web app includes an intelligent chatbot assistant to help users understand how to use the application. The chatbot is pre-programmed with extensive knowledge about Demucs and this web interface.

## Features

- **50+ Pre-programmed Scenarios**: Comprehensive coverage of common questions and use cases
- **Keyword-based Matching**: Smart algorithm to find the best answer for any question
- **Contextual Suggestions**: Dynamically generated suggestions based on common questions
- **User-friendly UI**: Modern chat interface with typing indicators and smooth animations
- **Fully Static**: No external API calls, all responses stored locally
- **Fast Response**: Instant answers without network latency

## How to Use

### Accessing the Chatbot

1. Look for the **💬 chat icon** in the bottom-right corner of the screen
2. Click the icon to open the chatbot window
3. Type your question or click on a suggested question
4. Press Enter or click the send button

### Keyboard Shortcuts

- **Enter**: Send message
- **Escape**: Close chatbot window

## Topics Covered

The chatbot can help with the following topics:

### 1. Getting Started (5 scenarios)
- What is Demucs?
- How to get started?
- First-time user guidance
- Hello/Help messages
- Basic navigation

### 2. File Upload & Input (5 scenarios)
- How to upload audio files
- Supported file formats
- File size limitations
- YouTube URL processing
- YouTube playlist support

### 3. Models & Quality (4 scenarios)
- Model comparison and selection
- Which model gives best quality?
- Understanding the 6-stem model
- Speed vs quality trade-offs

### 4. Output & Stems (5 scenarios)
- What are stems?
- MP3 vs WAV output
- Creating karaoke tracks
- Extracting specific instruments
- Downloading separated stems

### 5. Processing & Queue (5 scenarios)
- Processing times and expectations
- Monitoring job progress
- Canceling jobs
- Batch processing
- Understanding cached results

### 6. Library & History (3 scenarios)
- Using the Library view
- Deleting old jobs
- Reprocessing with different settings

### 7. Player & Mixer (5 scenarios)
- How the player works
- Using the mixer controls
- Isolating specific instruments
- Panning controls
- Navigation between songs

### 8. Technical & Troubleshooting (5 scenarios)
- Slow processing issues
- Job failures
- Audio quality problems
- WebSocket/connection issues
- Browser compatibility

### 9. Advanced Features (4 scenarios)
- Metadata preservation
- API for automation
- Storage requirements
- Privacy and offline capabilities

### 10. Tips & Best Practices (4 scenarios)
- Pro tips and tricks
- Creative use cases
- Legal and copyright considerations
- Demucs vs alternatives

### 11. Support & Contribution (3 scenarios)
- Getting help and reporting bugs
- Contributing to the project
- Available documentation

## Sample Questions

Here are examples of questions you can ask the chatbot:

### Basic Usage
- "How do I upload a file?"
- "Can I use YouTube videos?"
- "What file formats are supported?"
- "How do I get started?"

### Model Selection
- "Which model should I use?"
- "What's the difference between models?"
- "Which model is fastest?"
- "What is the 6-stem model?"

### Processing
- "How long does processing take?"
- "How do I monitor progress?"
- "Can I cancel a job?"
- "What does 'cached' mean?"

### Stems & Output
- "What are stems?"
- "How do I create karaoke tracks?"
- "Should I use MP3 or WAV?"
- "How do I download my stems?"

### Player Features
- "How does the player work?"
- "How do I use the mixer?"
- "How do I isolate vocals?"
- "What does the pan control do?"

### Troubleshooting
- "Processing is very slow"
- "My job failed"
- "The audio sounds bad"
- "Progress isn't updating"

### Advanced
- "Is there an API?"
- "How much storage do stems use?"
- "Can I process playlists?"
- "What are the best practices?"

## Knowledge Base Structure

The chatbot uses a keyword-based matching system:

1. **Keywords**: Each scenario has multiple associated keywords
2. **Scoring**: Questions are matched against keywords with weighted scoring
3. **Best Match**: The highest-scoring scenario is returned
4. **Fallback**: If no good match is found, a general help message is shown

### Example Scenario Structure

```javascript
{
    keywords: ['model', 'models', 'which model', 'quality'],
    question: "Which model should I use?",
    answer: "🎯 **Model Comparison:**\n\n**Fast Processing (mdx_extra):**\n• Fastest processing time\n..."
}
```

## Customization

### Adding New Scenarios

To add new Q&A pairs, edit `/server/static/js/chatbot.js`:

1. Open the `initializeKnowledgeBase()` method
2. Add a new object to the array:

```javascript
{
    keywords: ['your', 'keywords', 'here'],
    question: "Your question?",
    answer: "Your detailed answer with markdown formatting"
}
```

### Modifying Suggestions

Edit the `getSuggestions()` method to add/change suggested questions:

```javascript
const suggestions = [
    "Your new suggestion?",
    "Another suggestion?",
    // ... more suggestions
];
```

## Styling

The chatbot styling can be customized in `/server/static/css/style.css`:

- **Colors**: Modify CSS variables in `:root`
- **Size**: Adjust `#chatbot-container` width/height
- **Position**: Change `bottom` and `right` properties
- **Animations**: Modify `@keyframes` rules

## Technical Details

### Files

- **JavaScript**: `/server/static/js/chatbot.js` (chatbot logic)
- **CSS**: `/server/static/css/style.css` (chatbot styles)
- **HTML**: `/server/static/index.html` (chatbot UI)
- **Integration**: `/server/static/js/app.js` (initialization)

### Architecture

```
DemucsChatbot Class
├── knowledgeBase: Array of Q&A scenarios
├── chatHistory: Array of past messages
├── isOpen: Boolean state
│
├── findBestMatch(userMessage)
│   └── Returns best matching scenario
│
├── chat(userMessage)
│   └── Adds to history and returns response
│
└── getSuggestions()
    └── Returns random suggestions
```

### Performance

- **Response Time**: < 10ms (local processing)
- **Memory Usage**: ~500KB (knowledge base)
- **Network**: Zero network requests
- **Compatibility**: All modern browsers

## Accessibility

The chatbot includes accessibility features:

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Automatic focus on input when opened
- **Escape Key**: Quick close with Escape key

## Mobile Support

The chatbot is fully responsive:

- **Adaptive Layout**: Adjusts to screen size
- **Touch Friendly**: Large touch targets
- **Scrollable**: Messages scroll smoothly
- **Bottom Sheet**: Full-width on mobile

## Future Enhancements

Potential improvements for future versions:

1. **Persistent History**: Save chat history to localStorage
2. **Search**: Full-text search across knowledge base
3. **Links**: Direct links to relevant app sections
4. **Rich Media**: Images, videos, or audio examples
5. **Multi-language**: Support for multiple languages
6. **Analytics**: Track common questions for improvements
7. **Context Awareness**: Detect current view and provide relevant help
8. **Quick Actions**: Execute actions directly from chat (e.g., "upload file")

## Analytics

To understand which questions users ask most frequently:

1. Add tracking to the `chat()` method
2. Log questions to server or analytics service
3. Use data to improve knowledge base
4. Add more scenarios for common questions

## License

The chatbot feature is part of the Demucs web app and follows the same MIT license.

## Contributing

To contribute improvements to the chatbot:

1. Add new scenarios to the knowledge base
2. Improve existing answers with more detail
3. Fix typos or outdated information
4. Enhance the matching algorithm
5. Submit pull requests with your changes

## Support

If you have questions about the chatbot or want to suggest improvements:

1. Open an issue on GitHub
2. Include "Chatbot:" in the issue title
3. Describe your suggestion or problem
4. Tag with "enhancement" or "documentation"

---

**Built with ❤️ to help users get the most out of Demucs!**

