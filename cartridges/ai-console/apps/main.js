import { apiFetch, cnRoleHint, getConversationId, ensureAuthedOrThrow } from './lib/api.js';
import { $, addMessage, showTyping, hideTyping, updateStreamingMessage, finalizeMessage } from './lib/dom.js';

const API_URL = '/api/ai';
let currentTemplate = 'page';

const aiService = {
  provider: 'ollama',
  apiUrl: API_URL,
  model: 'llama3.2',
  history: [],

  async checkProvider() {
    try {
      const res = await apiFetch(this.apiUrl + '/status');
      const data = await res.json();
      return data.ollama?.available || false;
    } catch {
      return false;
    }
  },

  async chat(message, options = {}) {
    const messages = [...this.history, { role: 'user', content: message }];

    const res = await apiFetch(this.apiUrl + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: options.stream !== false,
        cnRole: cnRoleHint(),
        cnExecution: false,
        conversationId: getConversationId() || undefined,
        systemPrompt: options.systemPrompt || undefined,
      })
    });

    if (options.stream !== false && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n').filter(l => l.trim())) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullContent += data.message.content;
              options.onToken?.(data.message.content, fullContent);
            }
          } catch {}
        }
      }

      this.history.push({ role: 'user', content: message });
      this.history.push({ role: 'assistant', content: fullContent });
      options.onComplete?.(fullContent);
      return fullContent;
    }

    const data = await res.json();
    const content = data.message?.content || data.content || '';
    this.history.push({ role: 'user', content: message });
    this.history.push({ role: 'assistant', content });
    return content;
  },

  clearHistory() {
    this.history = [];
  }
};

window.aiService = aiService;

window.switchTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`panel-${tab}`)?.classList.add('active');
};

window.sendMessage = async function() {
  try {
    ensureAuthedOrThrow();
  } catch (e) {
    addMessage('system', `❌ ${e.message}`);
    return;
  }

  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.style.height = 'auto';
  $('#send-btn').disabled = true;

  addMessage('user', message);
  showTyping();

  const ragEnabled = document.getElementById('rag-toggle')?.checked === true;
  const model = document.getElementById('model-select')?.value || aiService.model;
  aiService.model = model;

  let systemPrompt = null;
  if (ragEnabled) {
    try {
      const ragRes = await apiFetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message, limit: 5 })
      });
      if (ragRes.ok) {
        const rag = await ragRes.json();
        const items = (rag.results || []).slice(0, 5);
        const ctx = items.map(r => `[${r.doc_type || r.type}: ${r.title}]\n${r.snippet || ''}`).join('\n\n');
        systemPrompt = `Relevant CN context:\n${ctx}`;
      }
    } catch {}
  }

  try {
    await aiService.chat(message, {
      stream: true,
      systemPrompt,
      onToken: (_t, full) => updateStreamingMessage(full),
      onComplete: (content) => {
        hideTyping();
        finalizeMessage(content);
      },
    });
  } catch (e) {
    hideTyping();
    addMessage('system', '❌ Error: ' + e.message);
  } finally {
    $('#send-btn').disabled = false;
  }
};

window.clearChat = function() {
  if (!confirm('Clear chat history?')) return;
  aiService.clearHistory();
  $('#chat-messages').innerHTML = '<div class="message system"><div class="message-content">Welcome to Sunday AI! Ask me anything about Quick Server, WordPress, Docker, or let me help you with tasks.</div></div>';
};

window.parseAction = async function() {
  try {
    ensureAuthedOrThrow();
  } catch (e) {
    addMessage('system', `❌ ${e.message}`);
    return;
  }

  const command = $('#action-input').value.trim();
  if (!command) return;

  const preview = $('#action-preview');
  const content = $('#action-preview-content');
  preview.style.display = 'none';
  content.textContent = 'Parsing...';

  try {
    const res = await apiFetch(API_URL + '/parse-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, conversationId: getConversationId() || undefined })
    });
    const data = await res.json();

    if (data.success && data.action) {
      content.textContent = JSON.stringify({
        action: data.action,
        params: data.params,
        description: data.description,
        requiresConfirm: data.requiresConfirm === true
      }, null, 2);
      preview.style.display = 'block';
      window._pendingAction = data;
    } else {
      content.textContent = 'Could not parse command: ' + (data.error || 'Unknown error');
      preview.style.display = 'block';
    }
  } catch (e) {
    content.textContent = 'Error: ' + e.message;
    preview.style.display = 'block';
  }
};

window.setActionExample = function(text) {
  $('#action-input').value = text;
};

window.executeAction = async function() {
  try {
    ensureAuthedOrThrow();
  } catch (e) {
    addMessage('system', `❌ ${e.message}`);
    return;
  }

  if (!window._pendingAction) return;

  const requiresConfirm = window._pendingAction.requiresConfirm === true;
  let confirmText = null;
  if (requiresConfirm) {
    confirmText = prompt('This action requires confirmation. Type EXECUTE to proceed:');
    if (confirmText !== 'EXECUTE') {
      addMessage('system', 'Cancelled.');
      return;
    }
  }

  addMessage('system', 'Executing: ' + (window._pendingAction.description || window._pendingAction.action));

  const res = await apiFetch(API_URL + '/execute-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: window._pendingAction.action,
      params: window._pendingAction.params || {},
      confirm: confirmText,
      conversationId: getConversationId() || undefined,
    })
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    addMessage('system', '❌ ' + (data.error || 'Execution failed'));
  } else {
    addMessage('assistant', JSON.stringify(data.data || data, null, 2));
  }

  $('#action-preview').style.display = 'none';
  window._pendingAction = null;
};

window.cancelAction = function() {
  $('#action-preview').style.display = 'none';
  window._pendingAction = null;
};

window.selectTemplate = function(type) {
  currentTemplate = type;
  document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-template="${type}"]`)?.classList.add('active');
};

window.generateCode = async function() {
  try {
    ensureAuthedOrThrow();
  } catch (e) {
    addMessage('system', `❌ ${e.message}`);
    return;
  }

  const prompt = $('#codegen-input').value.trim();
  if (!prompt) return;

  const preview = $('#codegen-preview');
  preview.textContent = 'Generating code...';

  try {
    const res = await apiFetch(API_URL + '/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: currentTemplate, conversationId: getConversationId() || undefined })
    });
    const data = await res.json();

    if (data.success && data.code) {
      preview.textContent = (data.code.raw || '').trim() || JSON.stringify(data.code, null, 2);
    } else {
      preview.textContent = 'Error: ' + (data.error || 'Could not generate code');
    }
  } catch (e) {
    preview.textContent = 'Error: ' + e.message;
  }
};

window.copyCode = function() {
  const code = $('#codegen-preview').textContent;
  navigator.clipboard.writeText(code);
  const btn = event.target;
  const original = btn.textContent;
  btn.textContent = '✓ Copied!';
  setTimeout(() => (btn.textContent = original), 2000);
};

window.askHelp = function(question) {
  window.switchTab('chat');
  $('#chat-input').value = question;
  setTimeout(() => window.sendMessage(), 100);
};

window.openSettings = function() {
  window.Sunday?.router?.navigate?.('settings');
};

// Auto-resize textarea
$('#chat-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Enter to send (Shift+Enter for new line)
$('#chat-input').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.sendMessage();
  }
});

async function checkStatus() {
  const connected = await aiService.checkProvider();
  const badge = $('#provider-badge');

  if (connected) {
    badge.textContent = 'Ollama';
    badge.className = 'badge solid success';

    try {
      const modelsRes = await apiFetch(API_URL + '/models');
      const modelsData = await modelsRes.json();
      if (modelsData.models && modelsData.models.length > 0) {
        const select = $('#model-select');
        select.innerHTML = modelsData.models.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        aiService.model = modelsData.models[0].name;
      }
    } catch {}
  } else {
    badge.textContent = 'Offline';
    badge.className = 'badge solid muted';
    // Existing setup wizard remains implemented in index.html inline HTML via onclicks.
  }
}

checkStatus();
