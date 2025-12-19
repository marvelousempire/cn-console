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

  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1800);
  };

  const { listAddons, getEnabledAddons, toggleAddon, applyAddons } = await import('/modules/js/console-addons.js');

  const consoleKey = (window.Sunday?.config?.name || 'Console').toLowerCase().replace(/\s+/g, '-');

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

  page.querySelector('#cnApplyAddons')?.addEventListener('click', async () => {
    await applyAddons({ consoleKey });
    toast('Applied');
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

  await render();
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
