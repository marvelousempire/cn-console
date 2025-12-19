export function $(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

export function addMessage(type, content) {
  const messages = $('#chat-messages');
  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

let streamingMsg = null;

export function showTyping() {
  const messages = $('#chat-messages');
  streamingMsg = document.createElement('div');
  streamingMsg.className = 'message assistant';
  streamingMsg.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  messages.appendChild(streamingMsg);
  messages.scrollTop = messages.scrollHeight;
}

export function updateStreamingMessage(content) {
  if (!streamingMsg) {
    showTyping();
  }
  streamingMsg.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  const messages = $('#chat-messages');
  messages.scrollTop = messages.scrollHeight;
}

export function finalizeMessage(content) {
  if (streamingMsg) {
    streamingMsg.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    streamingMsg = null;
  }
  const messages = $('#chat-messages');
  messages.scrollTop = messages.scrollHeight;
}

export function hideTyping() {
  if (streamingMsg) {
    streamingMsg.remove();
    streamingMsg = null;
  }
}
