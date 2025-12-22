/**
 * CN Protocols page logic
 */

export async function initCNProtocols(root = document) {
  const page = root.querySelector('[data-cn-page="protocols"]');
  if (!page) return false;
  if (page.dataset.cnBound === '1') return true;
  page.dataset.cnBound = '1';

  const readmeEl = page.querySelector('#cnReadme');
  const tocNav = page.querySelector('#cnTocNav');
  const pickEl = page.querySelector('#cnSection');
  const searchEl = page.querySelector('#cnSectionSearch');
  const clearBtn = page.querySelector('#cnClear');
  const totalSectionsEl = page.querySelector('#cnTotalSections');

  let md = '';
  let headings = [];

  const safeText = (el, text) => { if (el) el.textContent = text; };

  function extractHeadings(markdown) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const out = [];
    for (const line of lines) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (!m) continue;
      const level = m[1].length;
      const text = (m[2] || '').trim();
      if (!text) continue;
      if (level <= 3) out.push({ level, text });
    }
    const seen = new Set();
    return out.filter((h) => {
      const key = h.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function renderOptions(filterText) {
    if (!pickEl) return;
    const q = (filterText || '').trim().toLowerCase();
    const filtered = headings.filter((h) => !q || h.text.toLowerCase().includes(q));
    const current = pickEl.value || '';

    pickEl.innerHTML = '<option value="">Full README</option>' + filtered.map((h) => (
      `<option value="${h.text}">${'—'.repeat(Math.max(0, h.level - 1))} ${h.text}</option>`
    )).join('');

    const exists = Array.from(pickEl.options).some((o) => o.value === current);
    if (exists) pickEl.value = current;
  }

  function getSectionFromUrl() {
    try {
      const url = new URL(window.location.href);
      return (url.searchParams.get('section') || '').trim();
    } catch {
      return '';
    }
  }

  function setSectionInUrl(value) {
    try {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set('section', value);
      else url.searchParams.delete('section');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  async function renderToc() {
    if (!tocNav) return;

    const tocItems = headings.map((heading, index) => {
      const indent = '  '.repeat(Math.max(0, heading.level - 1));
      const icon = heading.level === 1 ? '📖' :
                   heading.level === 2 ? '📄' :
                   heading.level === 3 ? '📝' : '•';
      const classes = `cn-toc-item lvl-${heading.level}`;

      return `${indent}<a href="#" class="${classes}" data-heading="${heading.text}" data-index="${index}">
        <span class="cn-toc-icon">${icon}</span>
        <span class="cn-toc-text">${heading.text}</span>
      </a>`;
    }).join('\n');

    tocNav.innerHTML = tocItems;

    // Update total sections count
    if (totalSectionsEl) {
      totalSectionsEl.textContent = headings.length;
    }

    // Add click handlers for TOC items
    tocNav.querySelectorAll('.cn-toc-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const headingText = item.dataset.heading;
        if (headingText && pickEl) {
          pickEl.value = headingText;
          render();
        }
      });
    });
  }

  async function render() {
    const section = (pickEl?.value || '').trim();
    setSectionInUrl(section);

    try {
      // Custom markdown rendering with section filtering
      const { markdownToHTML } = await import('/sites/learnmappers/js/markdown-to-html.js');
      let html = markdownToHTML(md);

      // If a specific section is selected, filter the content
      if (section) {
        const sectionRegex = new RegExp(`<h[1-3][^>]*>${escapeRegExp(section)}</h[1-3]>`, 'i');
        const match = html.match(sectionRegex);
        if (match) {
          const startIndex = html.indexOf(match[0]);
          let endIndex = html.length;

          // Find the next heading at the same level or higher
          const currentLevel = parseInt(match[0].match(/<h([1-3])/)[1]);
          const nextHeadingRegex = new RegExp(`<h[1-${currentLevel}][^>]*>.*?</h[1-${currentLevel}>`, 'gi');
          nextHeadingRegex.lastIndex = startIndex + match[0].length;

          const nextMatch = nextHeadingRegex.exec(html);
          if (nextMatch) {
            endIndex = nextMatch.index;
          }

          html = html.substring(startIndex, endIndex);
        }
      }

      // Add custom styling to the rendered content
      html = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '<h1 class="cn-content-title">$1</h1>');
      html = html.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '<h2 class="cn-section-title">$1</h2>');
      html = html.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '<h3 class="cn-subsection-title">$1</h3>');

      readmeEl.innerHTML = html;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      readmeEl.innerHTML = `<div class="cn-error-state">
        <h3>❌ Rendering Error</h3>
        <p>Failed to render the documentation content.</p>
        <details><summary>Technical Details</summary><pre>${error.message}</pre></details>
      </div>`;
    }
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async function init() {
    try {
      const r = await fetch('/api/cn/readme', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      md = await r.text();

      headings = extractHeadings(md);
      renderOptions('');
      renderToc();

      const urlSection = getSectionFromUrl();
      if (urlSection && pickEl) {
        if (!Array.from(pickEl.options).some((o) => o.value === urlSection)) {
          const opt = document.createElement('option');
          opt.value = urlSection;
          opt.textContent = urlSection;
          pickEl.appendChild(opt);
        }
        pickEl.value = urlSection;
      }

      pickEl?.addEventListener('change', render);
      searchEl?.addEventListener('input', () => renderOptions(searchEl.value));
      clearBtn?.addEventListener('click', () => {
        if (searchEl) searchEl.value = '';
        if (pickEl) pickEl.value = '';
        renderOptions('');
        render();
      });

      document.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === '/') {
          e.preventDefault();
          searchEl?.focus();
        }
      });

      await render();
    } catch (e) {
      safeText(readmeEl, `Failed to load CN README: ${e?.message || String(e)}`);
    }
  }

  await init();
  return true;
}
