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

  // Generate anchor ID from heading text
  function generateAnchorId(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function renderToc() {
    if (!tocNav) return;

    const tocItems = headings.map((heading, index) => {
      const indent = '  '.repeat(Math.max(0, heading.level - 1));
      const icon = heading.level === 1 ? '📖' :
                   heading.level === 2 ? '📄' :
                   heading.level === 3 ? '📝' : '•';
      const classes = `cn-toc-item lvl-${heading.level}`;
      const anchorId = generateAnchorId(heading.text);

      return `${indent}<a href="#${anchorId}" class="${classes}" data-heading="${heading.text}" data-index="${index}" data-anchor="${anchorId}">
        <span class="cn-toc-icon">${icon}</span>
        <span class="cn-toc-text">${heading.text}</span>
      </a>`;
    }).join('\n');

    tocNav.innerHTML = tocItems;

    // Update total sections count
    if (totalSectionsEl) {
      totalSectionsEl.textContent = headings.length;
    }

    // Add click handlers for TOC items - smooth scroll to section
    tocNav.querySelectorAll('.cn-toc-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const headingText = item.dataset.heading;
        const index = parseInt(item.dataset.index);
        
        // Find all headings in the content
        const allHeadings = Array.from(readmeEl.querySelectorAll('h1, h2, h3'));
        
        // Try to find the matching heading by:
        // 1. First try by ID (using the markdown renderer's slugify)
        // 2. Then try by text content (strip the # from anchor)
        let matchingHeading = null;
        
        for (const h of allHeadings) {
          // Get text without the anchor # symbol
          const hText = h.textContent.replace(/^#\s*/, '').trim();
          
          if (hText.toLowerCase() === headingText.toLowerCase()) {
            matchingHeading = h;
            break;
          }
        }
        
        // Fallback: try by index
        if (!matchingHeading && allHeadings[index]) {
          matchingHeading = allHeadings[index];
        }
        
        if (matchingHeading) {
          // Smooth scroll to the heading with offset for sticky header
          const yOffset = -80;
          const y = matchingHeading.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          
          // Highlight the heading briefly
          matchingHeading.style.transition = 'background-color 0.3s ease';
          matchingHeading.style.backgroundColor = 'color-mix(in srgb, var(--brand) 20%, transparent)';
          setTimeout(() => {
            matchingHeading.style.backgroundColor = '';
          }, 1500);
        }
        
        // Update active state
        updateActiveTocItem(index);
      });
    });

    // Set up scroll listener for live tracking
    setupScrollTracking();
  }

  // Track which section is currently visible and update TOC
  function setupScrollTracking() {
    let ticking = false;
    const sidebar = page.querySelector('.cn-sidebar');
    const navBar = page.querySelector('.cn-nav-bar');
    const contentLayout = page.querySelector('.cn-content-layout');
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveTocFromScroll();
          
          // Make sidebar sticky after scrolling past the nav bar
          if (sidebar && navBar && contentLayout) {
            const navBarRect = navBar.getBoundingClientRect();
            const navBarBottom = navBarRect.bottom;
            const contentLayoutRect = contentLayout.getBoundingClientRect();
            
            if (navBarBottom <= 0) {
              // Nav bar is above viewport - make sidebar sticky
              if (!sidebar.classList.contains('is-sticky')) {
                sidebar.classList.add('is-sticky');
                contentLayout.classList.add('has-sticky-sidebar');
                
                // Position the sidebar relative to the content layout
                sidebar.style.left = `${contentLayoutRect.left}px`;
              }
            } else {
              // Nav bar is still visible - sidebar flows normally
              if (sidebar.classList.contains('is-sticky')) {
                sidebar.classList.remove('is-sticky');
                contentLayout.classList.remove('has-sticky-sidebar');
                sidebar.style.left = '';
              }
            }
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();
  }

  function updateActiveTocFromScroll() {
    if (!tocNav || !readmeEl) return;
    
    const allHeadings = Array.from(readmeEl.querySelectorAll('h1, h2, h3'));
    if (allHeadings.length === 0) return;
    
    const scrollPosition = window.scrollY + 150; // Offset for header
    
    let activeIndex = 0;
    
    for (let i = 0; i < allHeadings.length; i++) {
      const heading = allHeadings[i];
      const rect = heading.getBoundingClientRect();
      const elementTop = window.scrollY + rect.top;
      
      if (elementTop <= scrollPosition) {
        activeIndex = i;
      } else {
        break;
      }
    }
    
    updateActiveTocItem(activeIndex);
  }

  function updateActiveTocItem(activeIndex) {
    if (!tocNav) return;
    
    // Remove active class from all items
    tocNav.querySelectorAll('.cn-toc-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to current item
    const activeItem = tocNav.querySelector(`.cn-toc-item[data-index="${activeIndex}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      
      // Smooth scroll the TOC to keep active item visible
      const tocContainer = tocNav.parentElement;
      if (tocContainer) {
        const itemRect = activeItem.getBoundingClientRect();
        const containerRect = tocContainer.getBoundingClientRect();
        
        // Check if item is outside visible area
        if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }

  async function render() {
    const section = (pickEl?.value || '').trim();
    setSectionInUrl(section);

    try {
      const { mountMarkdown } = await import('/core/markdown.js');
      await mountMarkdown(readmeEl, md, {
        toc: false,
        tocMaxDepth: 3,
        layout: 'single',
        sectionHeading: section || undefined
      });
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
