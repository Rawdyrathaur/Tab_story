/**
 * BrainMark - Storage Manager
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
      TIMELINE: 'tab_timeline'
    };
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
   * Permanently delete removed tabs older than 4 seconds and remove empty projects
   */
  async cleanupRemovedTabs() {
    try {
      let projects = await this.getProjects();
      let changed = false;

      // Remove old deleted tabs
      projects.forEach(project => {
        const originalLength = project.tabs.length;
        project.tabs = project.tabs.filter(tab => {
          if (!tab.removed) return true;
          const removedTime = new Date(tab.removedAt);
          const now = new Date();
          const diffSeconds = (now - removedTime) / 1000;
          return diffSeconds < 4; // Keep removed tabs for 4 seconds
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
      encryptData: false,
      autoClear: false,
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
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
