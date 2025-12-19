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
