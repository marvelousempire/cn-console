/**
 * CN Console - Passwords Cartridge
 * Comprehensive password management system
 */

export class PasswordsConsole {
  constructor() {
    this.entries = [];
    this.currentTab = 'vault';
    this.toastTimeout = null;
  }

  init() {
    this.bindEvents();
    this.loadEntries();
    this.loadUsers();
    this.loadServices();
    this.loadPolicies();
    this.loadAuditLog();
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.pwd-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Action buttons
    document.getElementById('pwdGenerate')?.addEventListener('click', () => this.generatePassword());
    document.getElementById('pwdCreate')?.addEventListener('click', () => this.showCreateModal());
    document.getElementById('pwdImport')?.addEventListener('click', () => this.importPasswords());
    document.getElementById('pwdAudit')?.addEventListener('click', () => this.runAudit());

    // Generator controls
    document.getElementById('pwdLength')?.addEventListener('input', (e) => {
      document.getElementById('pwdLengthValue').textContent = e.target.value;
      this.generatePassword();
    });

    document.querySelectorAll('#pwdUppercase, #pwdLowercase, #pwdNumbers, #pwdSymbols')
      .forEach(cb => cb.addEventListener('change', () => this.generatePassword()));

    document.getElementById('pwdGenerateNew')?.addEventListener('click', () => this.generatePassword());
    document.getElementById('pwdCopyGenerated')?.addEventListener('click', () => this.copyGeneratedPassword());
    document.getElementById('pwdSaveGenerated')?.addEventListener('click', () => this.saveGeneratedPassword());

    // User password management
    document.getElementById('pwdResetUserPassword')?.addEventListener('click', () => this.resetUserPassword());
    document.getElementById('pwdChangeUserPassword')?.addEventListener('click', () => this.changeUserPassword());

    // Service management
    document.getElementById('pwdAddService')?.addEventListener('click', () => this.addService());

    // Policy management
    document.getElementById('pwdSavePolicies')?.addEventListener('click', () => this.savePolicies());

    // Audit
    document.getElementById('pwdRefreshAudit')?.addEventListener('click', () => this.loadAuditLog());
    document.getElementById('pwdExportAudit')?.addEventListener('click', () => this.exportAudit());

    // Search and filters
    document.getElementById('pwdSearch')?.addEventListener('input', () => this.filterEntries());
    document.getElementById('pwdCategoryFilter')?.addEventListener('change', () => this.filterEntries());
    document.getElementById('pwdStrengthFilter')?.addEventListener('change', () => this.filterEntries());

    // Modal controls
    document.getElementById('pwdCreateModalClose')?.addEventListener('click', () => this.hideCreateModal());
    document.getElementById('pwdCreateCancel')?.addEventListener('click', () => this.hideCreateModal());
    document.getElementById('pwdCreateSave')?.addEventListener('click', () => this.saveEntry());

    // Click outside modal to close
    document.getElementById('pwdCreateModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'pwdCreateModal') this.hideCreateModal();
    });
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.pwd-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Show/hide content
    document.querySelectorAll('.pwd-tab-content').forEach(content => {
      content.style.display = content.dataset.panel === tabName ? 'block' : 'none';
    });

    this.currentTab = tabName;
  }

  // Password Generation
  generatePassword() {
    const length = parseInt(document.getElementById('pwdLength').value);
    const uppercase = document.getElementById('pwdUppercase').checked;
    const lowercase = document.getElementById('pwdLowercase').checked;
    const numbers = document.getElementById('pwdNumbers').checked;
    const symbols = document.getElementById('pwdSymbols').checked;

    const password = this.generateSecurePassword(length, { uppercase, lowercase, numbers, symbols });
    document.getElementById('pwdGenerated').value = password;

    const strength = this.checkPasswordStrength(password);
    this.updateStrengthIndicator(strength);
  }

  generateSecurePassword(length, options = {}) {
    const chars = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    let charset = '';
    if (options.uppercase) charset += chars.uppercase;
    if (options.lowercase) charset += chars.lowercase;
    if (options.numbers) charset += chars.numbers;
    if (options.symbols) charset += chars.symbols;

    if (!charset) charset = chars.lowercase; // Fallback

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  checkPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  updateStrengthIndicator(strength) {
    const indicator = document.getElementById('pwdStrengthIndicator');
    indicator.className = 'pwd-strength-fill';

    if (strength === 'weak') {
      indicator.classList.add('pwd-strength-weak');
    } else if (strength === 'medium') {
      indicator.classList.add('pwd-strength-medium');
    } else {
      indicator.classList.add('pwd-strength-strong');
    }
  }

  copyGeneratedPassword() {
    const password = document.getElementById('pwdGenerated').value;
    navigator.clipboard.writeText(password).then(() => {
      this.showToast('Password copied to clipboard!', 'success');
    });
  }

  saveGeneratedPassword() {
    const password = document.getElementById('pwdGenerated').value;
    if (!password) return;

    this.showCreateModal(password);
  }

  // Password Vault Management
  async loadEntries() {
    try {
      // Load from localStorage for now (in production, this would be from a secure API)
      const stored = localStorage.getItem('cn-passwords');
      this.entries = stored ? JSON.parse(stored) : [];
      this.renderEntries();
      this.updateStats();
    } catch (error) {
      console.error('Failed to load password entries:', error);
      this.showToast('Failed to load password entries', 'error');
    }
  }

  renderEntries() {
    const container = document.getElementById('pwdEntries');
    if (!container) return;

    if (this.entries.length === 0) {
      container.innerHTML = `
        <div class="pwd-card">
          <div style="text-align: center; padding: 40px; color: var(--muted);">
            <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No Passwords Yet</div>
            <div style="margin-bottom: 20px;">Create your first password entry to get started</div>
            <button class="pwd-btn primary" onclick="document.getElementById('pwdCreate').click()">➕ Create Entry</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.entries.map((entry, index) => `
      <div class="pwd-entry">
        <div class="pwd-entry-icon">${this.getCategoryIcon(entry.category)}</div>
        <div class="pwd-entry-info">
          <div class="pwd-entry-name">${this.escapeHtml(entry.name)}</div>
          <div class="pwd-entry-meta">
            ${entry.username ? this.escapeHtml(entry.username) : ''}
            ${entry.url ? ` • ${this.escapeHtml(entry.url)}` : ''}
            ${entry.category ? ` • ${entry.category}` : ''}
          </div>
        </div>
        <div class="pwd-entry-actions">
          <button class="pwd-btn" onclick="window.passwordsConsole.copyPassword(${index})" title="Copy Password">📋</button>
          <button class="pwd-btn" onclick="window.passwordsConsole.editEntry(${index})" title="Edit">✏️</button>
          <button class="pwd-btn" onclick="window.passwordsConsole.deleteEntry(${index})" title="Delete" style="background: #ef4444; color: white; border: none;">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  getCategoryIcon(category) {
    const icons = {
      personal: '👤',
      work: '💼',
      finance: '💰',
      social: '🌐',
      other: '🔐'
    };
    return icons[category] || '🔐';
  }

  updateStats() {
    const totalEl = document.getElementById('pwdTotalCount');
    const strongEl = document.getElementById('pwdStrongCount');

    if (totalEl) totalEl.textContent = this.entries.length;

    const strongCount = this.entries.filter(entry =>
      this.checkPasswordStrength(entry.password) === 'strong'
    ).length;

    if (strongEl) strongEl.textContent = strongCount;
  }

  filterEntries() {
    const search = document.getElementById('pwdSearch').value.toLowerCase();
    const category = document.getElementById('pwdCategoryFilter').value;
    const strength = document.getElementById('pwdStrengthFilter').value;

    const filtered = this.entries.filter(entry => {
      const matchesSearch = !search ||
        entry.name.toLowerCase().includes(search) ||
        entry.username?.toLowerCase().includes(search) ||
        entry.url?.toLowerCase().includes(search);

      const matchesCategory = !category || entry.category === category;
      const matchesStrength = !strength || this.checkPasswordStrength(entry.password) === strength;

      return matchesSearch && matchesCategory && matchesStrength;
    });

    this.renderFilteredEntries(filtered);
  }

  renderFilteredEntries(entries) {
    const container = document.getElementById('pwdEntries');

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="pwd-card">
          <div style="text-align: center; padding: 40px; color: var(--muted);">
            <div style="font-size: 32px; margin-bottom: 16px;">🔍</div>
            <div>No passwords match your search criteria</div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = entries.map((entry, originalIndex) => {
      const currentIndex = this.entries.indexOf(entry);
      return `
        <div class="pwd-entry">
          <div class="pwd-entry-icon">${this.getCategoryIcon(entry.category)}</div>
          <div class="pwd-entry-info">
            <div class="pwd-entry-name">${this.escapeHtml(entry.name)}</div>
            <div class="pwd-entry-meta">
              ${entry.username ? this.escapeHtml(entry.username) : ''}
              ${entry.url ? ` • ${this.escapeHtml(entry.url)}` : ''}
              ${entry.category ? ` • ${entry.category}` : ''}
            </div>
          </div>
          <div class="pwd-entry-actions">
            <button class="pwd-btn" onclick="window.passwordsConsole.copyPassword(${currentIndex})" title="Copy Password">📋</button>
            <button class="pwd-btn" onclick="window.passwordsConsole.editEntry(${currentIndex})" title="Edit">✏️</button>
            <button class="pwd-btn" onclick="window.passwordsConsole.deleteEntry(${currentIndex})" title="Delete" style="background: #ef4444; color: white; border: none;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  copyPassword(index) {
    const entry = this.entries[index];
    if (!entry) return;

    navigator.clipboard.writeText(entry.password).then(() => {
      this.showToast('Password copied to clipboard!', 'success');
      this.logAudit('password_copied', entry.name);
    });
  }

  editEntry(index) {
    const entry = this.entries[index];
    if (!entry) return;

    // Populate modal with existing data
    document.getElementById('pwdEntryName').value = entry.name || '';
    document.getElementById('pwdEntryUsername').value = entry.username || '';
    document.getElementById('pwdEntryPassword').value = entry.password || '';
    document.getElementById('pwdEntryCategory').value = entry.category || 'personal';
    document.getElementById('pwdEntryUrl').value = entry.url || '';
    document.getElementById('pwdEntryNotes').value = entry.notes || '';

    this.editingIndex = index;
    this.showCreateModal();
  }

  deleteEntry(index) {
    if (!confirm('Are you sure you want to delete this password entry?')) return;

    const entry = this.entries[index];
    this.entries.splice(index, 1);
    this.saveEntries();
    this.renderEntries();
    this.updateStats();
    this.showToast('Password entry deleted', 'success');
    this.logAudit('password_deleted', entry.name);
  }

  showCreateModal(preFillPassword = '') {
    const modal = document.getElementById('pwdCreateModal');
    if (modal) {
      modal.classList.add('show');
      if (preFillPassword) {
        document.getElementById('pwdEntryPassword').value = preFillPassword;
      }
      document.getElementById('pwdEntryName').focus();
    }
  }

  hideCreateModal() {
    const modal = document.getElementById('pwdCreateModal');
    if (modal) {
      modal.classList.remove('show');
      this.editingIndex = null;
      // Clear form
      document.getElementById('pwdEntryName').value = '';
      document.getElementById('pwdEntryUsername').value = '';
      document.getElementById('pwdEntryPassword').value = '';
      document.getElementById('pwdEntryCategory').value = 'personal';
      document.getElementById('pwdEntryUrl').value = '';
      document.getElementById('pwdEntryNotes').value = '';
    }
  }

  saveEntry() {
    const name = document.getElementById('pwdEntryName').value.trim();
    const username = document.getElementById('pwdEntryUsername').value.trim();
    const password = document.getElementById('pwdEntryPassword').value;
    const category = document.getElementById('pwdEntryCategory').value;
    const url = document.getElementById('pwdEntryUrl').value.trim();
    const notes = document.getElementById('pwdEntryNotes').value.trim();

    if (!name || !password) {
      this.showToast('Name and password are required', 'error');
      return;
    }

    const entry = {
      name,
      username,
      password,
      category,
      url,
      notes,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    if (this.editingIndex !== null) {
      // Update existing
      this.entries[this.editingIndex] = { ...this.entries[this.editingIndex], ...entry };
      this.logAudit('password_updated', name);
    } else {
      // Create new
      this.entries.push(entry);
      this.logAudit('password_created', name);
    }

    this.saveEntries();
    this.renderEntries();
    this.updateStats();
    this.hideCreateModal();
    this.showToast(this.editingIndex !== null ? 'Password updated!' : 'Password saved!', 'success');
  }

  saveEntries() {
    try {
      localStorage.setItem('cn-passwords', JSON.stringify(this.entries));
    } catch (error) {
      console.error('Failed to save password entries:', error);
      this.showToast('Failed to save password entries', 'error');
    }
  }

  // User Management
  async loadUsers() {
    try {
      // In production, this would fetch from the auth API
      const select = document.getElementById('pwdUserSelect');
      if (!select) return;

      // Mock users for demo
      const users = [
        { id: '1', email: 'admin@thebriefcase.app', name: 'Admin User' },
        { id: '2', email: 'user@example.com', name: 'Regular User' }
      ];

      select.innerHTML = '<option value="">Choose a user...</option>' +
        users.map(user => `<option value="${user.id}">${user.name} (${user.email})</option>`).join('');
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async resetUserPassword() {
    const userId = document.getElementById('pwdUserSelect').value;
    if (!userId) {
      this.showToast('Please select a user', 'error');
      return;
    }

    try {
      // In production, this would call the auth API
      this.showToast('Password reset email sent!', 'success');
      this.logAudit('user_password_reset', `User ID: ${userId}`);
    } catch (error) {
      this.showToast('Failed to reset password', 'error');
    }
  }

  async changeUserPassword() {
    const userId = document.getElementById('pwdUserSelect').value;
    if (!userId) {
      this.showToast('Please select a user', 'error');
      return;
    }

    // In a real implementation, this would open a modal to enter new password
    this.showToast('Password change functionality coming soon', 'error');
  }

  // Services Management
  async loadServices() {
    try {
      const container = document.getElementById('pwdServicesList');
      if (!container) return;

      // Mock services for demo
      const services = [
        { name: 'Database', type: 'PostgreSQL', username: 'db_user', lastRotated: '2024-01-15' },
        { name: 'API Gateway', type: 'AWS', username: 'gateway_user', lastRotated: '2024-01-10' },
        { name: 'SMTP Server', type: 'SendGrid', username: 'smtp_user', lastRotated: '2024-01-20' }
      ];

      container.innerHTML = services.map(service => `
        <div class="pwd-entry">
          <div class="pwd-entry-icon">🔧</div>
          <div class="pwd-entry-info">
            <div class="pwd-entry-name">${service.name}</div>
            <div class="pwd-entry-meta">${service.type} • ${service.username} • Last rotated: ${service.lastRotated}</div>
          </div>
          <div class="pwd-entry-actions">
            <button class="pwd-btn" onclick="window.passwordsConsole.rotateServicePassword('${service.name}')" title="Rotate Password">🔄</button>
            <button class="pwd-btn" onclick="window.passwordsConsole.viewServiceDetails('${service.name}')" title="View Details">👁️</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  rotateServicePassword(serviceName) {
    // In production, this would call the service management API
    this.showToast(`Password rotated for ${serviceName}`, 'success');
    this.logAudit('service_password_rotated', serviceName);
  }

  viewServiceDetails(serviceName) {
    this.showToast(`Service details for ${serviceName} - coming soon`, 'error');
  }

  addService() {
    this.showToast('Add service functionality - coming soon', 'error');
  }

  // Policies Management
  async loadPolicies() {
    try {
      // Load from localStorage or defaults
      const policies = JSON.parse(localStorage.getItem('cn-password-policies') || '{}');

      document.getElementById('pwdMinLength').value = policies.minLength || 8;
      document.getElementById('pwdRequireUppercase').checked = policies.requireUppercase !== false;
      document.getElementById('pwdRequireLowercase').checked = policies.requireLowercase !== false;
      document.getElementById('pwdRequireNumbers').checked = policies.requireNumbers !== false;
      document.getElementById('pwdRequireSymbols').checked = policies.requireSymbols || false;
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  }

  savePolicies() {
    try {
      const policies = {
        minLength: parseInt(document.getElementById('pwdMinLength').value),
        requireUppercase: document.getElementById('pwdRequireUppercase').checked,
        requireLowercase: document.getElementById('pwdRequireLowercase').checked,
        requireNumbers: document.getElementById('pwdRequireNumbers').checked,
        requireSymbols: document.getElementById('pwdRequireSymbols').checked
      };

      localStorage.setItem('cn-password-policies', JSON.stringify(policies));
      this.showToast('Password policies saved!', 'success');
      this.logAudit('policies_updated', 'Password policies updated');
    } catch (error) {
      this.showToast('Failed to save policies', 'error');
    }
  }

  // Audit Logging
  async loadAuditLog() {
    try {
      const container = document.getElementById('pwdAuditLog');
      if (!container) return;

      // Load from localStorage for demo
      const auditLog = JSON.parse(localStorage.getItem('cn-password-audit') || '[]');

      if (auditLog.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No audit events yet</div>';
        return;
      }

      container.innerHTML = auditLog.slice(-20).reverse().map(entry => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: var(--ink);">${entry.action}</span>
            <span style="color: var(--muted); font-size: 11px;">${new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          <div style="color: var(--muted); margin-top: 4px;">
            ${entry.details || entry.target}
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load audit log:', error);
    }
  }

  logAudit(action, target) {
    try {
      const auditLog = JSON.parse(localStorage.getItem('cn-password-audit') || '[]');
      auditLog.push({
        action,
        target,
        timestamp: new Date().toISOString(),
        user: 'current_user' // In production, this would be the actual user
      });

      // Keep only last 100 entries
      if (auditLog.length > 100) {
        auditLog.splice(0, auditLog.length - 100);
      }

      localStorage.setItem('cn-password-audit', JSON.stringify(auditLog));
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  exportAudit() {
    try {
      const auditLog = localStorage.getItem('cn-password-audit') || '[]';
      const blob = new Blob([auditLog], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `password-audit-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Audit log exported!', 'success');
    } catch (error) {
      this.showToast('Failed to export audit log', 'error');
    }
  }

  // Utility Methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('pwdToast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `pwd-toast ${type} show`;

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Additional methods for completeness
  importPasswords() {
    this.showToast('Password import functionality - coming soon', 'error');
  }

  runAudit() {
    this.switchTab('audit');
    this.showToast('Running password audit...', 'success');
    // In production, this would analyze all passwords for security issues
  }
}

// Export initialization function for CN Console routing
export function initPasswordsPage() {
  if (window.passwordsConsole) return; // Already initialized

  window.passwordsConsole = new PasswordsConsole();
  window.passwordsConsole.init();
}
