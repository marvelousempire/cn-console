/**
 * CN Console settings page
 * - QS-style layout (simplified)
 * - Add-on toggles (DRY installer)
 */

export async function initCNSettings(root = document) {
  const page = root.querySelector('[data-cn-page="settings"]');
  if (!page) return false;
  if (page.dataset.cnBound === '1') return true;
  page.dataset.cnBound = '1';

  const listEl = page.querySelector('#cnAddonsList');
  const toastEl = page.querySelector('#cnSettingsToast');
  const versionBadge = page.querySelector('#cnSettingsVersionBadge');
  const modal = page.querySelector('#cnSettingsModal');
  const modalClose = page.querySelector('#cnModalClose');
  const changelogList = page.querySelector('#cnChangelogList');

  const diagConsole = page.querySelector('#cnDiagConsole');
  const diagConsoleVersion = page.querySelector('#cnDiagConsoleVersion');
  const diagAssetVersion = page.querySelector('#cnDiagAssetVersion');
  const diagHost = page.querySelector('#cnDiagHost');
  const diagHostGit = page.querySelector('#cnDiagHostGit');

  const hostVersion = page.querySelector('#cnHostVersion');
  const hostBranch = page.querySelector('#cnHostBranch');
  const hostCommit = page.querySelector('#cnHostCommit');
  const hostUpdated = page.querySelector('#cnHostUpdated');

  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1800);
  };

  // IMPORTANT: cache-bust shared add-ons module so users actually get updates.
  // Browsers can aggressively cache ESM imports under /modules/*.
  const assetV = window.__CN_ASSET_VERSION || '';
  const addonsUrl = assetV ? `/modules/js/console-addons.js?v=${encodeURIComponent(assetV)}` : '/modules/js/console-addons.js';
  const { listAddons, getEnabledAddons, toggleAddon, applyAddons } = await import(addonsUrl);

  const consoleKey = (window.Sunday?.config?.name || 'Console').toLowerCase().replace(/\s+/g, '-');
  const consoleName = window.Sunday?.config?.name || 'Console';
  const consoleVersion = window.Sunday?.config?.version || '';
  const assetVersion = window.__CN_ASSET_VERSION || '';

  function setActivePanel(id) {
    page.querySelectorAll('.cn-settings-tab').forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === id));
    page.querySelectorAll('[data-panel]').forEach((p) => {
      p.style.display = p.getAttribute('data-panel') === id ? '' : 'none';
    });
  }

  page.querySelectorAll('#cnSettingsTabs .cn-settings-tab').forEach((btn) => {
    btn.addEventListener('click', () => setActivePanel(btn.getAttribute('data-tab')));
  });

  function openModal() { if (modal) modal.classList.add('show'); }
  function closeModal() { if (modal) modal.classList.remove('show'); }
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  function setModalTab(tab) {
    page.querySelectorAll('.cn-modal-tab').forEach((b) => b.classList.toggle('active', b.getAttribute('data-modal-tab') === tab));
    page.querySelectorAll('[data-modal-panel]').forEach((p) => {
      p.style.display = p.getAttribute('data-modal-panel') === tab ? '' : 'none';
    });
  }
  page.querySelectorAll('.cn-modal-tab').forEach((b) => b.addEventListener('click', () => setModalTab(b.getAttribute('data-modal-tab'))));

  async function render() {
    if (!listEl) return;
    const addons = listAddons();
    const enabled = getEnabledAddons(consoleKey);

    listEl.innerHTML = addons.map((a) => {
      const on = enabled.has(a.id);
      return `
        <label class="cn-setting-row">
          <div class="cn-setting-main">
            <div class="cn-setting-title">${escapeHtml(a.title)}</div>
            <div class="cn-setting-desc">${escapeHtml(a.description || '')}</div>
          </div>
          <div class="cn-setting-controls">
            <span class="cn-radio">
              <input type="radio" name="addon-${escapeAttr(a.id)}" value="on" ${on ? 'checked' : ''} data-addon="${escapeAttr(a.id)}" data-next="on" />
              <span>On</span>
            </span>
            <span class="cn-radio">
              <input type="radio" name="addon-${escapeAttr(a.id)}" value="off" ${!on ? 'checked' : ''} data-addon="${escapeAttr(a.id)}" data-next="off" />
              <span>Off</span>
            </span>
          </div>
        </label>
      `;
    }).join('');

    listEl.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const el = e.target;
        const id = el.getAttribute('data-addon');
        const next = el.getAttribute('data-next') === 'on';
        if (!id) return;
        await toggleAddon(id, next, { consoleKey });
        toast(next ? 'Enabled' : 'Disabled');
      });
    });
  }

  async function loadHostGit() {
    try {
      const r = await fetch('/api/git/version', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const info = await r.json();
      const full = info.fullVersion || info.version || 'v0';
      if (versionBadge) versionBadge.textContent = full;
      if (hostVersion) hostVersion.textContent = full;
      if (hostBranch) hostBranch.textContent = info.branch || 'main';
      if (hostCommit) hostCommit.textContent = info.commitHash || '';
      if (hostUpdated) hostUpdated.textContent = info.lastUpdated || '';
      if (diagHostGit) diagHostGit.textContent = `${full} (${info.commitHash || ''})`;
    } catch (e) {
      if (versionBadge) versionBadge.textContent = 'v?';
      if (changelogList) changelogList.textContent = `Failed to load host git info: ${e?.message || String(e)}`;
    }
  }

  async function loadChangelog() {
    if (!changelogList) return;
    try {
      const r = await fetch('/api/git/log?limit=10', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const commits = data.commits || [];
      if (!commits.length) {
        changelogList.textContent = 'No commits returned.';
        return;
      }
      changelogList.innerHTML = commits.map((c) => {
        const msg = escapeHtml(c.message || '');
        const meta = escapeHtml(`${c.short || ''} • ${c.author || ''} • ${c.date || ''}`);
        return `<div class="cn-commit"><div class="msg">${msg}</div><div class="meta">${meta}</div></div>`;
      }).join('');
    } catch (e) {
      changelogList.textContent = `Failed to load changelog: ${e?.message || String(e)}`;
    }
  }

  page.querySelector('#cnApplyAddons')?.addEventListener('click', async () => {
    await applyAddons({ consoleKey });
    toast('Applied');
  });

  page.querySelector('#cnOpenQuickActions')?.addEventListener('click', async () => {
    try {
      await import('/sundayapp/components/modals/quick-actions.js');
      window.QuickActionsModal?.open?.();
    } catch (e) {
      toast(e?.message || String(e));
    }
  });

  page.querySelector('#cnClearCache')?.addEventListener('click', async () => {
    try {
      await import('/sundayapp/components/modals/quick-actions.js');
      // Execute the built-in action directly
      await window.QuickActions?.clearCache?.execute?.();
    } catch (e) {
      toast(e?.message || String(e));
    }
  });

  page.querySelector('#cnExportSettings')?.addEventListener('click', async () => {
    try {
      const enabled = Array.from(getEnabledAddons(consoleKey));
      const payload = {
        exportedAt: new Date().toISOString(),
        console: { name: consoleName, version: consoleVersion, key: consoleKey, assetVersion },
        host: { origin: window.location.origin, host: window.location.host },
        addons: { enabled },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cn-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Exported');
    } catch (e) {
      toast(e?.message || String(e));
    }
  });

  page.querySelector('#cnResetSettings')?.addEventListener('click', async () => {
    try {
      if (!confirm('Reset CN console settings (add-ons) to defaults?')) return;
      // Clear per-console addon state
      localStorage.removeItem(`sunday_console_addons:${consoleKey}`);
      await applyAddons({ consoleKey });
      await render();
      toast('Reset');
    } catch (e) {
      toast(e?.message || String(e));
    }
  });

  versionBadge?.addEventListener('click', async () => {
    openModal();
    setModalTab('changelog');
    await Promise.all([loadHostGit(), loadChangelog()]);
  });

  // Fill diagnostics
  if (diagConsole) diagConsole.textContent = consoleName;
  if (diagConsoleVersion) diagConsoleVersion.textContent = consoleVersion || '—';
  if (diagAssetVersion) diagAssetVersion.textContent = assetVersion || '—';
  if (diagHost) diagHost.textContent = window.location.host;

  // TLD Management
  const tldListEl = page.querySelector('#tldConsoleList');

  async function loadTLDConfig() {
    try {
      const response = await fetch('/api/network/master-config');
      if (!response.ok) throw new Error('Failed to load TLD config');
      return await response.json();
    } catch (error) {
      console.error('Error loading TLD config:', error);
      return null;
    }
  }

  async function renderTLDList() {
    if (!tldListEl) return;

    const config = await loadTLDConfig();
    if (!config?.consoles) {
      tldListEl.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;">Unable to load TLD configuration</div>';
      return;
    }

    tldListEl.innerHTML = Object.entries(config.consoles)
      .filter(([id, console]) => console.tld || (console.aliases && console.aliases.length > 0))
      .map(([id, console]) => `
        <div class="cn-setting-row" style="flex-direction:column;align-items:stretch;gap:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">${console.icon || '🖥️'}</span>
            <div style="flex:1;">
              <div class="cn-setting-title">${escapeHtml(console.name || id)}</div>
              <div class="cn-setting-desc">${escapeHtml(console.description || '')}</div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
            ${console.tld ? `
              <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border:1px solid var(--line);border-radius:6px;">
                <span style="font-size:12px;color:var(--muted);font-weight:600;">TLD:</span>
                <code style="flex:1;font-family:monospace;background:var(--card);padding:2px 6px;border-radius:4px;">${escapeHtml(console.tld)}</code>
                <button class="cn-settings-btn" style="padding:4px 8px;font-size:11px;" onclick="editTLD('${id}', 'tld', '${escapeAttr(console.tld)}')">✏️</button>
              </div>
            ` : ''}

            ${console.aliases && console.aliases.length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:12px;color:var(--muted);font-weight:600;">Aliases:</span>
                  <button class="cn-settings-btn" style="padding:4px 8px;font-size:11px;" onclick="addTLDAlias('${id}')">+ Add</button>
                </div>
                ${console.aliases.map(alias => `
                  <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg);border:1px solid var(--line);border-radius:4px;margin-left:20px;">
                    <code style="flex:1;font-family:monospace;font-size:12px;">${escapeHtml(alias)}</code>
                    <button class="cn-settings-btn danger" style="padding:2px 6px;font-size:10px;" onclick="removeTLDAlias('${id}', '${escapeAttr(alias)}')">🗑️</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border:1px solid var(--line);border-radius:6px;">
                <span style="font-size:12px;color:var(--muted);font-weight:600;">Aliases:</span>
                <span style="font-size:12px;color:var(--muted);">none</span>
                <button class="cn-settings-btn" style="padding:4px 8px;font-size:11px;" onclick="addTLDAlias('${id}')">+ Add</button>
              </div>
            `}
          </div>
        </div>
      `).join('') || '<div style="color:var(--muted);padding:20px;text-align:center;">No consoles have TLD assignments</div>';
  }

  // Make functions global for onclick handlers
  window.editTLD = async (consoleId, type, currentValue) => {
    const newValue = prompt(`${type.toUpperCase()} for ${consoleId}:`, currentValue);
    if (!newValue || newValue === currentValue) return;

    try {
      const response = await fetch('/api/network/tld-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consoleId, type, value: newValue })
      });

      if (!response.ok) throw new Error('Failed to update TLD');

      toast('TLD updated successfully');
      await renderTLDList();
    } catch (error) {
      toast(`Error: ${error.message}`);
    }
  };

  window.addTLDAlias = async (consoleId) => {
    const alias = prompt('New alias domain:');
    if (!alias) return;

    try {
      const response = await fetch('/api/network/tld-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consoleId, type: 'add-alias', value: alias })
      });

      if (!response.ok) throw new Error('Failed to add alias');

      toast('Alias added successfully');
      await renderTLDList();
    } catch (error) {
      toast(`Error: ${error.message}`);
    }
  };

  window.removeTLDAlias = async (consoleId, alias) => {
    if (!confirm(`Remove alias "${alias}" from ${consoleId}?`)) return;

    try {
      const response = await fetch('/api/network/tld-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consoleId, type: 'remove-alias', value: alias })
      });

      if (!response.ok) throw new Error('Failed to remove alias');

      toast('Alias removed successfully');
      await renderTLDList();
    } catch (error) {
      toast(`Error: ${error.message}`);
    }
  };

  // Load TLD list when TLD tab is activated
  const tldTab = page.querySelector('[data-tab="tld"]');
  if (tldTab) {
    const originalClick = tldTab.onclick;
    tldTab.addEventListener('click', async () => {
      if (originalClick) originalClick();
      setTimeout(() => renderTLDList(), 100); // Allow panel to show first
    });
  }

  // Default panel
  setActivePanel('addons');

  await render();
  await loadHostGit();
  return true;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}
