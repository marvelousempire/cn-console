/**
 * CN Console — Style Modules Loader
 *
 * Goal: Treat CSS like "cartridges":
 * - Keep core styles always-on
 * - Enable page-specific / modal-specific styles only when needed
 * - Prevent global selector collisions (paired with `[data-cn-page="..."]` scoping)
 *
 * This is intentionally lightweight: link toggling + optional lazy-load.
 */

const MANIFEST_PATH = './css/styles.manifest.json';

function safeText(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

function assetVersion() {
  return (
    window.__CN_STYLE_VERSION ||
    window.__CN_ASSET_VERSION ||
    // fall back to theme asset version key used elsewhere
    localStorage.getItem('cn_asset_version') ||
    '0'
  );
}

function withVersion(url) {
  const v = assetVersion();
  if (!v || v === '0') return url;
  return url.includes('?') ? `${url}&v=${encodeURIComponent(v)}` : `${url}?v=${encodeURIComponent(v)}`;
}

async function loadManifest() {
  const url = withVersion(MANIFEST_PATH);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Style manifest fetch failed: HTTP ${res.status}`);
  return await res.json();
}

function routeId(raw) {
  const r = safeText(raw).replace(/^#/, '').replace(/^\//, '').split('?')[0];
  return r || 'overview';
}

function linkIdFor(moduleId) {
  return `cn-style-${moduleId}`;
}

function findExistingLink(moduleId) {
  return document.getElementById(linkIdFor(moduleId));
}

function createLink(moduleId, href) {
  const link = document.createElement('link');
  link.id = linkIdFor(moduleId);
  link.rel = 'stylesheet';
  link.href = withVersion(href);
  link.dataset.cnStyle = moduleId;
  // start disabled; we'll enable when needed
  link.disabled = true;
  document.head.appendChild(link);
  return link;
}

function waitForStylesheet(link, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!link) return resolve(false);
    // If already loaded once, don't wait
    if (link.dataset.loaded === '1') return resolve(true);

    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try { link.dataset.loaded = ok ? '1' : '0'; } catch {}
      resolve(ok);
    };

    const t = setTimeout(() => finish(false), timeoutMs);
    link.addEventListener('load', () => { clearTimeout(t); finish(true); }, { once: true });
    link.addEventListener('error', () => { clearTimeout(t); finish(false); }, { once: true });
  });
}

function shouldEnable(mod, currentRoute) {
  if (mod?.always) return true;
  const routes = Array.isArray(mod?.routes) ? mod.routes : [];
  return routes.includes(currentRoute);
}

/**
 * Ensure styles for the given route are enabled.
 * - Enables needed styles (and lazily creates missing <link> tags)
 * - Disables styles that should not apply on this route (prevents leakage)
 */
export async function applyStyleModulesForRoute(route) {
  const r = routeId(route);
  let manifest = null;
  try {
    manifest = await loadManifest();
  } catch (e) {
    console.warn('[CN Styles] Manifest load failed:', e);
    return false;
  }

  const mods = Array.isArray(manifest?.modules) ? manifest.modules : [];
  const desired = new Set(mods.filter((m) => shouldEnable(m, r)).map((m) => m.id));

  // Create + toggle links
  for (const mod of mods) {
    const id = safeText(mod.id);
    if (!id) continue;

    let link = findExistingLink(id);
    if (!link && mod.href) {
      link = createLink(id, mod.href);
    }
    if (!link) continue;

    const enable = desired.has(id);
    link.disabled = !enable;
    if (enable) {
      // Wait briefly so the route doesn't flash unstyled
      await waitForStylesheet(link, 2500);
    }
  }

  return true;
}

/**
 * On-demand enable for style modules (ex: Briefcase Library modal).
 */
export async function ensureStyleModule(moduleId) {
  const id = safeText(moduleId);
  if (!id) return false;

  let manifest = null;
  try {
    manifest = await loadManifest();
  } catch (e) {
    console.warn('[CN Styles] Manifest load failed:', e);
    return false;
  }

  const mods = Array.isArray(manifest?.modules) ? manifest.modules : [];
  const mod = mods.find((m) => safeText(m.id) === id);
  if (!mod) return false;

  let link = findExistingLink(id);
  if (!link && mod.href) link = createLink(id, mod.href);
  if (!link) return false;

  link.disabled = false;
  await waitForStylesheet(link, 3000);
  return true;
}


