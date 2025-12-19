/**
 * CN Contributions page logic (AI Console)
 *
 * Purpose: Provide an operator-facing index that links users to every CN Contribution.
 * Source of truth: ContributionNetwork registry JSON.
 */

const CN_REPO = 'https://github.com/marvelousempire/ContributionNetwork';
const CN_REGISTRY_RAW = 'https://raw.githubusercontent.com/marvelousempire/ContributionNetwork/main/registry/cn-registry.json';
const CN_DOCS_BASE = 'https://github.com/marvelousempire/ContributionNetwork/blob/main/contributions/';

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalize(str) {
  return String(str || '').trim().toLowerCase();
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function scoreMatch(haystack, query) {
  if (!query) return 1;
  if (haystack.includes(query)) return 2;
  const parts = query.split(/\s+/).filter(Boolean);
  if (!parts.length) return 1;
  const hits = parts.reduce((sum, p) => sum + (haystack.includes(p) ? 1 : 0), 0);
  return hits;
}

async function fetchRegistry() {
  const res = await fetch(CN_REGISTRY_RAW, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Registry fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const contributions = Array.isArray(data?.contributions) ? data.contributions : [];
  return { network: data?.network || null, contributions };
}

function buildTypeOptions(selectEl, contributions) {
  const types = uniq(contributions.map(c => c.type).map(normalize)).sort();
  const current = selectEl.value || '';

  const base = '<option value="">All types</option>';
  const opts = types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  selectEl.innerHTML = base + opts;
  selectEl.value = current;
}

function joinPath(path) {
  if (!path) return '';
  const p = String(path).trim();
  if (!p) return '';
  return p.startsWith('/') ? p : `/${p}`;
}

function getOrigin() {
  try {
    return window.location.origin;
  } catch {
    return '';
  }
}

function toHostUrl(host) {
  const h = String(host || '').trim();
  if (!h) return '';
  // Prefer https in production; ok if host only supports http in dev.
  const proto = (window.location?.protocol === 'http:') ? 'http:' : 'https:';
  return `${proto}//${h}/`;
}

function getLiveLinks(c) {
  const r = c?.runtime || {};
  const out = [];

  // 1) Console / hosted UI mount path on the current server
  const mountPath = r.mountPath || (r.consoleId ? `/${r.consoleId}` : '');
  if (mountPath) {
    out.push({
      label: 'Open here',
      href: `${getOrigin()}${joinPath(mountPath)}`
    });
  }

  // 2) Explicit cartridge path on the current server
  if (r.cartridgePath) {
    out.push({
      label: 'Open cartridge',
      href: `${getOrigin()}${joinPath(r.cartridgePath)}`
    });
  }

  // 3) Host-mapped console(s)
  const hosts = Array.isArray(r.hosts) ? r.hosts : [];
  for (const host of hosts) {
    const url = toHostUrl(host);
    if (!url) continue;
    out.push({
      label: `Open on ${host}`,
      href: url
    });
  }

  // Deduplicate by href
  const seen = new Set();
  return out.filter(l => {
    if (!l?.href) return false;
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

function firstHrefForContribution(c) {
  const live = getLiveLinks(c);
  if (live.length) return live[0].href;
  return c?.repository?.url || '';
}

function renderEcosystem(rowEl, network, contributions) {
  if (!rowEl) return;

  const byId = new Map(contributions.map(c => [c.id, c]));

  // Canonical ecosystem chain (CN first)
  const chain = [
    {
      id: 'cn',
      emoji: '🤝',
      name: network?.name || 'Contribution Network',
      sub: 'Registry (source of truth)',
      href: CN_REPO
    },
    byId.get('sunday-app-framework'),
    byId.get('quick-server'),
    byId.get('ai-console')
  ].filter(Boolean);

  const items = chain.map((item) => {
    if (item.id === 'cn' && item.href) return item;
    // contribution object
    return {
      id: item.id,
      emoji: item.emoji || '📦',
      name: item.name || item.id,
      sub: item.tagline || item.type || '',
      href: firstHrefForContribution(item)
    };
  });

  const html = items.map((it, idx) => {
    const card = `
      <a class="cn-eco-card" href="${escapeHtml(it.href || '#')}" ${it.href ? 'target="_blank" rel="noreferrer"' : ''}>
        <div class="cn-eco-emoji">${escapeHtml(it.emoji || '📦')}</div>
        <div class="cn-eco-title">
          <div class="cn-eco-name">${escapeHtml(it.name || '')}</div>
          <div class="cn-eco-sub">${escapeHtml(it.sub || '')}</div>
        </div>
      </a>
    `;
    if (idx === items.length - 1) return card;
    return card + `<div class="cn-eco-arrow">→</div>`;
  }).join('');

  rowEl.innerHTML = html;
}

function renderBeginnerMap(rowEl) {
  if (!rowEl) return;

  const items = [
    {
      emoji: '🤝',
      name: 'Contribution Network',
      sub: 'Association + registry (source of truth)',
      href: CN_REPO
    },
    {
      emoji: '🌞',
      name: 'Framework',
      sub: 'Engine + shared services',
      href: CN_REPO
    },
    {
      emoji: '🖥️',
      name: 'Console',
      sub: 'Dashboard UI surface (ex: CN Console)',
      href: CN_REPO
    },
    {
      emoji: '🎮',
      name: 'Cartridge',
      sub: 'Plug-in feature bundle',
      href: CN_REPO
    },
    {
      emoji: '📦',
      name: 'App',
      sub: 'Module inside a cartridge',
      href: CN_REPO
    },
    {
      emoji: '📄',
      name: 'Page',
      sub: 'Screen / route',
      href: CN_REPO
    }
  ];

  rowEl.innerHTML = items.map((it, idx) => {
    const card = `
      <a class="cn-eco-card" href="${escapeHtml(it.href || '#')}" ${it.href ? 'target="_blank" rel="noreferrer"' : ''}>
        <div class="cn-eco-emoji">${escapeHtml(it.emoji || '📦')}</div>
        <div class="cn-eco-title">
          <div class="cn-eco-name">${escapeHtml(it.name || '')}</div>
          <div class="cn-eco-sub">${escapeHtml(it.sub || '')}</div>
        </div>
      </a>
    `;
    if (idx === items.length - 1) return card;
    return card + `<div class="cn-eco-arrow">→</div>`;
  }).join('');
}

function render({ gridEl, metaEl }, contributions, network, { query, type, status }) {
  const q = normalize(query);
  const t = normalize(type);
  const s = normalize(status);

  const rows = contributions
    .map(c => {
      const name = c.name || c.id || '';
      const repo = c.repository?.url || '';
      const tagline = c.tagline || '';
      const desc = c.description || '';
      const cType = normalize(c.type);
      const cStatus = normalize(c.status);

      const hay = normalize([c.id, name, cType, cStatus, tagline, desc, repo, c.category].filter(Boolean).join(' '));
      const matchScore = scoreMatch(hay, q);

      return { c, matchScore };
    })
    .filter(({ c, matchScore }) => {
      if (q && matchScore <= 0) return false;
      if (t && normalize(c.type) !== t) return false;
      if (s && normalize(c.status) !== s) return false;
      return true;
    })
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return String(a.c.name || a.c.id || '').localeCompare(String(b.c.name || b.c.id || ''));
    })
    .map(({ c }) => c);

  const cards = rows.map(c => {
    const id = c.id || '';
    const name = c.name || id;
    const emoji = c.emoji || '📦';
    const typeLabel = c.type || 'unknown';
    const statusLabel = c.status || 'unknown';
    const category = c.category || '';
    const tagline = c.tagline || '';
    const desc = c.description || '';

    const repoUrl = c.repository?.url || '';
    const docUrl = id ? (CN_DOCS_BASE + encodeURIComponent(id) + '.md') : '';

    const links = [
      repoUrl ? `<a class="sunday-badge" href="${escapeHtml(repoUrl)}" target="_blank" rel="noreferrer">Repo</a>` : '',
      docUrl ? `<a class="sunday-badge" href="${escapeHtml(docUrl)}" target="_blank" rel="noreferrer">CN Doc</a>` : ''
    ];

    const liveLinks = getLiveLinks(c).map(l =>
      `<a class="sunday-badge" href="${escapeHtml(l.href)}" target="_blank" rel="noreferrer">${escapeHtml(l.label)}</a>`
    );

    const allLinks = links.concat(liveLinks).filter(Boolean).join('');

    return `
      <div class="cn-card">
        <div class="cn-card__top">
          <div class="cn-emoji">${escapeHtml(emoji)}</div>
          <div class="cn-title">
            <div class="cn-name">${escapeHtml(name)}</div>
            <div class="cn-sub">${escapeHtml(typeLabel)} • ${escapeHtml(statusLabel)}${category ? ' • ' + escapeHtml(category) : ''}</div>
          </div>
        </div>
        ${tagline ? `<div class="cn-tagline">${escapeHtml(tagline)}</div>` : ''}
        ${desc ? `<div class="cn-desc">${escapeHtml(desc)}</div>` : ''}
        <div class="cn-links">${allLinks}</div>
      </div>
    `;
  }).join('');

  gridEl.innerHTML = cards || '<div class="sunday-text sunday-text--muted">No matches.</div>';

  const updated = network?.updated ? ` • updated ${network.updated}` : '';
  if (metaEl) metaEl.textContent = `${rows.length} shown • ${contributions.length} total${updated}`;
}

/**
 * Initialize the CN Contributions page if its DOM is present.
 * Safe to call multiple times.
 */
export async function initCNContributions(root = document) {
  const page = root.querySelector('[data-cn-page="contributions"]');
  if (!page) return false;

  // Ensure we only bind once per page mount.
  if (page.dataset.cnBound === '1') return true;
  page.dataset.cnBound = '1';

  const openRegistry = page.querySelector('#cnOpenRegistry');
  const openRepo = page.querySelector('#cnOpenRepo');
  const beginnerRow = page.querySelector('#cnBeginnerRow');
  const ecosystemRow = page.querySelector('#cnEcosystemRow');
  const search = page.querySelector('#cnSearch');
  const type = page.querySelector('#cnType');
  const status = page.querySelector('#cnStatus');
  const reload = page.querySelector('#cnReload');
  const meta = page.querySelector('#cnMeta');
  const grid = page.querySelector('#cnGrid');
  const error = page.querySelector('#cnError');

  const setError = (msg) => {
    if (!error) return;
    if (!msg) {
      error.style.display = 'none';
      error.textContent = '';
      return;
    }
    error.style.display = 'block';
    error.textContent = msg;
  };

  const setMeta = (text) => {
    if (meta) meta.textContent = text;
  };

  if (openRegistry) openRegistry.href = CN_REGISTRY_RAW;
  if (openRepo) openRepo.href = CN_REPO;

  let state = { network: null, contributions: [] };

  const debounce = (fn, ms = 120) => {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  };

  const runRender = () => {
    if (!grid) return;
    render(
      { gridEl: grid, metaEl: meta },
      state.contributions,
      state.network,
      { query: search?.value || '', type: type?.value || '', status: status?.value || '' }
    );
  };

  const debouncedRun = debounce(runRender, 120);

  search?.addEventListener('input', debouncedRun);
  type?.addEventListener('change', runRender);
  status?.addEventListener('change', runRender);

  const load = async () => {
    try {
      setError('');
      setMeta('Loading CN registry…');

      state = await fetchRegistry();

      if (type) buildTypeOptions(type, state.contributions);
      renderBeginnerMap(beginnerRow);
      renderEcosystem(ecosystemRow, state.network, state.contributions);
      runRender();
    } catch (e) {
      console.error(e);
      setError(e?.message || String(e));
      setMeta('Failed to load registry.');
      if (grid) grid.innerHTML = '';
    }
  };

  reload?.addEventListener('click', () => load());

  await load();
  return true;
}
