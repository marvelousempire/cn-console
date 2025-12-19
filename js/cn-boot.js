/* CN Console bootstrap (ES module)
 * Keep all startup logic here so we can detect module support and show better errors.
 */

window.__CN_BOOT_OK = true;

const bootEl = document.getElementById('cnBootStatus');
const bootTextEl = bootEl ? bootEl.querySelector('.sunday-text--muted') : null;
const setBoot = (msg) => {
  try { if (bootTextEl) bootTextEl.textContent = msg; } catch {}
};

const showFatal = (e) => {
  try {
    const container = document.getElementById('contentContainer');
    const msg = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
    if (container) {
      container.innerHTML = `
        <div class="sunday-card">
          <div class="sunday-card__header">
            <div class="sunday-text sunday-text--title">CN Console failed to start</div>
            <div class="sunday-text sunday-text--muted">A startup error occurred. See details below.</div>
          </div>
          <div class="sunday-card__body">
            <pre style="white-space:pre-wrap;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:12px;background:rgba(255,255,255,0.02);color:var(--ink);font-size:12px;line-height:1.4">${msg.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</pre>
          </div>
        </div>
      `;
    }
  } catch {}
};

window.addEventListener('error', (ev) => showFatal(ev && (ev.error || ev.message) ? (ev.error || ev.message) : ev));
window.addEventListener('unhandledrejection', (ev) => showFatal(ev && ev.reason ? ev.reason : ev));

// If init hangs, show a clear message instead of infinite "Loading…"
const hangTimer = setTimeout(() => {
  const route = (window.location.hash || '').replace(/^#/, '') || '(none)';
  setBoot(`Still loading… (route: ${route}). If this persists, open #login.`);
}, 8000);

// Attach Bearer token automatically to same-origin /api/* calls.
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  try {
    const token = localStorage.getItem('sunday_access_token');
    if (!token) return originalFetch(input, init);

    const url = (typeof input === 'string') ? input : (input && input.url ? input.url : '');
    const u = new URL(url, window.location.origin);
    const isSameOrigin = u.origin === window.location.origin;
    const isApi = u.pathname.startsWith('/api/');
    if (!isSameOrigin || !isApi) return originalFetch(input, init);

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  } catch {
    return originalFetch(input, init);
  }
};

// Prevent indefinite hangs on network fetches (some init steps await fetch).
const withTimeoutFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const hasSignal = !!(init && init.signal);
  if (hasSignal) return withTimeoutFetch(input, init);
  try {
    return await withTimeoutFetch(input, { ...init, signal: AbortSignal.timeout(8000) });
  } catch (e) {
    return await withTimeoutFetch(input, init);
  }
};

async function loadHeader() {
  try {
    const candidates = [
      '/components/header/header.html',
      '/sundayapp/components/header/console-header.html'
    ];
    let html = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        html = await res.text();
        break;
      } catch {}
    }
    if (!html) return;

    const container = document.getElementById('global-header-container');
    if (!container) return;
    // Safety: never execute/retain header scripts. Some browsers/extensions can
    // behave inconsistently with injected scripts; keep header declarative.
    try {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      temp.querySelectorAll('script').forEach((s) => { try { s.remove(); } catch {} });
      container.innerHTML = temp.innerHTML;
    } catch {
      container.innerHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    }
  } catch (err) {
    console.error('[Header] Load failed:', err);
  }
}

function initHeaderUI() {
  try {
    const themeBtn = document.getElementById('cnThemeBtn');
    const themeIcon = document.getElementById('cnThemeIcon');
    const logoutBtn = document.getElementById('cnLogoutBtn');
    const routeEl = document.getElementById('cnHeaderRoute');
    const versionBadge = document.getElementById('cnHeaderVersionBadge');

    const getTheme = () =>
      document.documentElement.getAttribute('data-theme') || localStorage.getItem('themeMode') || 'dark';

    const setTheme = (mode) => {
      document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem('themeMode', mode);
      if (themeIcon) themeIcon.textContent = mode === 'dark' ? '🌙' : '☀️';
    };

    const toggleTheme = () => setTheme(getTheme() === 'dark' ? 'light' : 'dark');

    const routeLabel = (route) => {
      // Strip leading "#" and "/" so we label routes cleanly.
      const r = String(route || '').replace(/^#/, '').replace(/^\//, '').split('?')[0];
      if (!r || r === 'overview') return 'Overview';
      if (r === 'login') return 'Sign in';
      if (r === 'contributions') return 'Contributions';
      if (r === 'protocols') return 'Protocols';
      if (r === 'ai') return 'AI';
      if (r === 'settings') return 'Settings';
      return r;
    };

    const updateRoute = () => {
      if (!routeEl) return;
      const raw = (window.location.hash || '').replace(/^#/, '') || '';
      const r = raw.split('?')[0];

      if (r === 'login') {
        routeEl.textContent = '';
        routeEl.style.display = 'none';
        return;
      }

      routeEl.style.display = '';
      routeEl.textContent = routeLabel(r);
    };

    const logout = async () => {
      try {
        localStorage.removeItem('sunday_access_token');
        localStorage.removeItem('sunday_refresh_token');
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
      } finally {
        window.location.hash = '#login';
      }
    };

    setTheme(getTheme());
    updateRoute();

    // Version badge (host app version)
    if (versionBadge && !versionBadge.__cnBound) {
      versionBadge.__cnBound = true;
      (async () => {
        try {
          const r = await fetch('/api/git/version', { cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const info = await r.json();
          const v = info.fullVersion || info.version || 'v0';
          versionBadge.textContent = v;
          versionBadge.title = `${v} • ${info.commitHash || ''}`;
        } catch {
          // keep default
        }
      })();
      versionBadge.addEventListener('click', () => {
        // Jump user to Settings where full version modal exists
        window.location.hash = '#settings';
      });
    }

    if (themeBtn && !themeBtn.__cnBound) {
      themeBtn.__cnBound = true;
      themeBtn.addEventListener('click', toggleTheme);
    }

    if (logoutBtn && !logoutBtn.__cnBound) {
      logoutBtn.__cnBound = true;
      logoutBtn.addEventListener('click', logout);
    }

    window.addEventListener('hashchange', updateRoute);
  } catch (e) {
    console.warn('[Header] init failed:', e);
  }
}

async function initFAB() {
  try {
    if (window.__cnFabMounted) return;
    window.__cnFabMounted = true;

    // Provides "Clear Cache" (real cache buster) + other helpful quick actions.
    await import('/sundayapp/components/modals/quick-actions.js');
    const { default: FAB } = await import('/sundayapp/components/buttons/fab.js');

    const fab = new FAB({
      position: 'bottom-right',
      icon: '⚡',
      label: '',
      variant: 'brand',
      size: 'medium',
      onClick: () => window.QuickActionsModal?.open?.(),
    });

    fab.appendToBody();
  } catch (e) {
    console.warn('[CN] FAB init failed:', e);
  }
}

async function maybeInitCNPages() {
  try {
    const route = (window.location.hash || '').replace(/^#/, '').replace(/^\//, '').split('?')[0];
    const r = route || '';

    const v = '20251219d';
    // Expose for settings/diagnostics
    window.__CN_ASSET_VERSION = v;

    if (r === '' || r === 'overview') {
      const mod = await import(`./cn-overview.js?v=${v}`);
      await mod.initCNOverview(document);
      return;
    }

    if (r === 'login') {
      const mod = await import(`./cn-login.js?v=${v}`);
      await mod.initCNLogin(document);
      return;
    }

    if (r === 'protocols') {
      const mod = await import(`./cn-protocols.js?v=${v}`);
      await mod.initCNProtocols(document);
      return;
    }

    if (r === 'contributions') {
      const mod = await import(`./cn-contributions.js?v=${v}`);
      await mod.initCNContributions(document);
      return;
    }

    if (r === 'settings') {
      const mod = await import(`./cn-settings.js?v=${v}`);
      await mod.initCNSettings(document);
      return;
    }
  } catch (e) {
    console.warn('[CN] Init failed:', e);
  }
}

async function initApp() {
  setBoot('Loading framework…');
  const { Sunday } = await import('/sundayapp/index.js');
  // Patch Router so simple routes like `#login` are treated as pageIds.
  // This removes the noisy warning: "[Router] No valid route context, using default".
  try {
    const routerMod = await import('/sundayapp/core/router.js');
    const Router = routerMod?.Router;
    if (Router && !Router.prototype.__cnSimpleRoutePatch) {
      Router.prototype.__cnSimpleRoutePatch = true;
      const origParseRoute = Router.prototype.parseRoute;
      Router.prototype.parseRoute = function (route) {
        const ctx = origParseRoute.call(this, route);
        if (route && ctx && !ctx.pageId && !ctx.appId && !ctx.cartridgeId) {
          ctx.pageId = String(route).replace(/^\/+/, '');
        }
        return ctx;
      };
    }
  } catch (e) {
    // Non-fatal
  }
  setBoot('Loading console config…');
  const { default: config } = await import('./../app.config.js?v=20251219a');
  setBoot('Loading auth…');
  const { getAuthClient } = await import('/core/auth-client.js');
  const { AuthGuard } = await import('/core/auth-guard.js');

  function ensureTabs() {
    try {
      const tabs = Array.isArray(config.tabs) ? config.tabs : [];
      if (!tabs.length) return;

      const tabsId = config.tabsContainerId || 'mainTabs';
      const container = document.getElementById(tabsId);
      if (!container) return;
      if ((container.innerHTML || '').trim().length > 0) return;

      container.innerHTML = tabs.map(tab => `
        <button class="tab-btn" type="button" data-tab="${tab.id}" data-route="${tab.id}">
          <span class="tab-icon">${tab.icon || ''}</span>
          <span class="tab-label">${tab.label}</span>
        </button>
      `).join('');

      // Bind click handling without relying on global inline handlers (module-safe)
      container.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.tab-btn') : null;
        if (!btn) return;
        const routeAttr = btn.getAttribute('data-route');
        const tabAttr = btn.getAttribute('data-tab');
        const route = routeAttr !== null ? routeAttr : tabAttr;
        if (route === null) return;
        e.preventDefault();
        window.location.hash = route;
      });

      // Mark active
      const route = (window.location.hash || '').replace(/^#/, '').split('?')[0] || '';
      const tabId = route || 'overview';
      const activeBtn = container.querySelector(`[data-tab="${tabId}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    } catch (e) {
      console.warn('[CN] ensureTabs failed:', e);
    }
  }

  setBoot('Checking session…');
  const auth = getAuthClient();
  const hash = window.location.hash || '';
  const route = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0] || '';
  const isLogin = route === 'login';

  if (!auth.isAuthenticated() && !isLogin) {
    if (hash && !hash.includes('#login')) sessionStorage.setItem('sunday_redirect_after_login', hash);
    window.location.hash = '#login';
  }

  setBoot('Starting console…');
  await Sunday.init(config);
  clearTimeout(hangTimer);

  // Defensive: ensure tabs render even if router didn't.
  ensureTabs();

  // Enforce auth on router navigation
  try {
    const guard = new AuthGuard({
      authClient: auth,
      loginPath: '#login',
      publicRoutes: ['login']
    });
    guard.initRouter(Sunday.router);
  } catch (e) {
    console.warn('[Auth] Guard init failed:', e);
  }

  await loadHeader();
  initHeaderUI();
  await initFAB();

  // Keep active tab class in sync if we rendered tabs ourselves.
  window.addEventListener('hashchange', () => {
    try {
      const tabsId = config.tabsContainerId || 'mainTabs';
      const container = document.getElementById(tabsId);
      if (!container) return;
      container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const route = (window.location.hash || '').replace(/^#/, '').split('?')[0] || '';
      const tabId = route || 'overview';
      const activeBtn = container.querySelector(`[data-tab="${tabId}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    } catch {}
  });

  window.addEventListener('hashchange', () => { maybeInitCNPages(); });
  await maybeInitCNPages();

  console.log('🌞 CN Console ready');
}

initApp().catch(showFatal);
