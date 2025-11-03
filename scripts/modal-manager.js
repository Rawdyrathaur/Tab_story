/**
 * BrainMark - Modal Manager
 * Handles modal interactions and animations
 */

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.init();
  }

  init() {
    // Intent Modal
    this.intentModal = document.getElementById('intent-modal-backdrop');
    this.intentInput = document.getElementById('intent-input');
    this.intentSaveBtn = document.getElementById('intent-save-btn');
    this.intentSkipBtn = document.getElementById('intent-skip-btn');
    this.intentCloseBtn = document.getElementById('intent-modal-close');

    // Settings Modal
    this.settingsModal = document.getElementById('settings-modal-backdrop');
    this.settingsCloseBtn = document.getElementById('settings-modal-close');
    this.settingsCloseFooterBtn = document.getElementById('settings-close-btn');

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Intent Modal Events
    if (this.intentCloseBtn) {
      this.intentCloseBtn.addEventListener('click', () => this.closeIntentModal());
    }
    if (this.intentSkipBtn) {
      this.intentSkipBtn.addEventListener('click', () => this.closeIntentModal());
    }
    if (this.intentSaveBtn) {
      this.intentSaveBtn.addEventListener('click', () => this.handleIntentSave());
    }
    if (this.intentInput) {
      this.intentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleIntentSave();
        }
      });
    }

    // Recent intents chips
    const recentIntentsContainer = document.getElementById('recent-intents');
    if (recentIntentsContainer) {
      recentIntentsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
          this.intentInput.value = e.target.textContent;
          this.intentInput.focus();
        }
      });
    }

    // Settings Modal Events
    if (this.settingsCloseBtn) {
      this.settingsCloseBtn.addEventListener('click', () => this.closeSettingsModal());
    }
    if (this.settingsCloseFooterBtn) {
      this.settingsCloseFooterBtn.addEventListener('click', () => this.closeSettingsModal());
    }

    // Close modals on backdrop click
    if (this.intentModal) {
      this.intentModal.addEventListener('click', (e) => {
        if (e.target === this.intentModal) {
          this.closeIntentModal();
        }
      });
    }
    if (this.settingsModal) {
      this.settingsModal.addEventListener('click', (e) => {
        if (e.target === this.settingsModal) {
          this.closeSettingsModal();
        }
      });
    }

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeActiveModal();
      }
    });
  }

  /**
   * Show intent capture modal
   */
  showIntentModal(callback) {
    this.activeModal = 'intent';
    this.intentCallback = callback;

    if (this.intentModal) {
      this.intentModal.classList.add('active');
      this.intentInput.value = '';
      this.intentInput.focus();
    }
  }

  /**
   * Close intent modal
   */
  closeIntentModal() {
    if (this.intentModal) {
      this.intentModal.classList.remove('active');
      this.activeModal = null;
    }
  }

  /**
   * Handle intent save
   */
  async handleIntentSave() {
    const intent = this.intentInput.value.trim();

    if (!intent) {
      this.showToast('Please enter an intent', 'warning');
      return;
    }

    // Call the callback with the intent
    if (this.intentCallback) {
      await this.intentCallback(intent);
    }

    this.closeIntentModal();
    this.showToast('Intent saved successfully!', 'success');
  }

  /**
   * Show settings modal
   */
  async showSettingsModal(storageManager) {
    this.activeModal = 'settings';
    this.storageManager = storageManager;

    // Load current settings
    const settings = await storageManager.getSettings();
    this.loadSettings(settings);

    if (this.settingsModal) {
      this.settingsModal.classList.add('active');
    }

    // Setup settings event listeners
    this.setupSettingsListeners();
  }

  /**
   * Load settings into UI
   */
  loadSettings(settings) {
    document.getElementById('encrypt-data').checked = settings.encryptData || false;
    document.getElementById('auto-clear').checked = settings.autoClear || false;
    document.getElementById('dark-mode').checked = settings.darkMode || false;
    document.getElementById('compact-view').checked = settings.compactView || false;
  }

  /**
   * Setup settings listeners
   */
  setupSettingsListeners() {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode');
    darkModeToggle.addEventListener('change', (e) => {
      this.toggleDarkMode(e.target.checked);
    });

    // Compact view toggle
    const compactViewToggle = document.getElementById('compact-view');
    compactViewToggle.addEventListener('change', (e) => {
      this.toggleCompactView(e.target.checked);
    });

    // Export data button (removed from UI, keep handler for potential future use)
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => this.handleExportData());
    }

    // Clear data button
    const clearDataBtn = document.getElementById('clear-data-btn');
    clearDataBtn.addEventListener('click', () => this.handleClearData());

    // Report bug button
    const reportBugBtn = document.getElementById('report-bug-btn');
    reportBugBtn.addEventListener('click', () => {
      window.open('https://github.com/yourusername/tab-memory-assistant/issues', '_blank');
    });

    // Feedback button
    const feedbackBtn = document.getElementById('feedback-btn');
    feedbackBtn.addEventListener('click', () => {
      window.open('https://forms.gle/your-feedback-form', '_blank');
    });

    // Save all settings on any change
    const allToggles = this.settingsModal.querySelectorAll('input[type="checkbox"]');
    allToggles.forEach(toggle => {
      toggle.addEventListener('change', () => this.saveAllSettings());
    });
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(enabled) {
    if (enabled) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /**
   * Toggle compact view
   */
  toggleCompactView(enabled) {
    if (enabled) {
      document.documentElement.setAttribute('data-density', 'compact');
    } else {
      document.documentElement.removeAttribute('data-density');
    }
  }

  /**
   * Save all settings
   */
  async saveAllSettings() {
    if (!this.storageManager) return;

    const settings = {
      encryptData: document.getElementById('encrypt-data').checked,
      autoClear: document.getElementById('auto-clear').checked,
      darkMode: document.getElementById('dark-mode').checked,
      compactView: document.getElementById('compact-view').checked
    };

    await this.storageManager.saveSettings(settings);
  }

  /**
   * Handle export data
   */
  async handleExportData() {
    if (!this.storageManager) return;

    const result = await this.storageManager.exportData();
    if (result.success) {
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `tab-memory-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      URL.revokeObjectURL(url);
      this.showToast('Data exported successfully!', 'success');
    } else {
      this.showToast('Failed to export data', 'error');
    }
  }

  /**
   * Handle clear data
   */
  async handleClearData() {
    const confirmed = confirm('Are you sure you want to clear all data? This action cannot be undone.');

    if (confirmed && this.storageManager) {
      const result = await this.storageManager.clearAllData();
      if (result.success) {
        this.showToast('All data cleared', 'success');
        this.closeSettingsModal();
        // Reload the page to show empty state
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast('Failed to clear data', 'error');
      }
    }
  }

  /**
   * Close settings modal
   */
  closeSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.remove('active');
      this.activeModal = null;
    }
  }

  /**
   * Close active modal
   */
  closeActiveModal() {
    if (this.activeModal === 'intent') {
      this.closeIntentModal();
    } else if (this.activeModal === 'settings') {
      this.closeSettingsModal();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-up`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /**
   * Show confirmation dialog
   */
  showConfirmDialog(message, onConfirm) {
    const confirmed = confirm(message);
    if (confirmed && onConfirm) {
      onConfirm();
    }
  }

}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ModalManager = ModalManager;
}
