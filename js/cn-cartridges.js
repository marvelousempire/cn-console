/**
 * CN Cartridges management page logic
 *
 * Purpose: Provide centralized management of all Console-Cartridges in the ecosystem
 * Features: View, configure, enable/disable, manage subdomains for all cartridges
 */

let cartridgeRegistry = [];
let cartridgeStats = {};

// Initialize cartridges management page
async function initCartridgesManagement() {
  console.log('[CN Cartridges] Initializing cartridge management...');

  try {
    // Load cartridge registry
    await loadCartridgeRegistry();

    // Load cartridge stats
    await loadCartridgeStats();

    // Render the management interface
    renderCartridgeManagement();

    // Setup event listeners
    setupCartridgeEventListeners();

    console.log('[CN Cartridges] Cartridge management initialized successfully');
  } catch (error) {
    console.error('[CN Cartridges] Initialization failed:', error);
    showCartridgeError('Failed to initialize cartridge management: ' + error.message);
  }
}

// Load cartridge registry from CN
async function loadCartridgeRegistry() {
  try {
    console.log('[CN Cartridges] Loading cartridge registry...');

    const response = await fetch('/api/cn/contributions');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    cartridgeRegistry = data.contributions || data || [];

    console.log(`[CN Cartridges] Loaded ${cartridgeRegistry.length} cartridges`);
  } catch (error) {
    console.warn('[CN Cartridges] Failed to load from API, trying local registry:', error);

    try {
      const response = await fetch('/ContributionNetwork/registry/cn-registry.json');
      if (response.ok) {
        const data = await response.json();
        cartridgeRegistry = data.contributions || [];
        console.log(`[CN Cartridges] Loaded ${cartridgeRegistry.length} cartridges from local registry`);
      } else {
        throw new Error('Local registry not found');
      }
    } catch (localError) {
      console.error('[CN Cartridges] Failed to load local registry:', localError);
      cartridgeRegistry = [];
    }
  }
}

// Load cartridge statistics
async function loadCartridgeStats() {
  try {
    cartridgeStats = {
      total: cartridgeRegistry.length,
      active: cartridgeRegistry.filter(c => c.active !== false).length,
      inactive: cartridgeRegistry.filter(c => c.active === false).length,
      byType: {},
      byStatus: { active: 0, inactive: 0, unknown: 0 }
    };

    // Count by type
    cartridgeRegistry.forEach(cartridge => {
      const type = cartridge.type || 'unknown';
      cartridgeStats.byType[type] = (cartridgeStats.byType[type] || 0) + 1;

      const status = cartridge.active === false ? 'inactive' : 'active';
      cartridgeStats.byStatus[status]++;
    });

    console.log('[CN Cartridges] Stats calculated:', cartridgeStats);
  } catch (error) {
    console.error('[CN Cartridges] Failed to calculate stats:', error);
  }
}

// Render the main cartridge management interface
function renderCartridgeManagement() {
  const container = document.querySelector('.cn-cartridge-grid');
  if (!container) {
    console.error('[CN Cartridges] Container not found');
    return;
  }

  // Update count badge
  const countEl = document.getElementById('cartridge-count');
  if (countEl) {
    countEl.textContent = `${cartridgeRegistry.length} cartridges`;
  }

  if (cartridgeRegistry.length === 0) {
    container.innerHTML = `
      <div class="cn-empty-state">
        <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No cartridges found</div>
        <div style="color: var(--muted);">Cartridges will appear here once registered in the CN.</div>
      </div>
    `;
    return;
  }

  // Render cartridge cards
  container.innerHTML = cartridgeRegistry.map(cartridge => renderCartridgeCard(cartridge)).join('');
}

// Render individual cartridge card
function renderCartridgeCard(cartridge) {
  const icon = getCartridgeIcon(cartridge.type);
  const status = cartridge.active !== false ? 'active' : 'inactive';
  const subdomain = getCartridgeSubdomain(cartridge);

  return `
    <div class="cn-cartridge-card" data-cartridge-id="${cartridge.id}">
      <div class="cn-cartridge-header">
        <div class="cn-cartridge-icon">${icon}</div>
        <div class="cn-cartridge-info">
          <h4>${escapeHtml(cartridge.name)}</h4>
          <div class="cn-cartridge-type">${cartridge.type}</div>
        </div>
      </div>

      <div class="cn-cartridge-description">
        ${escapeHtml(cartridge.description || cartridge.tagline || 'No description available')}
      </div>

      <div class="cn-cartridge-meta">
        <div class="cn-cartridge-meta-item">
          <span class="cn-cartridge-meta-label">Status</span>
          <span class="cn-cartridge-status cn-cartridge-status--${status}">
            ${status === 'active' ? '🟢 Active' : '🟡 Inactive'}
          </span>
        </div>
        <div class="cn-cartridge-meta-item">
          <span class="cn-cartridge-meta-label">Subdomain</span>
          <span class="cn-cartridge-meta-value">${subdomain}</span>
        </div>
      </div>

      <div class="cn-cartridge-actions">
        <button class="cn-btn cn-btn--small cn-btn--primary" onclick="openCartridge('${cartridge.id}')">
          <span>🚀</span> Open
        </button>
        <button class="cn-btn cn-btn--small cn-btn--secondary" onclick="configureCartridge('${cartridge.id}')">
          <span>⚙️</span> Configure
        </button>
        <button class="cn-btn cn-btn--small cn-btn--info" onclick="viewCartridgeDetails('${cartridge.id}')">
          <span>📋</span> Details
        </button>
      </div>
    </div>
  `;
}

// Get cartridge icon based on type
function getCartridgeIcon(type) {
  const icons = {
    'console-cartridge': '📦',
    'console': '🖥️',
    'cartridge': '🔧',
    'framework': '🏗️',
    'utility': '🛠️'
  };
  return icons[type] || '📦';
}

// Get cartridge subdomain
function getCartridgeSubdomain(cartridge) {
  if (cartridge.hosts && cartridge.hosts.length > 0) {
    return cartridge.hosts[0].replace('.thebriefcase.app', '');
  }
  if (cartridge.consoleId) {
    return cartridge.consoleId;
  }
  return cartridge.id || 'unknown';
}

// Setup event listeners
function setupCartridgeEventListeners() {
  // Add any additional event listeners here
  console.log('[CN Cartridges] Event listeners setup');
}

// Action handlers
function openCartridge(cartridgeId) {
  const cartridge = cartridgeRegistry.find(c => c.id === cartridgeId);
  if (!cartridge) {
    showCartridgeError('Cartridge not found');
    return;
  }

  const subdomain = getCartridgeSubdomain(cartridge);
  const url = `https://${subdomain}.thebriefcase.app`;
  window.open(url, '_blank');
}

function configureCartridge(cartridgeId) {
  const cartridge = cartridgeRegistry.find(c => c.id === cartridgeId);
  if (!cartridge) {
    showCartridgeError('Cartridge not found');
    return;
  }

  showCartridgeConfigModal(cartridge);
}

function viewCartridgeDetails(cartridgeId) {
  const cartridge = cartridgeRegistry.find(c => c.id === cartridgeId);
  if (!cartridge) {
    showCartridgeError('Cartridge not found');
    return;
  }

  showCartridgeDetailsModal(cartridge);
}

// Modal functions
function showCartridgeConfigModal(cartridge) {
  const modal = document.getElementById('cartridge-modal');
  const title = document.getElementById('cartridge-modal-title');
  const body = document.getElementById('cartridge-modal-body');

  if (!modal || !title || !body) return;

  title.textContent = `Configure ${cartridge.name}`;

  const subdomain = getCartridgeSubdomain(cartridge);

  body.innerHTML = `
    <form id="cartridge-config-form" onsubmit="saveCartridgeConfig(event, '${cartridge.id}')">
      <div class="cn-form-group">
        <label class="cn-form-label" for="cartridge-name">Name</label>
        <input type="text" id="cartridge-name" class="cn-form-input" value="${escapeHtml(cartridge.name)}" required>
      </div>

      <div class="cn-form-group">
        <label class="cn-form-label" for="cartridge-subdomain">Subdomain</label>
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="text" id="cartridge-subdomain" class="cn-form-input" value="${subdomain}" required>
          <span style="color: var(--muted);">.thebriefcase.app</span>
        </div>
      </div>

      <div class="cn-form-group">
        <label class="cn-form-label" for="cartridge-description">Description</label>
        <textarea id="cartridge-description" class="cn-form-input" rows="3">${escapeHtml(cartridge.description || '')}</textarea>
      </div>

      <div class="cn-form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="cartridge-active" ${cartridge.active !== false ? 'checked' : ''}>
          <span>Active</span>
        </label>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
        <button type="button" class="cn-btn cn-btn--secondary" onclick="closeCartridgeModal()">Cancel</button>
        <button type="submit" class="cn-btn cn-btn--primary">Save Changes</button>
      </div>
    </form>
  `;

  modal.style.display = 'flex';
}

function showCartridgeDetailsModal(cartridge) {
  const modal = document.getElementById('cartridge-modal');
  const title = document.getElementById('cartridge-modal-title');
  const body = document.getElementById('cartridge-modal-body');

  if (!modal || !title || !body) return;

  title.textContent = `${cartridge.name} Details`;

  const subdomain = getCartridgeSubdomain(cartridge);
  const status = cartridge.active !== false ? 'Active' : 'Inactive';

  body.innerHTML = `
    <div class="cartridge-details">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <strong>Type:</strong> ${cartridge.type}
        </div>
        <div>
          <strong>Status:</strong> ${status}
        </div>
        <div>
          <strong>ID:</strong> ${cartridge.id}
        </div>
        <div>
          <strong>Subdomain:</strong> ${subdomain}.thebriefcase.app
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <strong>Description:</strong>
        <p style="margin-top: 4px; color: var(--muted);">${escapeHtml(cartridge.description || 'No description available')}</p>
      </div>

      ${cartridge.tags ? `
        <div style="margin-bottom: 16px;">
          <strong>Tags:</strong>
          <div style="margin-top: 4px;">
            ${cartridge.tags.map(tag => `<span class="cn-badge cn-badge--info" style="margin-right: 4px;">${tag}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="cn-btn cn-btn--secondary" onclick="closeCartridgeModal()">Close</button>
        <button class="cn-btn cn-btn--primary" onclick="configureCartridge('${cartridge.id}')">Configure</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeCartridgeModal() {
  const modal = document.getElementById('cartridge-modal');
  if (modal) modal.style.display = 'none';
}

// Save configuration (in a real implementation, this would save to registry)
function saveCartridgeConfig(event, cartridgeId) {
  event.preventDefault();

  const form = event.target;
  const name = form.querySelector('#cartridge-name').value;
  const subdomain = form.querySelector('#cartridge-subdomain').value;
  const description = form.querySelector('#cartridge-description').value;
  const active = form.querySelector('#cartridge-active').checked;

  // In a real implementation, this would update the registry
  alert(`Configuration saved for ${name}!\n\nSubdomain: ${subdomain}.thebriefcase.app\nStatus: ${active ? 'Active' : 'Inactive'}`);

  closeCartridgeModal();
  refreshCartridges();
}

// Utility functions
async function refreshCartridges() {
  await loadCartridgeRegistry();
  await loadCartridgeStats();
  renderCartridgeManagement();
}

function scanForNewCartridges() {
  alert('Scanning for new cartridges...\n\nThis would check for new cartridges in the ecosystem and automatically register them in the CN registry.');
}

function showCartridgeStats() {
  const stats = cartridgeStats;
  let message = `Cartridge Statistics:\n\n`;
  message += `Total: ${stats.total}\n`;
  message += `Active: ${stats.active}\n`;
  message += `Inactive: ${stats.inactive}\n\n`;
  message += `By Status:\n`;
  message += `Active: ${stats.byStatus.active}\n`;
  message += `Inactive: ${stats.byStatus.inactive}\n\n`;
  message += `By Type:\n`;
  Object.entries(stats.byType).forEach(([type, count]) => {
    message += `${type}: ${count}\n`;
  });

  alert(message);
}

function showCartridgeError(message) {
  console.error('[CN Cartridges] Error:', message);
  alert(`Cartridge Management Error:\n\n${message}`);
}

// Utility functions
function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Export for global access
window.initCartridgesManagement = initCartridgesManagement;
window.refreshCartridges = refreshCartridges;
window.scanForNewCartridges = scanForNewCartridges;
window.showCartridgeStats = showCartridgeStats;
window.openCartridge = openCartridge;
window.configureCartridge = configureCartridge;
window.viewCartridgeDetails = viewCartridgeDetails;
window.closeCartridgeModal = closeCartridgeModal;
window.saveCartridgeConfig = saveCartridgeConfig;
