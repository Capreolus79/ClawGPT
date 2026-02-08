# ClawGPT Security Review

**Date:** 2026-02-08
**Scope:** Full source code review for local network deployment safety
**Verdict:** Generally safe for local network use, with caveats documented below

---

## Summary

ClawGPT is a static, client-side web application (no server component) that acts as a chat UI for an OpenClaw gateway running on your machine. It does **not** phone home, does not include telemetry, and does not exfiltrate data. All chat data stays in your browser (IndexedDB/localStorage) and optionally in a local folder you choose.

**It is not malware.** However, there are several security considerations you should be aware of before deploying it on your local network.

---

## Findings

### CRITICAL — Token Exposure in Local Network QR Code

**Files:** `app.js:1020-1024`

When you generate a QR code for mobile access in "Local Network" mode, the auth token is embedded directly in the URL as a query parameter:

```js
let mobileUrl = `${webUrl}?gateway=${encodeURIComponent(gatewayUrl)}`;
if (this.authToken) {
  mobileUrl += `&token=${encodeURIComponent(this.authToken)}`;
}
```

**Risk:** If anyone on your network can see the QR code, intercept the URL, or view your screen, they get your OpenClaw gateway token. The UI does warn about this (`index.html:309`): "Don't share this QR code — it contains your auth token", but the token is still transmitted as a plaintext URL parameter.

**Mitigation:** Use the "Remote Relay" mode instead (E2E encrypted), or only scan the QR in a physically private setting. The token is cleaned from the URL after first load (`app.js:241-242`), but it exists in plaintext during transit.

---

### HIGH — Auth Token Stored in localStorage (Without config.js)

**Files:** `app.js:258-274`

If you don't use `config.js`, the auth token is saved to `localStorage` in plaintext as part of `clawgpt-settings`:

```js
if (!this.hasConfigFile) {
  settings.gatewayUrl = this.gatewayUrl;
  settings.authToken = this.authToken;
  settings.sessionKey = this.sessionKey;
}
```

**Risk:** Any JavaScript running on the same origin (e.g., from an XSS vulnerability, a browser extension, or a malicious script somehow loaded) can read `localStorage.getItem('clawgpt-settings')` and extract your token. This is also visible in browser DevTools to anyone with physical access.

**Mitigation:** Use `config.js` for your token. When `config.js` is present, the app correctly avoids storing the token in localStorage (`app.js:259-272`).

---

### HIGH — Unencrypted WebSocket to Gateway (ws://)

**Files:** `app.js:3760`, `config.example.js:10`

The default gateway connection uses `ws://localhost:18789` (unencrypted WebSocket). This is fine when connecting to `localhost`, but if you configure a remote gateway or access ClawGPT from another device on your LAN, traffic (including your auth token and all chat content) travels in plaintext over the network.

**Risk:** Anyone on your local network with packet capture ability (e.g., Wireshark) can intercept your auth token and all conversations.

**Mitigation:** Only use `ws://` for `localhost`/`127.0.0.1`. For any network access, use `wss://` (WebSocket over TLS) if your gateway supports it. For cross-device access, the relay mode uses `wss://` and E2E encryption, which is the safer option.

---

### MEDIUM — Content Security Policy Allows connect-src *

**File:** `index.html:10`

```html
connect-src *;
```

The CSP allows WebSocket/fetch connections to any origin. This is necessary for the relay feature (which connects to `wss://clawgpt-relay.fly.dev` or user-configured relay servers), but it means if an attacker achieves script execution, they can exfiltrate data to any server.

**Mitigation:** If you don't use the relay feature, you could tighten this to `connect-src 'self' ws://localhost:* ws://127.0.0.1:*` in `index.html`. However, this would break relay mode.

---

### MEDIUM — CDN Dependencies (External Script Loading)

**File:** `index.html:594-597`

The app loads 3 JavaScript files from cdnjs.cloudflare.com:
- `qrcodejs/1.0.0/qrcode.min.js`
- `prism/1.29.0/prism.min.js`
- `prism/1.29.0/plugins/autoloader/prism-autoloader.min.js`

**Positive:** All three have Subresource Integrity (SRI) hashes, meaning if the CDN is compromised and serves modified files, the browser will reject them. This is correct practice.

**Risk:** The Prism.js autoloader plugin dynamically fetches additional language grammars from the CDN at runtime (without SRI), which could theoretically be a vector if the CDN were compromised.

**Mitigation:** For a fully air-gapped deployment, download these libraries locally and serve them from `lib/`. The SRI hashes provide reasonable protection for normal use.

---

### MEDIUM — `unsafe-inline` in script-src CSP

**File:** `index.html:8`

```html
script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
```

`unsafe-inline` allows inline `<script>` tags and inline event handlers. This weakens XSS protection since an attacker who can inject HTML could also inject inline scripts.

**Mitigation:** The app uses DOMPurify to sanitize all HTML rendered from chat content (`app.js:5101-5113`), which significantly reduces this risk. The app also uses `escapeHtml()` for user-supplied values like filenames. In practice, the XSS risk is low because of these measures, but removing `unsafe-inline` would provide defense-in-depth.

---

### LOW — DOMPurify Fallback Is Safe

**File:** `app.js:5101-5113`

If DOMPurify fails to load, the fallback strips ALL HTML tags via `textContent`:

```js
const div = document.createElement('div');
div.textContent = html;
return div.innerHTML;
```

This is a safe fallback — it will break formatting but will not introduce XSS. The main DOMPurify sanitizer is properly configured and covers SVG tags needed by the UI.

---

### LOW — Error Logs May Contain Sensitive Info

**File:** `error-handler.js:55-66`

The "Copy Logs" feature copies recent console output and errors, which could include gateway URLs, connection details, or error context with message content. This is a debugging aid, not a vulnerability, but be careful where you paste these logs.

---

### LOW — Relay Server is Third-Party (fly.dev)

**File:** `app.js:1052`

The default relay server is `wss://clawgpt-relay.fly.dev`. While all messages through the relay are E2E encrypted with XSalsa20-Poly1305 (the relay server cannot read your messages), the relay server can see:
- That you are connecting (your IP address)
- Your room ID
- Connection timing metadata

**Mitigation:** The relay is self-hostable. For maximum privacy, run your own relay server. The E2E encryption is sound (TweetNaCl.js with proper key exchange), so the relay server being third-party is an acceptable risk for most users.

---

## Positive Security Findings

These are things the project does **well**:

1. **DOMPurify for HTML sanitization** — All chat content rendered via `innerHTML` passes through DOMPurify (`app.js:5065`, `app.js:4332`, `app.js:3610`). This is the industry-standard XSS prevention for rendered HTML.

2. **HTML escaping for user inputs** — Filenames, image names, and other user-supplied strings use `escapeHtml()` (`app.js:5095-5098`).

3. **Token cleaned from URL** — After reading `?token=` from the URL (used by QR code), the parameter is immediately removed via `history.replaceState` (`app.js:241-242`). It won't appear in browser history.

4. **config.js is gitignored** — The `.gitignore` properly excludes `config.js` to prevent accidental token commits.

5. **Sound cryptography** — The relay uses TweetNaCl.js (audited library), X25519 key exchange, XSalsa20-Poly1305 AEAD encryption, random nonces, and proper key zeroing on destroy (`relay-crypto.js:252-267`).

6. **Visual verification for relay** — 4-word verification code derived from the shared key hash lets users confirm there's no MITM attack (`relay-crypto.js:143-168`).

7. **SRI hashes on CDN scripts** — All external scripts have integrity attributes.

8. **No eval/Function constructor** — No dynamic code execution patterns found anywhere in the codebase.

9. **No telemetry or analytics** — The app makes zero outbound requests except to: (a) your configured gateway, (b) optionally the relay server, (c) CDN for syntax highlighting assets.

10. **No server component** — Pure static files served by any web server. No attack surface from server-side code.

---

## Recommendations for Local Network Use

1. **Use `config.js` for your token** — Don't rely on localStorage. Copy `config.example.js` to `config.js` and fill in your token there.

2. **Serve over HTTPS on your LAN** — Use a reverse proxy (nginx/caddy) with a self-signed cert or Let's Encrypt to prevent passive sniffing.

3. **Keep gateway on localhost when possible** — If ClawGPT and OpenClaw run on the same machine, `ws://localhost:18789` never leaves the machine and is safe.

4. **Use relay mode for cross-device** — The E2E-encrypted relay is safer than the local network QR (which puts your token in the URL).

5. **Verify the 4-word code** — When pairing via relay, confirm the verification words match on both devices to detect MITM.

6. **Bind your web server to localhost** — If only using locally, serve with `python3 -m http.server 8080 --bind 127.0.0.1` instead of binding to all interfaces.

---

## Conclusion

ClawGPT is safe to use on your local network. It does not exfiltrate data, does not contain backdoors, and does not include malicious code. The main risks are operational: your auth token can be exposed if you use unencrypted WebSockets over the network, store it in localStorage, or share the local QR code. Following the recommendations above will mitigate these risks.
