/**
 * CN Overview page logic
 */

export async function initCNOverview(root = document) {
  const page = root.querySelector('[data-cn-page="overview"]');
  if (!page) return false;
  if (page.dataset.cnBound === '1') return true;
  page.dataset.cnBound = '1';

  const countsEl = page.querySelector('#cnCounts');
  const simpleBtn = page.querySelector('#cnSimpleBtn');
  const advancedBtn = page.querySelector('#cnAdvancedBtn');
  const simpleEl = page.querySelector('#cnSimple');
  const advEl = page.querySelector('#cnAdvanced');
  const advMdEl = page.querySelector('#cnAdvancedMd');

  const safeText = (el, text) => { if (el) el.textContent = text; };

  function setMode(mode) {
    const isAdv = mode === 'advanced';
    simpleBtn?.classList.toggle('active', !isAdv);
    advancedBtn?.classList.toggle('active', isAdv);
    if (simpleEl) simpleEl.style.display = isAdv ? 'none' : '';
    if (advEl) advEl.style.display = isAdv ? '' : 'none';
  }

  simpleBtn?.addEventListener('click', () => setMode('simple'));
  advancedBtn?.addEventListener('click', () => setMode('advanced'));

  async function loadCounts() {
    if (!countsEl) return;
    try {
      const r = await fetch('/api/cn/contributions', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const items = data.contributions || [];

      const byType = items.reduce((acc, c) => {
        const t = c?.type ? String(c.type) : 'unknown';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

      const order = ['framework','admin-core','console','console-cartridge','cartridge','tool','system','handbook','framework-utility','unknown'];
      countsEl.innerHTML = order
        .filter((k) => byType[k])
        .map((k) => `<span class="cn-pill"><span class="k">${k}</span><span class="v">${byType[k]}</span></span>`)
        .join('') || 'No data';
    } catch (e) {
      safeText(countsEl, `Failed to load counts: ${e?.message || String(e)}`);
    }
  }

  async function loadReadmeSection() {
    if (!advMdEl) return;
    try {
      const r = await fetch('/api/cn/readme', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const md = await r.text();

      const { mountMarkdown } = await import('/core/markdown.js');
      mountMarkdown(advMdEl, md, { sectionHeading: 'Network Structure' });
    } catch (e) {
      safeText(advMdEl, `Failed to load README: ${e?.message || String(e)}`);
    }
  }

  setMode('simple');
  await Promise.all([loadCounts(), loadReadmeSection()]);
  return true;
}
