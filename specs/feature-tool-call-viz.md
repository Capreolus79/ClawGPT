# Feature: Tool Call Visualization (P2)

## Overview
Rich display of tool calls and results in assistant messages. Currently tool calls appear as raw text or are hidden. This feature adds expandable cards showing tool name, parameters, and results.

## How Tool Calls Appear in Gateway Messages
When the assistant uses tools, the Gateway sends messages with tool call info. In the OpenClaw WebSocket protocol:
- Tool calls appear in the message content as text blocks like:
  - `[Tool: web_search] query: "something"` 
  - `[exec] command: ls -la`
  - Or embedded in the content as markdown code blocks

The app needs to detect these patterns in assistant message content and render them as visual cards instead of raw text.

## Requirements

### Tool Call Card
```
┌─────────────────────────────────────────┐
│ 🔧 web_search                    [▼/▲] │
│ ─────────────────────────────────────── │
│ Parameters:                             │
│   query: "OpenClaw gateway protocol"    │
│                                         │
│ Result: (collapsed by default)          │
│   Found 5 results...                    │
└─────────────────────────────────────────┘
```

### Detection Patterns
Look for common patterns in assistant message content:
1. `[Tool: toolname]` or `[tool_name]` blocks
2. Function call syntax in content
3. Code blocks with shell commands (``` blocks following "Running:" or "Executing:")
4. Lines starting with `> ` that look like commands

### Implementation
1. In `formatContent()` method of app.js, add tool call detection
2. Replace detected tool call text with rendered card HTML
3. Cards are collapsed by default (show tool name + status)
4. Click to expand and see parameters + results
5. Add copy button for tool results
6. Color-code by status: green (success), red (error), yellow (running)

### Tool Types to Detect
- `exec` / `Bash` — shell commands with output
- `web_search` — search queries with results
- `web_fetch` — URL fetches
- `Read` / `Write` / `Edit` — file operations
- `browser` — browser actions
- `memory_search` / `memory_store` — memory operations
- Generic fallback for unknown tools

### UI Design
- Card: dark background with colored left border (green/red/yellow)
- Tool icon + name in header
- Collapse/expand chevron
- Monospace font for parameters and results
- Max-height with scroll for long results
- Copy button for result content

### CSS
- `.tool-call-card` — main card container
- `.tool-call-header` — clickable header with tool name
- `.tool-call-body` — collapsible content
- `.tool-call-params` — parameter display
- `.tool-call-result` — result display with scroll
- `.tool-call-status` — status indicator (success/error/running)

### Files to modify
- `app.js` — formatContent() enhancement, tool call detection and rendering
- `style.css` — tool call card styles

### Verification
- Tool calls in existing messages render as cards
- Cards are collapsed by default
- Click expands to show parameters and results
- Copy button works
- Different tool types have appropriate icons
- No console errors
- Regular message content still renders normally
