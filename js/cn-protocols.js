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
  const tocCount = page.querySelector('#cnTocCount');
  const pickEl = page.querySelector('#cnSection');
  const searchEl = page.querySelector('#cnSectionSearch');
  const clearBtn = page.querySelector('#cnClear');

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

  function generateTocHtml() {
    if (!tocNav || !headings.length) return;

    const tocItems = headings.map((heading, index) => {
      const indent = heading.level - 1;
      const icon = heading.level === 1 ? '📖' :
                   heading.level === 2 ? '📄' :
                   heading.level === 3 ? '📝' : '•';
      const classes = `cn-toc-item lvl-${heading.level}`;

      return `<a href="#" class="${classes}" data-heading="${heading.text}" data-index="${index}" style="padding-left: ${16 + indent * 16}px;">
        <span style="margin-right: 8px;">${icon}</span>
        <span>${heading.text}</span>
      </a>`;
    }).join('');

    tocNav.innerHTML = tocItems;

    // Update count
    if (tocCount) {
      tocCount.textContent = headings.length;
    }

    // Add click handlers
    tocNav.querySelectorAll('.cn-toc-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const headingText = item.dataset.heading;
        if (headingText && pickEl) {
          pickEl.value = headingText;
          render();
          // Scroll to the selected section
          setTimeout(() => {
            const headingElement = readmeEl.querySelector(`[data-md-anchor="${headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"]`);
            if (headingElement) {
              headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      });
    });
  }

  function updateActiveTocItem() {
    if (!tocNav) return;

    const headingsInContent = Array.from(readmeEl.querySelectorAll('h1, h2, h3'));
    const scrollPosition = window.scrollY + 100; // Offset for header

    let activeIndex = -1;
    for (let i = 0; i < headingsInContent.length; i++) {
      const heading = headingsInContent[i];
      const rect = heading.getBoundingClientRect();
      const elementTop = window.scrollY + rect.top;

      if (elementTop <= scrollPosition) {
        activeIndex = i;
      } else {
        break;
      }
    }

    // Remove active class from all items
    tocNav.querySelectorAll('.cn-toc-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to current item
    if (activeIndex >= 0) {
      const activeItem = tocNav.querySelector(`.cn-toc-item[data-index="${activeIndex}"]`);
      if (activeItem) {
        activeItem.classList.add('active');
        // Scroll TOC to keep active item visible
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  async function render() {
    const section = (pickEl?.value || '').trim();
    setSectionInUrl(section);

    const { mountMarkdown } = await import('/core/markdown.js');
    await mountMarkdown(readmeEl, md, { toc: false, tocMaxDepth: 3, layout: 'single', sectionHeading: section || undefined });

    // Generate our custom TOC after content is rendered
    generateTocHtml();

    // Set up scroll listener for active TOC highlighting
    const handleScroll = () => updateActiveTocItem();
    window.addEventListener('scroll', handleScroll);

    // Initial active state update
    setTimeout(updateActiveTocItem, 200);
  }

  async function init() {
    try {
      const r = await fetch('/api/cn/readme', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      md = await r.text();

      headings = extractHeadings(md);
      renderOptions('');
      generateTocHtml();

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
