/**
 * Tab Story - Modal Manager
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

    // Load storage usage
    await this.loadStorageUsage();

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
    document.getElementById('dark-mode').checked = settings.darkMode || false;
    document.getElementById('compact-view').checked = settings.compactView || false;
  }

  /**
   * Setup settings listeners
   */
  setupSettingsListeners() {
    // Skip if already set up
    if (this._settingsListenersSetup) {
      return;
    }
    this._settingsListenersSetup = true;

    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode');
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', (e) => {
        this.toggleDarkMode(e.target.checked);
      });
    }

    // Compact view toggle
    const compactViewToggle = document.getElementById('compact-view');
    if (compactViewToggle) {
      compactViewToggle.addEventListener('change', (e) => {
        this.toggleCompactView(e.target.checked);
      });
    }

    // Export data button (removed from UI, keep handler for potential future use)
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => this.handleExportData());
    }

    // Clear data button
    const clearDataBtn = document.getElementById('clear-data-btn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => this.handleClearData());
    }

    // Report bug button
    const reportBugBtn = document.getElementById('report-bug-btn');
    if (reportBugBtn) {
      reportBugBtn.addEventListener('click', () => {
        window.open('https://github.com/Rawdyrathaur/Tab_story/issues/new', '_blank');
      });
    }

    // GitHub Star button
    const githubStarBtn = document.getElementById('github-star-btn');
    if (githubStarBtn) {
      githubStarBtn.addEventListener('click', () => {
        window.open('https://github.com/Rawdyrathaur/Tab_story', '_blank');
      });
    }

    // Save all settings on any change
    const allToggles = this.settingsModal.querySelectorAll('input[type="checkbox"]');
    allToggles.forEach(toggle => {
      toggle.addEventListener('change', () => this.saveAllSettings());
    });

    // Storage action buttons
    const refreshStorageBtn = document.getElementById('refresh-storage-btn');
    if (refreshStorageBtn) {
      refreshStorageBtn.addEventListener('click', async () => {
        await this.loadStorageUsage();
        this.showToast('Storage refreshed', 'success');
      });
    }

    const cleanupSnapshotsBtn = document.getElementById('cleanup-snapshots-btn');
    if (cleanupSnapshotsBtn) {
      cleanupSnapshotsBtn.addEventListener('click', () => this.handleCleanupSnapshots());
    }

    const cleanupRemovedTabsBtn = document.getElementById('cleanup-removed-tabs-btn');
    if (cleanupRemovedTabsBtn) {
      cleanupRemovedTabsBtn.addEventListener('click', () => this.handleCleanupRemovedTabs());
    }
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
  showConfirmDialog(options) {
    // Support both old and new signature
    if (typeof options === 'string') {
      const confirmed = confirm(options);
      if (confirmed && arguments[1]) {
        arguments[1]();
      }
      return;
    }

    const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, icon } = options;

    // Create custom confirm modal with enhanced design
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';

    const iconHtml = icon ? `
      <div class="confirm-icon">
        <span class="material-symbols-outlined">${icon}</span>
      </div>
    ` : '';

    backdrop.innerHTML = `
      <div class="modal confirm-dialog animate-slide-up" style="max-width: 360px; width: 90%;">
        ${iconHtml}
        <div class="modal-header" style="border-bottom: none; padding: ${icon ? '32px 24px 12px' : '20px 24px 12px'};">
          <h2 class="modal-title" style="font-size: 18px; font-weight: 600; margin: 0; width: 100%; text-align: center;">${title || 'Confirm'}</h2>
        </div>
        <div class="modal-body" style="padding: 0 24px 20px;">
          <p style="color: var(--color-text-secondary); line-height: 1.5; font-size: 13px; margin: 0;">${message}</p>
        </div>
        <div class="modal-footer" style="gap: 8px; padding: 12px 24px 20px; border-top: none; display: flex; flex-direction: row;">
          <button class="btn btn-text confirm-cancel-btn" style="flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 500;">${cancelText}</button>
          <button class="btn btn-primary confirm-ok-btn" style="flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 500;">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const cancelBtn = backdrop.querySelector('.confirm-cancel-btn');
    const okBtn = backdrop.querySelector('.confirm-ok-btn');

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 300);
    };

    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      cleanup();
    });

    okBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm();
      cleanup();
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        if (onCancel) onCancel();
        cleanup();
      }
    });
  }

  /**
   * Load and display storage usage
   */
  async loadStorageUsage() {
    if (!this.storageManager) return;

    const result = await this.storageManager.getStorageUsage();
    if (!result.success) {
      console.error('Failed to load storage usage');
      return;
    }

    const { usage } = result;

    // Update storage overview cards
    document.getElementById('storage-total').textContent = `${usage.totalMB} MB`;
    document.getElementById('storage-percentage').textContent = `${usage.quotaPercentage.toFixed(1)}% of ${usage.quotaMB} MB`;

    document.getElementById('storage-project-count').textContent = usage.projectCount;
    document.getElementById('storage-project-size').textContent = `${(usage.projects / (1024 * 1024)).toFixed(2)} MB`;

    document.getElementById('storage-snapshot-count').textContent = usage.snapshotCount;
    document.getElementById('storage-snapshot-size').textContent = `${(usage.snapshots / (1024 * 1024)).toFixed(2)} MB`;

    // Update storage bar
    const storageBar = document.getElementById('storage-bar-fill');
    const storageStatusText = document.getElementById('storage-status-text');

    storageBar.style.width = `${Math.min(usage.quotaPercentage, 100)}%`;
    storageBar.style.background = usage.statusColor;
    storageStatusText.textContent = `${usage.statusText} - ${usage.totalMB} MB used`;
    storageStatusText.style.color = usage.statusColor;

    // Update breakdown
    document.getElementById('breakdown-projects').textContent = `${usage.breakdown.projects}%`;
    document.getElementById('breakdown-snapshots').textContent = `${usage.breakdown.snapshots}%`;
    document.getElementById('breakdown-other').textContent = `${(parseFloat(usage.breakdown.settings) + parseFloat(usage.breakdown.intents) + parseFloat(usage.breakdown.other)).toFixed(1)}%`;

    // Update footer indicator
    const storageUsageText = document.getElementById('storage-usage-text');
    if (storageUsageText) {
      storageUsageText.textContent = `${usage.totalMB} MB`;
      storageUsageText.style.color = usage.quotaPercentage > 75 ? usage.statusColor : 'inherit';
    }

    // Load recommendations
    await this.loadStorageRecommendations();
  }

  /**
   * Load storage recommendations
   */
  async loadStorageRecommendations() {
    if (!this.storageManager) return;

    const recommendations = await this.storageManager.getStorageRecommendations();
    const container = document.getElementById('storage-recommendations');

    if (recommendations.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--color-text-primary);">
        Recommendations
      </h4>
      ${recommendations.map(rec => `
        <div class="recommendation-item recommendation-${rec.type}">
          <div class="recommendation-icon">
            <span class="material-symbols-outlined">${
              rec.type === 'error' ? 'error' :
              rec.type === 'warning' ? 'warning' :
              'info'
            }</span>
          </div>
          <div class="recommendation-content">
            <div class="recommendation-message">${rec.message}</div>
            <div class="recommendation-action">${rec.action} • Impact: ${rec.impact}</div>
          </div>
        </div>
      `).join('')}
    `;
  }

  /**
   * Handle cleanup snapshots
   */
  async handleCleanupSnapshots() {
    const result = await this.storageManager.cleanupOldSnapshots(5);

    if (result.success) {
      this.showToast(`Deleted ${result.deletedCount} old backup${result.deletedCount !== 1 ? 's' : ''}`, 'success');
      await this.loadStorageUsage();

      // Update the app's storage indicator if available
      if (window.app && window.app.updateStorageIndicator) {
        await window.app.updateStorageIndicator();
      }
    } else {
      this.showToast('Failed to cleanup backups', 'error');
    }
  }

  /**
   * Handle cleanup removed tabs
   */
  async handleCleanupRemovedTabs() {
    const result = await this.storageManager.permanentlyDeleteRemovedTabs();

    if (result.success) {
      this.showToast(`Permanently deleted ${result.deletedCount} removed tab${result.deletedCount !== 1 ? 's' : ''}`, 'success');
      await this.loadStorageUsage();

      // Reload projects if app exists
      if (window.app) {
        await window.app.tabManager.loadProjects();
        window.app.tabManager.renderProjects();
        await window.app.updateStorageIndicator();
      }
    } else {
      this.showToast('Failed to cleanup removed tabs', 'error');
    }
  }

  /**
   * Show session restore modal with list of snapshots
   */
  async showSessionRestoreModal(storageManager) {
    const snapshots = await storageManager.getSessionSnapshots();

    if (snapshots.length === 0) {
      this.showToast('No session backups found', 'info');
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop active';
    backdrop.innerHTML = `
      <div class="modal animate-slide-up" style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">Restore Session</h2>
          <button class="modal-close" id="session-restore-modal-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
          <p style="margin-bottom: 16px; color: var(--color-text-secondary);">
            Select a session backup to restore:
          </p>
          <div class="session-list">
            ${snapshots.map((snapshot, index) => {
              const date = new Date(snapshot.timestamp);
              const typeLabel = snapshot.type === 'auto' ? 'Auto' : snapshot.type === 'manual' ? 'Manual' : 'Pre-Close';
              const typeClass = snapshot.type === 'auto' ? 'info' : snapshot.type === 'manual' ? 'success' : 'warning';

              return `
                <div class="session-item" data-snapshot-id="${snapshot.id}">
                  <div class="session-item-header">
                    <div class="session-item-info">
                      <div class="session-item-date">${date.toLocaleString()}</div>
                      <div class="session-item-meta">
                        <span class="chip chip-${typeClass}">${typeLabel}</span>
                        <span>${snapshot.tabCount} tabs</span>
                        <span>${snapshot.projectCount} groups</span>
                      </div>
                    </div>
                    <button class="btn btn-primary btn-sm restore-snapshot-btn" data-snapshot-id="${snapshot.id}">
                      <span class="material-symbols-outlined">restore</span>
                      Restore
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-text" id="session-restore-cancel">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeBtn = backdrop.querySelector('#session-restore-modal-close');
    const cancelBtn = backdrop.querySelector('#session-restore-cancel');

    const cleanup = () => {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 300);
    };

    closeBtn.addEventListener('click', cleanup);
    cancelBtn.addEventListener('click', cleanup);

    // Handle restore button clicks
    const restoreBtns = backdrop.querySelectorAll('.restore-snapshot-btn');
    restoreBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const snapshotId = btn.dataset.snapshotId;
        const result = await storageManager.restoreSession(snapshotId);

        if (result.success) {
          this.showToast(`Session restored: ${result.snapshot.tabCount} tabs`, 'success');
          cleanup();

          // Reload the page to reflect changes
          window.location.reload();
        } else {
          this.showToast('Failed to restore session', 'error');
        }
      });
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup();
    });
  }

}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ModalManager = ModalManager;
}
