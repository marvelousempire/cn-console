/**
 * The Briefcase Library Modal
 * 
 * Shows a comprehensive library of all contributions in The Briefcase:
 * - All Consoles
 * - All Cartridges
 * - All Apps
 * - All Pages
 * - All Components
 * - All Handbooks
 * - All Frameworks
 * - Everything in TheBriefcase.App
 * 
 * Similar to Elementor Library - a full arsenal of everything available.
 */

const CN_DOCS_BASE = 'https://github.com/marvelousempire/ContributionNetwork/blob/main/contributions/';

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getOrigin() {
  try {
    return window.location.origin;
  } catch {
    return '';
  }
}

function getLiveLinks(c) {
  const r = c?.runtime || {};
  const out = [];

  const mountPath = r.mountPath || (r.consoleId ? `/${r.consoleId}` : '');
  if (mountPath) {
    out.push({
      label: 'Open here',
      href: `${getOrigin()}${mountPath.startsWith('/') ? mountPath : '/' + mountPath}`
    });
  }

  if (r.cartridgePath) {
    out.push({
      label: 'Open cartridge',
      href: `${getOrigin()}${r.cartridgePath.startsWith('/') ? r.cartridgePath : '/' + r.cartridgePath}`
    });
  }

  const hosts = Array.isArray(r.hosts) ? r.hosts : [];
  for (const host of hosts) {
    const h = String(host || '').trim();
    if (!h) continue;
    const proto = (window.location?.protocol === 'http:') ? 'http:' : 'https:';
    out.push({
      label: `Open on ${host}`,
      href: `${proto}//${h}/`
    });
  }

  const seen = new Set();
  return out.filter(l => {
    if (!l?.href) return false;
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

let libraryData = null;
let libraryModal = null;

async function loadLibraryData() {
  if (libraryData) return libraryData;

  try {
    // Load CN registry contributions
    const cnRes = await fetch('/api/cn/contributions', { cache: 'no-store' });
    if (!cnRes.ok) throw new Error(`CN registry HTTP ${cnRes.status}`);
    const cnData = await cnRes.json();
    
    const contributions = Array.isArray(cnData?.contributions) ? cnData.contributions : [];
    
    // Also try to load Sunday registry for Sunday-specific contributions
    try {
      const sundayRes = await fetch('/sundayapp/registry/sunday-registry.json', { cache: 'no-store' });
      if (sundayRes.ok) {
        const sundayData = await sundayRes.json();
        
        // Add Sunday Console from Sunday registry if not already in CN registry
        if (sundayData?.consoles) {
          sundayData.consoles.forEach(console => {
            // Check if already exists in contributions
            const exists = contributions.some(c => c.id === console.id || c.name === console.name);
            if (!exists) {
              contributions.push({
                id: console.id || `sunday-${console.name?.toLowerCase().replace(/\s+/g, '-')}`,
                name: console.name,
                shortName: console.shortName || console.name,
                type: 'console',
                emoji: console.icon || '🖥️',
                tagline: console.description || `Console from Sunday Registry`,
                category: 'sunday-bundled',
                status: 'active',
                repository: {
                  url: console.repo || ''
                },
                description: console.description || '',
                runtime: {
                  mountPath: console.internalPath || console.url || '',
                  hosts: console.subdomain ? [`${console.subdomain}.thebriefcase.app`] : []
                },
                _source: 'sunday-registry'
              });
            }
          });
        }
        
        // Add Sunday Cartridges from Sunday registry
        if (sundayData?.cartridges) {
          sundayData.cartridges.forEach(cartridge => {
            const exists = contributions.some(c => c.id === cartridge.id || c.name === cartridge.name);
            if (!exists) {
              contributions.push({
                id: cartridge.id || `sunday-${cartridge.name?.toLowerCase().replace(/\s+/g, '-')}`,
                name: cartridge.name,
                shortName: cartridge.shortName || cartridge.name,
                type: cartridge.type || 'cartridge',
                emoji: cartridge.icon || '📦',
                tagline: cartridge.description || `Cartridge from Sunday Registry`,
                category: cartridge.category || 'sunday-bundled',
                status: cartridge.installed ? 'active' : 'available',
                repository: {
                  url: cartridge.repo || ''
                },
                description: cartridge.description || '',
                runtime: {
                  cartridgePath: `/cartridges/${cartridge.id}`,
                  standalone: cartridge.standalone
                },
                _source: 'sunday-registry'
              });
            }
          });
        }
      }
    } catch (sundayErr) {
      console.warn('[Library] Sunday registry not available:', sundayErr);
    }
    
    libraryData = {
      network: cnData?.network || null,
      contributions: contributions
    };
    return libraryData;
  } catch (e) {
    console.error('[Library] Failed to load:', e);
    return { network: null, contributions: [] };
  }
}

function organizeByType(contributions) {
  const organized = {
    'framework': [],
    'framework-utility': [],
    'admin-core': [],
    'console': [],
    'console-cartridge': [],
    'cartridge': [],
    'utility-cartridge': [],
    'tool': [],
    'system': [],
    'handbook': [],
    'app': [],
    'page': [],
    'component': [],
    'other': []
  };

  contributions.forEach(c => {
    const type = c.type || 'other';
    
    // Handle nested types (apps, pages, components might be nested in cartridges)
    if (type === 'app' || c._nestedType === 'app') {
      organized.app.push(c);
    } else if (type === 'page' || c._nestedType === 'page') {
      organized.page.push(c);
    } else if (type === 'component' || c._nestedType === 'component') {
      organized.component.push(c);
    } else if (organized[type]) {
      organized[type].push(c);
    } else {
      organized.other.push(c);
    }
  });

  return organized;
}

function getTypeLabel(type) {
  const typeMap = {
    'framework': 'Framework',
    'framework-utility': 'Framework Utility',
    'admin-core': 'Admin Core',
    'console': 'Console',
    'console-cartridge': 'Console Cartridge',
    'cartridge': 'Cartridge',
    'utility-cartridge': 'Utility Cartridge',
    'tool': 'Tool',
    'system': 'System',
    'handbook': 'Handbook',
    'app': 'App',
    'page': 'Page',
    'component': 'Component'
  };
  return typeMap[type] || type || 'Other';
}

function renderLibraryCard(c) {
  const emoji = c.emoji || '📦';
  const name = c.name || c.id || 'Unknown';
  const tagline = c.tagline || '';
  const desc = c.description || '';
  const repoUrl = c.repository?.url || '';
  const docUrl = c.id ? (CN_DOCS_BASE + encodeURIComponent(c.id) + '.md') : '';
  const status = c.status || 'unknown';
  const category = c.category || '';
  const type = c.type || 'other';
  const liveLinks = getLiveLinks(c);

  const links = [];
  if (repoUrl) links.push({ label: 'Repository', href: repoUrl });
  if (docUrl) links.push({ label: 'CN Documentation', href: docUrl });
  liveLinks.forEach(l => links.push(l));

  return `
    <div class="briefcase-library-card">
      <div class="briefcase-library-card__header">
        <div class="briefcase-library-card__emoji">${escapeHtml(emoji)}</div>
        <div class="briefcase-library-card__title">
          <div class="briefcase-library-card__name">${escapeHtml(name)}</div>
          ${tagline ? `<div class="briefcase-library-card__tagline">${escapeHtml(tagline)}</div>` : ''}
        </div>
      </div>
      ${desc ? `<div class="briefcase-library-card__desc">${escapeHtml(desc)}</div>` : ''}
      <div class="briefcase-library-card__meta">
        <span class="briefcase-library-badge briefcase-badge-type briefcase-badge-type-${escapeHtml(type)}">${escapeHtml(getTypeLabel(type))}</span>
        ${status ? `<span class="briefcase-library-badge briefcase-badge-${status}">${escapeHtml(status)}</span>` : ''}
        ${category ? `<span class="briefcase-library-badge briefcase-badge-category">${escapeHtml(category)}</span>` : ''}
      </div>
      ${links.length > 0 ? `
        <div class="briefcase-library-card__links">
          ${links.map(l => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noreferrer" class="briefcase-library-link">${escapeHtml(l.label)} →</a>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderLibrarySection(type, contributions, label, emoji) {
  if (!contributions || contributions.length === 0) return '';

  // Count active and inactive
  const active = contributions.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const inactive = contributions.length - active;

  const countDisplay = inactive > 0 
    ? `<span class="briefcase-library-section__count"><span class="count-active">${active} active</span><span class="count-separator"> • </span><span class="count-inactive">${inactive} inactive</span></span>`
    : `<span class="briefcase-library-section__count"><span class="count-active">${active} active</span></span>`;

  return `
    <div class="briefcase-library-section">
      <div class="briefcase-library-section__header">
        <span class="briefcase-library-section__emoji">${emoji}</span>
        <h3 class="briefcase-library-section__title">${escapeHtml(label)}</h3>
        ${countDisplay}
      </div>
      <div class="briefcase-library-section__grid">
        ${contributions.map(c => renderLibraryCard(c)).join('')}
      </div>
    </div>
  `;
}

async function renderLibraryModal() {
  const data = await loadLibraryData();
  const organized = organizeByType(data.contributions);

  // Organize sections with proper grouping
  const sections = [
    // Frameworks (Sunday, Handbook, Utility)
    renderLibrarySection('framework', organized.framework.concat(organized['framework-utility']), 'Frameworks (Sunday, Handbook, Utility)', '🌞'),
    // Admin Core
    renderLibrarySection('admin-core', organized['admin-core'], 'Admin Core', '🌞'),
    // Consoles
    renderLibrarySection('console', organized.console.concat(organized['console-cartridge']), 'Consoles', '🖥️'),
    // Cartridges
    renderLibrarySection('cartridge', organized.cartridge.concat(organized['utility-cartridge']), 'Cartridges', '📦'),
    // Apps, Pages, Components (nested contributions)
    renderLibrarySection('app', organized.app, 'Apps', '📱'),
    renderLibrarySection('page', organized.page, 'Pages', '📄'),
    renderLibrarySection('component', organized.component, 'Components', '🧩'),
    // Tools and Systems
    renderLibrarySection('tool', organized.tool, 'Tools', '⚙️'),
    renderLibrarySection('system', organized.system, 'Systems', '🏗️'),
    // Handbooks
    renderLibrarySection('handbook', organized.handbook, 'Handbooks', '📚'),
    // Other (catch-all)
    renderLibrarySection('other', organized.other, 'Other', '📦')
  ].filter(s => s).join('');

  const modalContent = `
    <div class="briefcase-library-modal">
      <div class="briefcase-library-modal__header">
        <div>
          <h2 class="briefcase-library-modal__title">📚 The Briefcase Library</h2>
          <p class="briefcase-library-modal__subtitle">Complete arsenal of all Consoles, Cartridges, Apps, Pages, Components, Handbooks, Frameworks (Sunday, Handbook, Utility), Admin Core, Tools, Systems, and everything in TheBriefcase.App — including all derivatives and nested contributions.</p>
        </div>
        <button class="briefcase-library-modal__close" onclick="closeBriefcaseLibrary()" aria-label="Close">✕</button>
      </div>
      <div class="briefcase-library-modal__body">
        <div class="briefcase-library-search">
          <input type="text" id="briefcaseLibrarySearch" class="briefcase-library-search__input" placeholder="Search library (name, type, tagline, description)…" />
        </div>
        <div class="briefcase-library-content" id="briefcaseLibraryContent">
          ${sections || '<div class="briefcase-library-empty">No contributions found</div>'}
        </div>
      </div>
    </div>
  `;

  return modalContent;
}

function filterLibrary(searchQuery) {
  if (!libraryData || !searchQuery) return;

  const query = String(searchQuery).toLowerCase().trim();
  if (!query) {
    // Reset to full view
    openBriefcaseLibrary();
    return;
  }

  const filtered = libraryData.contributions.filter(c => {
    const searchable = [
      c.id,
      c.name,
      c.shortName,
      c.type,
      c.tagline,
      c.description,
      c.category,
      c.status,
      c._source, // Include source (sunday-registry, cn-registry)
      c.repository?.url
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(query);
  });

  const organized = organizeByType(filtered);
  const contentEl = document.getElementById('briefcaseLibraryContent');
  if (!contentEl) return;

  // Organize sections with proper grouping (same as renderLibraryModal)
  const sections = [
    renderLibrarySection('framework', organized.framework.concat(organized['framework-utility']), 'Frameworks (Sunday, Handbook, Utility)', '🌞'),
    renderLibrarySection('admin-core', organized['admin-core'], 'Admin Core', '🌞'),
    renderLibrarySection('console', organized.console.concat(organized['console-cartridge']), 'Consoles', '🖥️'),
    renderLibrarySection('cartridge', organized.cartridge.concat(organized['utility-cartridge']), 'Cartridges', '📦'),
    renderLibrarySection('app', organized.app, 'Apps', '📱'),
    renderLibrarySection('page', organized.page, 'Pages', '📄'),
    renderLibrarySection('component', organized.component, 'Components', '🧩'),
    renderLibrarySection('tool', organized.tool, 'Tools', '⚙️'),
    renderLibrarySection('system', organized.system, 'Systems', '🏗️'),
    renderLibrarySection('handbook', organized.handbook, 'Handbooks', '📚'),
    renderLibrarySection('other', organized.other, 'Other', '📦')
  ].filter(s => s).join('');

  contentEl.innerHTML = sections || '<div class="briefcase-library-empty">No matches found</div>';
}

async function openBriefcaseLibrary() {
  if (!libraryModal) {
    libraryModal = document.createElement('div');
    libraryModal.id = 'briefcaseLibraryModal';
    libraryModal.className = 'briefcase-library-overlay';
    libraryModal.setAttribute('role', 'dialog');
    libraryModal.setAttribute('aria-modal', 'true');
    libraryModal.setAttribute('aria-label', 'The Briefcase Library');
    document.body.appendChild(libraryModal);
  }

  libraryModal.innerHTML = await renderLibraryModal();
  libraryModal.classList.add('show');

  // Bind search
  const searchInput = document.getElementById('briefcaseLibrarySearch');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterLibrary(e.target.value);
      }, 300);
    });
  }

  // Close on backdrop click
  libraryModal.addEventListener('click', (e) => {
    if (e.target === libraryModal) closeBriefcaseLibrary();
  });

  // Close on Escape
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeBriefcaseLibrary();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function closeBriefcaseLibrary() {
  if (libraryModal) {
    libraryModal.classList.remove('show');
    setTimeout(() => {
      if (libraryModal && !libraryModal.classList.contains('show')) {
        libraryModal.innerHTML = '';
      }
    }, 300);
  }
}

window.openBriefcaseLibrary = openBriefcaseLibrary;
window.closeBriefcaseLibrary = closeBriefcaseLibrary;

export { openBriefcaseLibrary, closeBriefcaseLibrary, loadLibraryData };

