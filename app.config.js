/**
 * AI Console — Sunday App Manifest
 *
 * CN framing:
 * - Console: top-level operating surface (auth, nav, pages, policies).
 * - Cartridge: modular capability (can still be used/embedded).
 *
 * This console initially embeds the existing `cartridges/ai-console` UI as its primary page,
 * so we can promote it to a first-class console without breaking functionality.
 */
export default {
  name: 'CN Console',
  version: '0.1.0',
  apiBase: '/api',

  // Keep discovery off to avoid accidentally exposing Quick Server pages in this console.
  autoDiscover: false,

  contentContainerId: 'contentContainer',
  tabsContainerId: 'mainTabs',
  headerContainerId: 'global-header-container',

  // CN Console is intentionally lightweight:
  // - No AI boot (prevents hanging init when AI backends are unavailable)
  // - No Living Agents boot (prevents ws:// localhost assumptions)
  // - No Cartridge subsystem (we use first-class console pages + /core auth client)
  ai: { enabled: false },
  agents: { enabled: false },
  cartridges: { enabled: false },

  routes: {
    '': { page: 'overview', title: 'Overview', fallback: './html/overview.html?v=20251217c' },
    overview: { page: 'overview', title: 'Overview', fallback: './html/overview.html?v=20251217c' },
    login: { page: 'login', title: 'Sign in', fallback: './html/login.html?v=20251222b' },
    ai: { page: 'ai', title: 'AI', fallback: './html/ai.html' },
    // Cache-bust: server sets long cache headers for static assets.
    contributions: { page: 'contributions', title: 'Contributions', fallback: './html/contributions.html?v=20251217c' },
    protocols: { page: 'protocols', title: 'Protocols', fallback: './html/protocols.html?v=20251217c' },
    consoles: { page: 'consoles', title: 'Consoles', fallback: './html/consoles.html?v=20251222a' },
    cartridges: { page: 'cartridges', title: 'Cartridges', fallback: './html/cartridges.html?v=20251222b' },
    network: { page: 'network', title: 'Network', fallback: './html/network-settings.html?v=20251222a' },
    settings: { page: 'settings', title: 'Settings', fallback: './html/settings.html?v=20251219g' }
  },

  tabs: [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'contributions', label: 'Contributions', icon: '🧩' },
    { id: 'consoles', label: 'Consoles', icon: '🖥️' },
    { id: 'cartridges', label: 'Cartridges', icon: '📦' },
    { id: 'protocols', label: 'Protocols', icon: '📜' },
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ]
};

