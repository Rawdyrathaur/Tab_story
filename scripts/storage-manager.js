/**
 * Tab Story - Storage Manager
 * Handles Chrome Storage API interactions
 */

class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
    this.STORAGE_KEYS = {
      PROJECTS: 'tab_projects',
      TABS: 'tab_items',
      SETTINGS: 'user_settings',
      INTENTS: 'recent_intents',
      TIMELINE: 'tab_timeline',
      SESSION_SNAPSHOTS: 'session_snapshots',
      LAST_SESSION: 'last_session',
      SESSION_STATE: 'session_state'
    };

    // Auto-backup every 5 minutes
    this.setupAutoBackup();
  }

  /**
   * Save project groups
   */
  async saveProjects(projects) {
    try {
      await this.storage.set({ [this.STORAGE_KEYS.PROJECTS]: projects });
      return { success: true };
    } catch (error) {
      console.error('Failed to save projects:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all projects
   */
  async getProjects() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.PROJECTS);
      return result[this.STORAGE_KEYS.PROJECTS] || this.getDefaultProjects();
    } catch (error) {
      console.error('Failed to get projects:', error);
      return this.getDefaultProjects();
    }
  }

  /**
   * Get default projects - empty for fresh start
   */
  getDefaultProjects() {
    return [];
  }

  /**
   * Add new project
   */
  async addProject(projectData) {
    try {
      const projects = await this.getProjects();
      const newProject = {
        id: Date.now().toString(),
        ...projectData,
        createdAt: new Date().toISOString(),
        tabs: projectData.tabs || []
      };
      projects.push(newProject);
      await this.saveProjects(projects);
      return { success: true, project: newProject };
    } catch (error) {
      console.error('Failed to add project:', error);
      return { success: false, error };
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId, updates) {
    try {
      const projects = await this.getProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        projects[projectIndex] = { ...projects[projectIndex], ...updates };
        await this.saveProjects(projects);
        return { success: true, project: projects[projectIndex] };
      }
      return { success: false, error: 'Project not found' };
    } catch (error) {
      console.error('Failed to update project:', error);
      return { success: false, error };
    }
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    try {
      let projects = await this.getProjects();
      projects = projects.filter(p => p.id !== projectId);
      await this.saveProjects(projects);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete project:', error);
      return { success: false, error };
    }
  }

  /**
   * Add tab to project
   */
  async addTabToProject(projectId, tabData) {
    try {
      const projects = await this.getProjects();
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const newTab = {
          id: Date.now().toString(),
          ...tabData,
          timestamp: new Date().toISOString()
        };
        project.tabs.push(newTab);
        await this.saveProjects(projects);
        return { success: true, tab: newTab };
      }
      return { success: false, error: 'Project not found' };
    } catch (error) {
      console.error('Failed to add tab:', error);
      return { success: false, error };
    }
  }

  /**
   * Remove tab from project (mark as removed for undo)
   */
  async removeTabFromProject(projectId, tabId) {
    try {
      const projects = await this.getProjects();
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const tab = project.tabs.find(t => t.id === tabId);
        if (tab) {
          // Mark as removed instead of deleting
          tab.removed = true;
          tab.removedAt = new Date().toISOString();
          await this.saveProjects(projects);
          return { success: true, tab };
        }
      }
      return { success: false, error: 'Project or tab not found' };
    } catch (error) {
      console.error('Failed to remove tab:', error);
      return { success: false, error };
    }
  }

  /**
   * Undo remove tab
   */
  async undoRemoveTab(projectId, tabId) {
    try {
      const projects = await this.getProjects();
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const tab = project.tabs.find(t => t.id === tabId);
        if (tab && tab.removed) {
          // Restore the tab
          delete tab.removed;
          delete tab.removedAt;
          await this.saveProjects(projects);
          return { success: true };
        }
      }
      return { success: false, error: 'Tab not found or not removed' };
    } catch (error) {
      console.error('Failed to undo remove tab:', error);
      return { success: false, error };
    }
  }

  /**
   * Permanently delete removed tabs older than 30 days and remove empty projects
   */
  async cleanupRemovedTabs() {
    try {
      let projects = await this.getProjects();
      let changed = false;

      // Remove old deleted tabs (older than 30 days)
      projects.forEach(project => {
        const originalLength = project.tabs.length;
        project.tabs = project.tabs.filter(tab => {
          if (!tab.removed) return true;
          const removedTime = new Date(tab.removedAt);
          const now = new Date();
          const diffDays = (now - removedTime) / (1000 * 60 * 60 * 24);
          return diffDays < 30; // Keep removed tabs for 30 days (visible in timeline)
        });
        if (project.tabs.length !== originalLength) {
          changed = true;
        }
      });

      // Remove empty projects (no tabs or all tabs removed)
      const originalProjectCount = projects.length;
      projects = projects.filter(project => {
        const activeTabs = project.tabs.filter(tab => !tab.removed);
        return activeTabs.length > 0; // Keep only projects with active tabs
      });

      if (projects.length !== originalProjectCount) {
        changed = true;
      }

      if (changed) {
        await this.saveProjects(projects);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to cleanup removed tabs:', error);
      return { success: false, error };
    }
  }

  /**
   * Save settings
   */
  async saveSettings(settings) {
    try {
      await this.storage.set({ [this.STORAGE_KEYS.SETTINGS]: settings });
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      return { success: false, error };
    }
  }

  /**
   * Get settings
   */
  async getSettings() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.SETTINGS);
      return result[this.STORAGE_KEYS.SETTINGS] || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      darkMode: false,
      compactView: false
    };
  }

  /**
   * Save recent intents
   */
  async saveRecentIntents(intents) {
    try {
      await this.storage.set({ [this.STORAGE_KEYS.INTENTS]: intents });
      return { success: true };
    } catch (error) {
      console.error('Failed to save intents:', error);
      return { success: false, error };
    }
  }

  /**
   * Get recent intents
   */
  async getRecentIntents() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.INTENTS);
      return result[this.STORAGE_KEYS.INTENTS] || [];
    } catch (error) {
      console.error('Failed to get intents:', error);
      return [];
    }
  }

  /**
   * Add intent to recent list
   */
  async addRecentIntent(intent) {
    try {
      const intents = await this.getRecentIntents();
      if (!intents.includes(intent)) {
        intents.unshift(intent);
        if (intents.length > 10) {
          intents.pop();
        }
        await this.saveRecentIntents(intents);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to add intent:', error);
      return { success: false, error };
    }
  }

  /**
   * Clear all projects and tabs data (but keep settings)
   */
  async clearAllData() {
    try {
      // Clear only projects, tabs, and timeline - keep settings and intents
      await this.storage.remove([
        this.STORAGE_KEYS.PROJECTS,
        this.STORAGE_KEYS.TABS,
        this.STORAGE_KEYS.TIMELINE
      ]);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear data:', error);
      return { success: false, error };
    }
  }

  /**
   * Export all data
   */
  async exportData() {
    try {
      const result = await this.storage.get(null);
      return {
        success: true,
        data: result,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, error };
    }
  }

  /**
   * Import data
   */
  async importData(data) {
    try {
      await this.storage.set(data);
      return { success: true };
    } catch (error) {
      console.error('Failed to import data:', error);
      return { success: false, error };
    }
  }

  // ==================== SESSION BACKUP & RESTORE ====================

  /**
   * Setup auto-backup every 5 minutes
   */
  setupAutoBackup() {
    // Backup immediately on startup
    this.createSessionSnapshot('auto');

    // Then backup every 5 minutes
    setInterval(() => {
      this.createSessionSnapshot('auto');
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Create a session snapshot
   */
  async createSessionSnapshot(type = 'manual') {
    try {
      const projects = await this.getProjects();

      // Don't backup if there's no data
      if (projects.length === 0) {
        return { success: false, message: 'No data to backup' };
      }

      const snapshot = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type, // 'manual', 'auto', or 'pre-close'
        projects: JSON.parse(JSON.stringify(projects)), // Deep copy
        tabCount: projects.reduce((sum, p) => sum + (p.tabs?.filter(t => !t.removed).length || 0), 0),
        projectCount: projects.length
      };

      // Get existing snapshots
      const snapshots = await this.getSessionSnapshots();

      // Add new snapshot at the beginning
      snapshots.unshift(snapshot);

      // Keep only last 10 snapshots
      const limitedSnapshots = snapshots.slice(0, 10);

      await this.storage.set({
        [this.STORAGE_KEYS.SESSION_SNAPSHOTS]: limitedSnapshots,
        [this.STORAGE_KEYS.LAST_SESSION]: snapshot
      });

      return { success: true, snapshot };
    } catch (error) {
      console.error('Failed to create session snapshot:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all session snapshots
   */
  async getSessionSnapshots() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.SESSION_SNAPSHOTS);
      return result[this.STORAGE_KEYS.SESSION_SNAPSHOTS] || [];
    } catch (error) {
      console.error('Failed to get session snapshots:', error);
      return [];
    }
  }

  /**
   * Get last session (for crash recovery)
   */
  async getLastSession() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.LAST_SESSION);
      return result[this.STORAGE_KEYS.LAST_SESSION] || null;
    } catch (error) {
      console.error('Failed to get last session:', error);
      return null;
    }
  }

  /**
   * Restore session from snapshot
   */
  async restoreSession(snapshotId) {
    try {
      const snapshots = await this.getSessionSnapshots();
      const snapshot = snapshots.find(s => s.id === snapshotId);

      if (!snapshot) {
        return { success: false, error: 'Snapshot not found' };
      }

      // Restore the projects from snapshot
      await this.saveProjects(snapshot.projects);

      return { success: true, snapshot };
    } catch (error) {
      console.error('Failed to restore session:', error);
      return { success: false, error };
    }
  }

  /**
   * Delete a specific snapshot
   */
  async deleteSnapshot(snapshotId) {
    try {
      let snapshots = await this.getSessionSnapshots();
      snapshots = snapshots.filter(s => s.id !== snapshotId);
      await this.storage.set({ [this.STORAGE_KEYS.SESSION_SNAPSHOTS]: snapshots });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      return { success: false, error };
    }
  }

  /**
   * Mark session as active (for crash detection)
   */
  async markSessionActive() {
    try {
      await this.storage.set({
        [this.STORAGE_KEYS.SESSION_STATE]: {
          active: true,
          lastUpdate: new Date().toISOString()
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to mark session active:', error);
      return { success: false, error };
    }
  }

  /**
   * Mark session as closed normally
   */
  async markSessionClosed() {
    try {
      await this.storage.set({
        [this.STORAGE_KEYS.SESSION_STATE]: {
          active: false,
          lastUpdate: new Date().toISOString(),
          closedNormally: true
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to mark session closed:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if previous session crashed (didn't close normally)
   */
  async checkPreviousSessionCrashed() {
    try {
      const result = await this.storage.get(this.STORAGE_KEYS.SESSION_STATE);
      const sessionState = result[this.STORAGE_KEYS.SESSION_STATE];

      // If session was active but didn't close normally, it crashed
      if (sessionState && sessionState.active && !sessionState.closedNormally) {
        return { crashed: true, lastUpdate: sessionState.lastUpdate };
      }

      return { crashed: false };
    } catch (error) {
      console.error('Failed to check session state:', error);
      return { crashed: false };
    }
  }

  // ==================== STORAGE USAGE & MEMORY MANAGEMENT ====================

  /**
   * Calculate size of an object in bytes
   */
  calculateObjectSize(obj) {
    const jsonString = JSON.stringify(obj);
    return new Blob([jsonString]).size;
  }

  /**
   * Get detailed storage usage statistics
   */
  async getStorageUsage() {
    try {
      // Get all storage data
      const allData = await this.storage.get(null);

      // Calculate size for each category
      const projects = allData[this.STORAGE_KEYS.PROJECTS] || [];
      const snapshots = allData[this.STORAGE_KEYS.SESSION_SNAPSHOTS] || [];
      const settings = allData[this.STORAGE_KEYS.SETTINGS] || {};
      const intents = allData[this.STORAGE_KEYS.INTENTS] || [];

      const usage = {
        // Category sizes in bytes
        projects: this.calculateObjectSize(projects),
        snapshots: this.calculateObjectSize(snapshots),
        settings: this.calculateObjectSize(settings),
        intents: this.calculateObjectSize(intents),
        other: 0,
        total: 0,

        // Counts
        projectCount: projects.length,
        snapshotCount: snapshots.length,
        tabCount: projects.reduce((sum, p) => sum + (p.tabs?.filter(t => !t.removed).length || 0), 0),
        totalTabCount: projects.reduce((sum, p) => sum + (p.tabs?.length || 0), 0),

        // Chrome storage quota (5MB for local storage, but we'll be conservative)
        quota: 5 * 1024 * 1024, // 5MB in bytes
        quotaUsed: 0,
        quotaPercentage: 0,

        // Human readable
        totalMB: 0,
        quotaMB: 5
      };

      // Calculate other storage
      const otherKeys = Object.keys(allData).filter(key =>
        key !== this.STORAGE_KEYS.PROJECTS &&
        key !== this.STORAGE_KEYS.SESSION_SNAPSHOTS &&
        key !== this.STORAGE_KEYS.SETTINGS &&
        key !== this.STORAGE_KEYS.INTENTS
      );

      otherKeys.forEach(key => {
        usage.other += this.calculateObjectSize(allData[key]);
      });

      // Calculate totals
      usage.total = usage.projects + usage.snapshots + usage.settings + usage.intents + usage.other;
      usage.quotaUsed = usage.total;
      usage.quotaPercentage = (usage.total / usage.quota) * 100;
      usage.totalMB = (usage.total / (1024 * 1024)).toFixed(2);

      // Breakdown percentages
      usage.breakdown = {
        projects: ((usage.projects / usage.total) * 100).toFixed(1),
        snapshots: ((usage.snapshots / usage.total) * 100).toFixed(1),
        settings: ((usage.settings / usage.total) * 100).toFixed(1),
        intents: ((usage.intents / usage.total) * 100).toFixed(1),
        other: ((usage.other / usage.total) * 100).toFixed(1)
      };

      // Storage health status
      if (usage.quotaPercentage < 50) {
        usage.status = 'healthy';
        usage.statusText = 'Healthy';
        usage.statusColor = '#4CAF50';
      } else if (usage.quotaPercentage < 75) {
        usage.status = 'warning';
        usage.statusText = 'Moderate';
        usage.statusColor = '#FF9800';
      } else if (usage.quotaPercentage < 90) {
        usage.status = 'high';
        usage.statusText = 'High Usage';
        usage.statusColor = '#FF5722';
      } else {
        usage.status = 'critical';
        usage.statusText = 'Critical';
        usage.statusColor = '#F44336';
      }

      return { success: true, usage };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return { success: false, error };
    }
  }

  /**
   * Get storage recommendations based on usage
   */
  async getStorageRecommendations() {
    const result = await this.getStorageUsage();
    if (!result.success) return [];

    const { usage } = result;
    const recommendations = [];

    // High snapshot usage
    if (usage.snapshots > usage.projects && usage.snapshotCount > 5) {
      recommendations.push({
        type: 'warning',
        category: 'snapshots',
        message: 'Session backups are using significant storage',
        action: 'Delete old backups',
        actionId: 'cleanup-snapshots',
        impact: `${(usage.snapshots / (1024 * 1024)).toFixed(2)} MB`
      });
    }

    // Too many removed tabs
    const projects = await this.getProjects();
    const removedTabsCount = projects.reduce((sum, p) =>
      sum + (p.tabs?.filter(t => t.removed).length || 0), 0
    );

    if (removedTabsCount > 20) {
      recommendations.push({
        type: 'info',
        category: 'cleanup',
        message: `${removedTabsCount} removed tabs still in storage`,
        action: 'Clean up permanently',
        actionId: 'cleanup-removed-tabs',
        impact: 'Minor'
      });
    }

    // High overall usage
    if (usage.quotaPercentage > 75) {
      recommendations.push({
        type: 'error',
        category: 'storage',
        message: 'Storage usage is high',
        action: 'Export and clear old data',
        actionId: 'export-data',
        impact: 'Critical'
      });
    }

    // Too many projects
    if (usage.projectCount > 50) {
      recommendations.push({
        type: 'info',
        category: 'projects',
        message: `${usage.projectCount} tab groups saved`,
        action: 'Archive inactive groups',
        actionId: 'archive-projects',
        impact: 'Moderate'
      });
    }

    return recommendations;
  }

  /**
   * Cleanup old snapshots (keep only N most recent)
   */
  async cleanupOldSnapshots(keepCount = 5) {
    try {
      let snapshots = await this.getSessionSnapshots();

      if (snapshots.length <= keepCount) {
        return { success: true, deletedCount: 0 };
      }

      // Sort by timestamp (newest first)
      snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Keep only the most recent N
      const keptSnapshots = snapshots.slice(0, keepCount);
      const deletedCount = snapshots.length - keepCount;

      await this.storage.set({ [this.STORAGE_KEYS.SESSION_SNAPSHOTS]: keptSnapshots });

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Failed to cleanup snapshots:', error);
      return { success: false, error };
    }
  }

  /**
   * Permanently delete all removed tabs
   */
  async permanentlyDeleteRemovedTabs() {
    try {
      let projects = await this.getProjects();
      let deletedCount = 0;

      projects.forEach(project => {
        const beforeCount = project.tabs.length;
        project.tabs = project.tabs.filter(tab => !tab.removed);
        deletedCount += beforeCount - project.tabs.length;
      });

      // Remove empty projects
      projects = projects.filter(project => project.tabs.length > 0);

      await this.saveProjects(projects);

      return { success: true, deletedCount };
    } catch (error) {
      console.error('Failed to delete removed tabs:', error);
      return { success: false, error };
    }
  }

  /**
   * Get storage optimization suggestions
   */
  async getOptimizationSuggestions() {
    const result = await this.getStorageUsage();
    if (!result.success) return [];

    const { usage } = result;
    const suggestions = [];

    // Estimate savings from various actions
    const projects = await this.getProjects();

    // Calculate potential savings from cleanup
    const removedTabs = projects.reduce((sum, p) =>
      sum + (p.tabs?.filter(t => t.removed).length || 0), 0
    );

    if (removedTabs > 0) {
      const estimatedSavings = (usage.projects * (removedTabs / usage.totalTabCount)).toFixed(2);
      suggestions.push({
        action: 'Clean removed tabs',
        impact: `~${(estimatedSavings / (1024 * 1024)).toFixed(2)} MB`,
        count: removedTabs
      });
    }

    // Snapshot cleanup
    if (usage.snapshotCount > 5) {
      const excessSnapshots = usage.snapshotCount - 5;
      const estimatedSavings = (usage.snapshots * (excessSnapshots / usage.snapshotCount));
      suggestions.push({
        action: 'Delete old backups',
        impact: `~${(estimatedSavings / (1024 * 1024)).toFixed(2)} MB`,
        count: excessSnapshots
      });
    }

    return suggestions;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
