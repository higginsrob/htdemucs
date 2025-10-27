# Chatbot Visual Guide

This document provides a visual representation (in ASCII/text art) of how the chatbot appears and functions.

## Component Layout

### 1. Floating Chat Button

```
┌─────────────────────────────────────────┐
│                                         │
│         Your App Content                │
│                                         │
│                                         │
│                                         │
│                                    ┌────┤
│                                    │ 💬 │ ← Click to open
│                                    └────┤
└─────────────────────────────────────────┘
     Bottom-right corner, always visible
```

**Features:**
- 60x60px circular button
- Gradient blue background
- 💬 emoji icon
- Smooth hover animation (scales to 1.1x)
- Glowing shadow on hover

### 2. Chat Window (Opened)

```
┌─────────────────────────────────────────┐
│                                         │
│         Your App Content                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 🤖 Demucs Assistant          [×] │  │ ← Header (blue gradient)
│  ├──────────────────────────────────┤  │
│  │                                  │  │
│  │  ┌────────────────────────────┐ │  │
│  │  │ 👋 Welcome!                │ │  │ ← Welcome card
│  │  │ I'm here to help you...    │ │  │
│  │  │                            │ │  │
│  │  │ 🔹 How do I upload a file? │ │  │ ← Suggestions
│  │  │ 🔹 Which model is best?    │ │  │
│  │  │ 🔹 What are stems?         │ │  │
│  │  └────────────────────────────┘ │  │
│  │                                  │  │
│  │  🤖 [Bot message appears here]  │  │ ← Messages
│  │     👤 [User message here]      │  │    area
│  │  🤖 [Bot response here]         │  │
│  │                                  │  │
│  ├──────────────────────────────────┤  │
│  │ [Type your message...    ] [📤] │  │ ← Input field
│  └──────────────────────────────────┘  │
│                               ┌────┐   │
│                               │ 💬 │   │ ← Button (red when open)
│                               └────┘   │
└─────────────────────────────────────────┘
```

**Dimensions:**
- Width: 400px (desktop), full-width (mobile)
- Height: 600px
- Position: Fixed, bottom-right

### 3. Message Flow Example

```
Initial State:
┌──────────────────────────────┐
│ 🤖 Demucs Assistant     [×]  │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │ 👋 Welcome!            │  │
│  │ Ask me anything!       │  │
│  │                        │  │
│  │ 🔹 Suggestion 1        │  │
│  │ 🔹 Suggestion 2        │  │
│  │ 🔹 Suggestion 3        │  │
│  └────────────────────────┘  │
│                              │
│                              │
├──────────────────────────────┤
│ [Type message...    ] [📤]  │
└──────────────────────────────┘

User clicks suggestion:
┌──────────────────────────────┐
│ 🤖 Demucs Assistant     [×]  │
├──────────────────────────────┤
│                              │
│            ┌──────────────┐  │
│  👤        │ How do I     │  │ ← User message (right, blue)
│            │ upload file? │  │
│            └──────────────┘  │
│                              │
│  🤖 • • •                    │ ← Typing indicator
│                              │
├──────────────────────────────┤
│ [Type message...    ] [📤]  │
└──────────────────────────────┘

Bot responds:
┌──────────────────────────────┐
│ 🤖 Demucs Assistant     [×]  │
├──────────────────────────────┤
│                              │
│            ┌──────────────┐  │
│  👤        │ How do I     │  │
│            │ upload file? │  │
│            └──────────────┘  │
│                              │
│  ┌──────────────────────┐   │
│  │ 📁 To upload an      │ 🤖│ ← Bot response (left, gray)
│  │ audio file:          │   │
│  │                      │   │
│  │ 1. Click Add view    │   │
│  │ 2. Choose file...    │   │
│  │ [Full answer shown]  │   │
│  └──────────────────────┘   │
│                              │
├──────────────────────────────┤
│ [Type message...    ] [📤]  │
└──────────────────────────────┘
```

## Color Scheme

### Light Mode Colors (if implemented)
```
Header:         Blue gradient (#6366f1 → #8b5cf6)
Background:     White (#ffffff)
User messages:  Blue (#6366f1)
Bot messages:   Light gray (#f3f4f6)
Borders:        Light gray (#e5e7eb)
Text:           Dark gray (#1f2937)
```

### Dark Mode Colors (current)
```
Header:         Blue gradient (#24374a → #0f1a35)
Background:     Dark blue (#000206)
Surface:        Dark gray (#171d2a)
User messages:  Blue (#24374a)
Bot messages:   Dark surface (#171d2a)
Borders:        Transparent/subtle
Text Primary:   Light blue (#aecceb)
Text Secondary: Yellow (#ded895)
```

## Animation States

### Opening Animation
```
Frame 1:      Frame 2:      Frame 3:      Frame 4:
(Closed)      (25%)         (75%)         (Open)

   [💬]          [💬]          [💬]          [💬]

                 ┌──┐
                          ┌─────┐
                                    ┌──────────┐
                                    │ 🤖 Chat  │
                                    ├──────────┤
                                    │ Messages │
                                    │          │
                                    ├──────────┤
                                    │ [Input]  │
                                    └──────────┘

Duration: 0.3 seconds
Easing: ease-out
```

### Typing Indicator
```
Frame 1:    Frame 2:    Frame 3:    Frame 4:
  •  •  •     •  •  •     •  •  •     •  •  •
                ↑                   ↑              ↑

Animation: Dots bounce up one at a time
Duration: 1.4 seconds (loops)
```

### Message Slide-In
```
Frame 1:      Frame 2:      Frame 3:
(Hidden)      (Partial)     (Full)

                ┌───         ┌──────────┐
                │ Me         │ Message  │
                            │ content  │
                            └──────────┘

Duration: 0.3 seconds per message
Easing: ease-out
```

## Interaction States

### Button States

```
Normal:           Hover:            Active (Open):
┌────┐           ┌────┐            ┌────┐
│ 💬 │     →     │ 💬 │      →     │ 💬 │
└────┘           └────┘            └────┘
                 (larger)          (red bg)
                 (glow)
```

### Input Field States

```
Empty:                  Typing:                 Focused:
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Type msg... ▐ │  →   │ Hello demucs▐ │  →   │ Hello demucs▐ │
└───────────────┘      └───────────────┘      └───────────────┘
                                              (blue border)
```

### Suggestion States

```
Normal:                    Hover:
┌──────────────────────┐  ┌──────────────────────┐
│ 🔹 How to upload?    │  │ 🔹 How to upload?   →│
└──────────────────────┘  └──────────────────────┘
                          (blue bg, shifts right)
```

## Message Types

### User Message
```
            ┌──────────────────────┐
  👤        │ This is my question  │
            │ about using Demucs?  │
            └──────────────────────┘
               (right-aligned, blue)
```

### Bot Message
```
  ┌──────────────────────┐
  │ 🎯 Here's how you    │  🤖
  │ can do that:         │
  │                      │
  │ 1. First step        │
  │ 2. Second step       │
  │ 3. Third step        │
  └──────────────────────┘
     (left-aligned, gray)
```

### Welcome Card
```
  ┌────────────────────────────┐
  │     👋 Welcome!             │
  │                             │
  │  I'm here to help you use   │
  │  Demucs to separate audio.  │
  │                             │
  │  Click a suggestion below:  │
  │                             │
  │  🔹 How do I upload?        │
  │  🔹 Which model is best?    │
  │  🔹 What are stems?         │
  └────────────────────────────┘
     (center-aligned, gray bg)
```

## Responsive Breakpoints

### Desktop (> 768px)
```
┌─────────────────────────────────────────────┐
│                                             │
│  Normal app layout                          │
│                                             │
│                       ┌─────────────────┐   │
│                       │ Chatbot         │   │
│                       │ 400px wide      │   │
│                       │ Fixed position  │   │
│                       └─────────────────┘   │
│                                  [💬]        │
└─────────────────────────────────────────────┘
```

### Mobile (≤ 768px)
```
┌─────────────────┐
│                 │
│  App content    │
│                 │
├─────────────────┤
│ Chatbot         │
│ Full width      │
│ 500px tall      │
│ Bottom position │
└─────────────────┘
      [💬]
```

## Emoji Usage

The chatbot uses emojis extensively for visual clarity:

| Category | Emoji | Usage |
|----------|-------|-------|
| Bot | 🤖 | Bot avatar |
| User | 👤 | User avatar |
| Chat | 💬 | Toggle button |
| Send | 📤 | Send button |
| Close | × | Close button |
| File | 📁 | File upload topics |
| Video | ▶️ | YouTube topics |
| Music | 🎵 | Stems/audio topics |
| Quality | ⭐ | Best quality |
| Speed | ⚡ | Fast processing |
| Processing | ⚙️ | Active jobs |
| Complete | ✅ | Success |
| Error | ❌ | Failures |
| Time | ⏱️ | Processing time |
| Mixer | 🎛️ | Mixer features |
| Tips | 💡 | Pro tips |

## Accessibility Features

### Keyboard Navigation
```
Tab:     Focus next element
Enter:   Send message
Escape:  Close chat
Arrows:  Navigate message history (future)
```

### Screen Reader Labels
```
<button aria-label="Open chat assistant">
<input aria-label="Type your message">
<button aria-label="Send message">
```

### Focus States
```
Normal: No outline
Focused: Blue outline (2px solid)
```

## Mobile Optimizations

### Touch Targets
- All buttons: Minimum 44x44px
- Input field: Minimum 44px height
- Suggestion buttons: Full-width, 44px height

### Scrolling
- Messages area: Touch scrolling enabled
- Smooth scroll to latest message
- Prevent body scroll when chat open

### Virtual Keyboard
- Input field positions above keyboard
- Chat resizes to fit available space
- Auto-focus on open (mobile)

## Performance

### Load Time
```
Initial load:     < 100ms
Open animation:   300ms
Message send:     < 10ms
Bot response:     500-1000ms (simulated)
Close animation:  300ms
```

### Bundle Size
```
JavaScript:  ~60KB (chatbot.js)
CSS:         ~15KB (chatbot styles)
HTML:        ~2KB (chatbot markup)
Total:       ~77KB
```

## Testing Checklist

Use this visual guide to verify:

✅ Chat button appears in bottom-right  
✅ Button has 💬 emoji  
✅ Button has hover animation  
✅ Clicking button opens chat window  
✅ Window slides up smoothly  
✅ Welcome message displays  
✅ 3 suggestions are shown  
✅ Input field is visible  
✅ Send button shows 📤  
✅ Messages appear in correct positions  
✅ Bot messages on left with 🤖  
✅ User messages on right with 👤  
✅ Typing indicator animates  
✅ Scrollbar appears when needed  
✅ Close button (×) works  
✅ ESC key closes chat  
✅ Mobile layout is full-width  
✅ All animations are smooth  

## Comparison with Similar Chatbots

```
Feature              | Demucs Bot | Intercom | Zendesk | ChatGPT Widget
---------------------|------------|----------|---------|----------------
Position             | Bottom-R   | Bottom-R | Bottom-R| Bottom-R
Offline capable      | ✅         | ❌       | ❌      | ❌
Pre-programmed       | ✅         | ❌       | ❌      | ❌
Instant responses    | ✅         | ❌       | ❌      | ❌
No API required      | ✅         | ❌       | ❌      | ❌
Custom knowledge     | ✅         | ✅       | ✅      | ❌
Modern UI            | ✅         | ✅       | ✅      | ✅
Mobile optimized     | ✅         | ✅       | ✅      | ✅
Typing indicator     | ✅         | ✅       | ✅      | ✅
Suggestions          | ✅         | ✅       | ✅      | ❌
Emoji support        | ✅         | ✅       | ✅      | ✅
```

---

**This visual guide should help you understand exactly how the chatbot looks and behaves!**

For more information:
- Technical details: See `CHATBOT_GUIDE.md`
- Complete Q&A list: See `CHATBOT_QA_REFERENCE.md`
- Implementation summary: See `CHATBOT_FEATURE_SUMMARY.md`

