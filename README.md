# ClawGPT

A simple, ChatGPT-like interface for [OpenClaw](https://github.com/openclaw/openclaw).

![ClawGPT Screenshot](screenshot.png)

## Why ClawGPT?

OpenClaw is powerful, but its Control UI can be overwhelming for new users. ClawGPT provides a familiar ChatGPT-like experience:

- **Left sidebar** with chat history
- **New Chat** button to start fresh conversations
- **Clean, minimal interface** - no confusing buttons
- **Dark/Light mode** toggle
- **Runs in any browser** - no npm, no build tools

## Quick Start

1. **Install and start OpenClaw** (see [OpenClaw docs](https://docs.openclaw.ai))

2. **Download ClawGPT**
   ```bash
   git clone https://github.com/YOUR_USERNAME/clawgpt.git
   cd clawgpt
   ```

3. **Open in browser**
   - Simply open `index.html` in your browser
   - Or serve it: `python3 -m http.server 8080` then visit `http://localhost:8080`

4. **Connect**
   - Click Settings (gear icon)
   - Enter your Gateway URL (default: `ws://localhost:18789`)
   - Add auth token if you have one configured
   - Click Connect

5. **Chat!**

## Features

- **Chat history** - Saved locally in your browser
- **Multiple conversations** - Switch between chats like ChatGPT
- **Streaming responses** - See answers as they're generated
- **Markdown rendering** - Code blocks, bold, italic
- **Mobile friendly** - Responsive sidebar

## Configuration

Click the Settings button to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| Gateway URL | OpenClaw WebSocket endpoint | `ws://localhost:18789` |
| Auth Token | Gateway authentication token | (empty) |
| Session Key | OpenClaw session to use | `main` |
| Dark Mode | Toggle dark/light theme | On |

## How It Works

ClawGPT connects directly to OpenClaw's Gateway WebSocket API:

1. Establishes WebSocket connection
2. Completes handshake (`connect` request)
3. Sends messages via `chat.send`
4. Receives streaming responses via `chat` events
5. Stores chat history in browser localStorage

## Files

```
clawgpt/
├── index.html   # Main HTML structure
├── style.css    # ChatGPT-like styling
├── app.js       # WebSocket + UI logic
└── README.md    # This file
```

## Requirements

- **OpenClaw** running on your machine or network
- **Modern browser** (Chrome, Firefox, Safari, Edge)
- That's it! No Node.js, no npm, no build step.

## Troubleshooting

**Can't connect?**
- Make sure OpenClaw gateway is running
- Check the Gateway URL (default port is 18789)
- If using auth, verify your token

**Messages not sending?**
- Check browser console for errors
- Ensure WebSocket connection is established (status shows "Connected")

**Chat history missing?**
- History is stored in browser localStorage
- Different browsers/profiles have separate storage

## Contributing

PRs welcome! This is a simple project - feel free to improve it.

## License

MIT - do whatever you want with it.

## Credits

Built for [OpenClaw](https://github.com/openclaw/openclaw) - the open-source AI assistant platform.
