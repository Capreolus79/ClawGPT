# ClawGPT — Project Constitution

## Architecture
ClawGPT is a pure HTML/CSS/JS chat interface for OpenClaw Gateway. No build tools, no framework.

**Files:**
- `index.html` — HTML structure (~1064 lines)
- `app.js` — Main application logic (~10K lines, ClawGPT class)
- `style.css` — All styles (~5732 lines)
- `server.js` — Node.js WebSocket proxy server (~97 lines)
- `chat-storage.js`, `memory-storage.js`, `file-memory-storage.js` — Storage backends
- `config.js` — Gateway URL config
- `error-handler.js` — Global error handling

**Stack:** Vanilla JS, WebSocket to OpenClaw Gateway, IndexedDB for chat storage.

**Service:** `systemctl --user [start|stop|restart] clawgpt`

## Key Patterns
- Single-page app, all in one HTML + JS file set
- WebSocket connection to Gateway at configurable URL
- `this.request(method, params)` — send JSON-RPC to Gateway, returns Promise
- `this.elements.xxx` — cached DOM element references
- Gateway API methods: `exec.run`, `sessions.list`, `sessions.history`, `cron.list`, etc.
- Right-side panel system: Intelligence, Artifacts, Workspace tabs

## Style Rules
- Dark theme with CSS custom properties (--bg-primary, --text-primary, etc.)
- Mobile-responsive with media queries
- All CSS in `style.css`, no inline styles
- Use existing class naming conventions (kebab-case)

## Verification Gates
- App must load without JS errors in browser console
- All features must work: chat, sidebar, panels, bottom toolbar
- Bottom toolbar must not overflow or clip on default viewport
- WebSocket connection must establish successfully

## Escalation Rules
- Do NOT modify `server.js` unless the bug is specifically in the proxy
- Do NOT change `config.js` — it has user credentials
- Ask before modifying WebSocket message handling logic
