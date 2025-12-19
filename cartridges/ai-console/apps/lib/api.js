import { AuthClient } from '/sundayapp/core/auth-client.js';

const auth = new AuthClient({ baseUrl: '/api' });

export function getToken() {
  return auth.getToken() || localStorage.getItem('sunday_access_token') || null;
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

export function getConversationId() {
  return localStorage.getItem('cn_conversation_id') || null;
}

export function setConversationId(id) {
  if (!id) return;
  localStorage.setItem('cn_conversation_id', id);
}

export function rememberConversationFromResponse(res) {
  const id = res?.headers?.get?.('x-cn-conversation-id');
  if (id) setConversationId(id);
}

export function cnRoleHint() {
  const user = auth.getUser();
  if (!user) return 'trustee';
  if (user.global_role === 'super_admin') return 'admin';

  const host = (window.location.hostname || '').toLowerCase();
  const consoleId = host === 'localhost' ? 'quick-server' : (host.split('.')[0] || 'quick-server');
  const consoleRole = user.permissions?.[consoleId] || null;
  return consoleRole === 'admin' ? 'admin' : 'trustee';
}

export function ensureAuthedOrThrow() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated. Please log in.');
}

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  rememberConversationFromResponse(res);
  return res;
}
