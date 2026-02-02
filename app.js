// ClawGPT - ChatGPT-like interface for OpenClaw
// https://github.com/openclaw/openclaw

class ClawGPT {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.sessionKey = 'main';
    this.currentChatId = null;
    this.chats = {};
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.streaming = false;
    this.streamBuffer = '';

    this.loadSettings();
    this.loadChats();
    this.initUI();
    this.autoConnect();
  }

  // Settings
  loadSettings() {
    const saved = localStorage.getItem('clawgpt-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.gatewayUrl = settings.gatewayUrl || 'ws://localhost:18789';
      this.authToken = settings.authToken || '';
      this.sessionKey = settings.sessionKey || 'main';
      this.darkMode = settings.darkMode !== false;
    } else {
      this.gatewayUrl = 'ws://localhost:18789';
      this.authToken = '';
      this.sessionKey = 'main';
      this.darkMode = true;
    }
  }

  saveSettings() {
    localStorage.setItem('clawgpt-settings', JSON.stringify({
      gatewayUrl: this.gatewayUrl,
      authToken: this.authToken,
      sessionKey: this.sessionKey,
      darkMode: this.darkMode
    }));
  }

  // Chat storage
  loadChats() {
    const saved = localStorage.getItem('clawgpt-chats');
    if (saved) {
      this.chats = JSON.parse(saved);
    }
  }

  saveChats() {
    localStorage.setItem('clawgpt-chats', JSON.stringify(this.chats));
  }

  // UI initialization
  initUI() {
    // Elements
    this.elements = {
      sidebar: document.getElementById('sidebar'),
      chatList: document.getElementById('chatList'),
      messages: document.getElementById('messages'),
      welcome: document.getElementById('welcome'),
      messageInput: document.getElementById('messageInput'),
      sendBtn: document.getElementById('sendBtn'),
      newChatBtn: document.getElementById('newChatBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsModal: document.getElementById('settingsModal'),
      closeSettings: document.getElementById('closeSettings'),
      connectBtn: document.getElementById('connectBtn'),
      menuBtn: document.getElementById('menuBtn'),
      status: document.getElementById('status'),
      gatewayUrl: document.getElementById('gatewayUrl'),
      authToken: document.getElementById('authToken'),
      sessionKeyInput: document.getElementById('sessionKey'),
      darkMode: document.getElementById('darkMode')
    };

    // Apply settings to UI
    this.elements.gatewayUrl.value = this.gatewayUrl;
    this.elements.authToken.value = this.authToken;
    this.elements.sessionKeyInput.value = this.sessionKey;
    this.elements.darkMode.checked = this.darkMode;
    this.applyTheme();

    // Event listeners
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.elements.messageInput.addEventListener('input', () => this.onInputChange());

    this.elements.newChatBtn.addEventListener('click', () => this.newChat());
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
    this.elements.connectBtn.addEventListener('click', () => this.connect());
    this.elements.menuBtn.addEventListener('click', () => this.toggleSidebar());

    this.elements.darkMode.addEventListener('change', (e) => {
      this.darkMode = e.target.checked;
      this.applyTheme();
      this.saveSettings();
    });

    // Close modal on outside click
    this.elements.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.elements.settingsModal) {
        this.closeSettings();
      }
    });

    // Render chat list
    this.renderChatList();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
  }

  onInputChange() {
    const hasText = this.elements.messageInput.value.trim().length > 0;
    this.elements.sendBtn.disabled = !hasText || !this.connected;

    // Auto-resize textarea
    this.elements.messageInput.style.height = 'auto';
    this.elements.messageInput.style.height = Math.min(this.elements.messageInput.scrollHeight, 200) + 'px';
  }

  toggleSidebar() {
    this.elements.sidebar.classList.toggle('open');
  }

  // Settings modal
  openSettings() {
    this.elements.settingsModal.classList.add('open');
  }

  closeSettings() {
    this.elements.settingsModal.classList.remove('open');
  }

  // WebSocket connection
  autoConnect() {
    if (this.gatewayUrl) {
      this.connect();
    }
  }

  async connect() {
    // Get settings from UI
    this.gatewayUrl = this.elements.gatewayUrl.value.trim() || 'ws://localhost:18789';
    this.authToken = this.elements.authToken.value.trim();
    this.sessionKey = this.elements.sessionKeyInput.value.trim() || 'main';
    this.saveSettings();

    this.closeSettings();
    this.setStatus('Connecting...');

    try {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(this.gatewayUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        // Wait for challenge
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setStatus('Error');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.connected = false;
        this.setStatus('Disconnected');
        this.elements.sendBtn.disabled = true;
      };
    } catch (error) {
      console.error('Connection error:', error);
      this.setStatus('Error');
    }
  }

  handleMessage(msg) {
    // Handle challenge
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      this.sendConnect(msg.payload?.nonce);
      return;
    }

    // Handle response
    if (msg.type === 'res') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        this.pendingRequests.delete(msg.id);
        if (msg.ok) {
          pending.resolve(msg.payload);
        } else {
          pending.reject(new Error(msg.error?.message || 'Request failed'));
        }
      }

      // Handle hello-ok
      if (msg.payload?.type === 'hello-ok') {
        this.connected = true;
        this.setStatus('Connected', true);
        this.onInputChange();
        this.loadHistory();
      }
      return;
    }

    // Handle chat events (streaming)
    if (msg.type === 'event' && msg.event === 'chat') {
      this.handleChatEvent(msg.payload);
      return;
    }
  }

  async getOrCreateDeviceIdentity() {
    const stored = localStorage.getItem('clawgpt-device');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {}
    }
    
    // Generate new device identity
    const deviceId = this.generateId() + '-' + this.generateId();
    const identity = { deviceId };
    localStorage.setItem('clawgpt-device', JSON.stringify(identity));
    return identity;
  }

  async sendConnect(nonce) {
    const connectMsg = {
      type: 'req',
      id: String(++this.requestId),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'cli',
          version: '0.1.0',
          platform: 'web',
          mode: 'operator'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: this.authToken ? { token: this.authToken } : {},
        locale: navigator.language || 'en-US',
        userAgent: 'ClawGPT/0.1.0'
      }
    };

    this.ws.send(JSON.stringify(connectMsg));

    // Store pending request
    this.pendingRequests.set(connectMsg.id, {
      resolve: () => {},
      reject: (err) => console.error('Connect failed:', err)
    });
  }

  async request(method, params) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const id = String(++this.requestId);
    const msg = { type: 'req', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  setStatus(text, isConnected = false) {
    this.elements.status.textContent = text;
    this.elements.status.classList.toggle('connected', isConnected);
  }

  // Chat functionality
  async loadHistory() {
    try {
      const result = await this.request('chat.history', {
        sessionKey: this.sessionKey,
        limit: 100
      });

      if (result.messages && result.messages.length > 0) {
        // Create or update current chat with history
        if (!this.currentChatId) {
          this.currentChatId = this.generateId();
        }

        const messages = result.messages.map(m => ({
          role: m.role,
          content: this.extractContent(m.content),
          timestamp: m.timestamp
        })).filter(m => m.role === 'user' || m.role === 'assistant');

        this.chats[this.currentChatId] = {
          id: this.currentChatId,
          title: this.generateTitle(messages),
          messages: messages,
          createdAt: messages[0]?.timestamp || Date.now(),
          updatedAt: Date.now()
        };

        this.saveChats();
        this.renderChatList();
        this.renderMessages();
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  extractContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
    }
    return '';
  }

  generateTitle(messages) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const text = firstUserMsg.content.slice(0, 30);
      return text.length < firstUserMsg.content.length ? text + '...' : text;
    }
    return 'New chat';
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  newChat() {
    this.currentChatId = null;
    this.elements.welcome.style.display = 'flex';
    this.renderMessages();
    this.renderChatList();
    this.elements.messageInput.focus();
    this.elements.sidebar.classList.remove('open');
  }

  selectChat(chatId) {
    this.currentChatId = chatId;
    this.renderMessages();
    this.renderChatList();
    this.elements.sidebar.classList.remove('open');
  }

  deleteChat(chatId) {
    if (confirm('Delete this chat?')) {
      delete this.chats[chatId];
      this.saveChats();
      if (this.currentChatId === chatId) {
        this.newChat();
      } else {
        this.renderChatList();
      }
    }
  }

  renderChatList() {
    const chatIds = Object.keys(this.chats).sort((a, b) => {
      return (this.chats[b].updatedAt || 0) - (this.chats[a].updatedAt || 0);
    });

    this.elements.chatList.innerHTML = chatIds.map(id => {
      const chat = this.chats[id];
      const isActive = id === this.currentChatId;
      return `
        <div class="chat-item ${isActive ? 'active' : ''}" data-id="${id}">
          <span class="chat-title">${this.escapeHtml(chat.title)}</span>
          <button class="delete-btn" data-id="${id}">&times;</button>
        </div>
      `;
    }).join('');

    // Add click handlers
    this.elements.chatList.querySelectorAll('.chat-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-btn')) {
          this.selectChat(item.dataset.id);
        }
      });
    });

    this.elements.chatList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteChat(btn.dataset.id);
      });
    });
  }

  renderMessages() {
    const chat = this.currentChatId ? this.chats[this.currentChatId] : null;

    if (!chat || chat.messages.length === 0) {
      this.elements.welcome.style.display = 'flex';
      this.elements.messages.innerHTML = '';
      this.elements.messages.appendChild(this.elements.welcome);
      return;
    }

    this.elements.welcome.style.display = 'none';

    this.elements.messages.innerHTML = chat.messages.map(msg => {
      const isUser = msg.role === 'user';
      return `
        <div class="message ${msg.role}">
          <div class="message-header">
            <div class="avatar ${msg.role}">${isUser ? 'You' : 'AI'}</div>
            <span class="message-role">${isUser ? 'You' : 'ClawGPT'}</span>
          </div>
          <div class="message-content">${this.formatContent(msg.content)}</div>
        </div>
      `;
    }).join('');

    // Add streaming indicator if needed
    if (this.streaming) {
      const streamDiv = document.createElement('div');
      streamDiv.className = 'message assistant';
      streamDiv.id = 'streaming-message';
      streamDiv.innerHTML = `
        <div class="message-header">
          <div class="avatar assistant">AI</div>
          <span class="message-role">ClawGPT</span>
        </div>
        <div class="message-content">${this.formatContent(this.streamBuffer) || '<div class="typing-indicator"><span></span><span></span><span></span></div>'}</div>
      `;
      this.elements.messages.appendChild(streamDiv);
    }

    this.scrollToBottom();
  }

  formatContent(content) {
    if (!content) return '';

    // Basic markdown-like formatting
    let html = this.escapeHtml(content);

    // Code blocks
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  async sendMessage() {
    const text = this.elements.messageInput.value.trim();
    if (!text || !this.connected) return;

    // Clear input
    this.elements.messageInput.value = '';
    this.elements.messageInput.style.height = 'auto';
    this.elements.sendBtn.disabled = true;

    // Create chat if needed
    if (!this.currentChatId) {
      this.currentChatId = this.generateId();
      this.chats[this.currentChatId] = {
        id: this.currentChatId,
        title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    // Add user message
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    this.chats[this.currentChatId].messages.push(userMsg);
    this.chats[this.currentChatId].updatedAt = Date.now();
    this.saveChats();
    this.renderChatList();
    this.renderMessages();

    // Start streaming
    this.streaming = true;
    this.streamBuffer = '';
    this.renderMessages();

    try {
      await this.request('chat.send', {
        sessionKey: this.sessionKey,
        message: text,
        deliver: false,
        idempotencyKey: this.generateId()
      });
      // Response will come via chat events
    } catch (error) {
      console.error('Send failed:', error);
      this.streaming = false;
      this.addAssistantMessage('Error: ' + error.message);
    }
  }

  handleChatEvent(payload) {
    if (!payload) return;

    if (payload.sessionKey && payload.sessionKey !== this.sessionKey) {
      return; // Different session
    }

    const state = payload.state;
    const content = this.extractContent(payload.message?.content);

    if (state === 'delta' && content) {
      this.streamBuffer = content;
      this.updateStreamingMessage();
    } else if (state === 'final' || state === 'aborted' || state === 'error') {
      this.streaming = false;

      if (state === 'error') {
        this.addAssistantMessage('Error: ' + (payload.errorMessage || 'Unknown error'));
      } else if (this.streamBuffer) {
        this.addAssistantMessage(this.streamBuffer);
      }

      this.streamBuffer = '';
      this.onInputChange();
    }
  }

  updateStreamingMessage() {
    const streamDiv = document.getElementById('streaming-message');
    if (streamDiv) {
      const contentDiv = streamDiv.querySelector('.message-content');
      if (contentDiv) {
        contentDiv.innerHTML = this.formatContent(this.streamBuffer) || '<div class="typing-indicator"><span></span><span></span><span></span></div>';
      }
    }
    this.scrollToBottom();
  }

  addAssistantMessage(content) {
    if (!this.currentChatId || !this.chats[this.currentChatId]) return;

    const assistantMsg = {
      role: 'assistant',
      content: content,
      timestamp: Date.now()
    };
    this.chats[this.currentChatId].messages.push(assistantMsg);
    this.chats[this.currentChatId].updatedAt = Date.now();
    this.saveChats();
    this.renderMessages();
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.clawgpt = new ClawGPT();
});
