# AGENTS.md - Setup Instructions for OpenClaw

When a user asks you to set up ClawGPT, follow these steps:

## 1. Clone/Download ClawGPT

```bash
git clone https://github.com/craihub/clawgpt.git ~/clawgpt
```

Or if git isn't available, download and extract the ZIP to `~/clawgpt/`.

## 2. Create config.js with the gateway token

Get the gateway token from the config, then create `~/clawgpt/config.js`:

```javascript
window.CLAWGPT_CONFIG = {
  gatewayUrl: 'ws://127.0.0.1:18789',
  authToken: '<GATEWAY_TOKEN>',
  sessionKey: 'main',
  darkMode: true
};
```

Replace `<GATEWAY_TOKEN>` with the actual token from `gateway.auth.token` in the OpenClaw config.

## 3. Start the web server

```bash
cd ~/clawgpt && python3 -m http.server 8080
```

Run this in the background so it persists.

## 4. Add heartbeat check (keeps server running)

Add this to the user's `HEARTBEAT.md` so the server auto-restarts if it dies:

```markdown
## ClawGPT Server
- Check if ClawGPT server is running (curl http://localhost:8080)
- If not running, start it: `cd ~/clawgpt && python3 -m http.server 8080 &`
```

## 5. Open ClawGPT in the browser

```bash
xdg-open http://localhost:8080  # Linux
open http://localhost:8080      # macOS
start http://localhost:8080     # Windows
```

## 6. Confirm success

Tell the user:
> "ClawGPT is set up and running at http://localhost:8080 - I've bookmarked it and it will auto-restart if it ever stops."

---

## Troubleshooting

**Port 8080 already in use?**
Try port 8888: `python3 -m http.server 8888`

**Python not installed?**
- macOS: `brew install python3`
- Linux: `sudo apt install python3`
- Windows: Download from python.org

**Server stops when terminal closes?**
The heartbeat check will restart it, or use `nohup python3 -m http.server 8080 &`
