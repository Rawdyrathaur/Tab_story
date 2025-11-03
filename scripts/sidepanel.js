/**
 * BrainMark - Side Panel Script
 * Initializes the application in the side panel context
 */

// Global app instance
let app = null;

class SidePanelApp {
  constructor() {
    this.storageManager = new StorageManager();
    this.aiManager = new AIManager();
    this.googleAuthService = new GoogleAuthService();
    this.googleCalendarService = new GoogleCalendarService(this.googleAuthService);
    this.modalManager = new ModalManager();
    this.tabManager = new TabManager(this.storageManager);
    this.currentView = 'main';

    this.init();
  }

  async init() {
    // Detect and apply Chrome browser theme
    await this.detectBrowserTheme();

    // Initialize Google Auth Service
    await this.googleAuthService.init();

    // Load settings and apply theme
    await this.loadSettings();

    // Setup event listeners
    this.setupEventListeners();

    // Load recent intents
    await this.loadRecentIntents();

    // Update stats
    await this.updateStats();

    // Expose services globally for other components to access
    window.modalManager = this.modalManager;
    window.googleAuthService = this.googleAuthService;
    window.googleCalendarService = this.googleCalendarService;

    // Check if this is first time and Google Calendar not connected
    await this.checkFirstTimeSetup();
  }

  /**
   * Check if user needs onboarding
   */
  async checkFirstTimeSetup() {
    try {
      // Disabled automatic onboarding modal
      // Users can manually connect from settings if they want to use Google Calendar
      console.log('Google Calendar integration available but not auto-prompted');

      // Optional: Check connection status
      const isConnected = await this.googleAuthService.isAuthenticated();
      if (isConnected) {
        console.log('Google Calendar connected');
      }
    } catch (error) {
      console.error('Error checking first time setup:', error);
    }
  }

  /**
   * Detect Chrome browser theme and apply it
   */
  async detectBrowserTheme() {
    // Check if user prefers dark mode from system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Check stored theme preference
    const settings = await this.storageManager.getSettings();

    // Apply theme based on: stored setting > system preference
    if (settings.darkMode !== undefined) {
      this.applyTheme(settings.darkMode ? 'dark' : 'light');
    } else if (prefersDark) {
      this.applyTheme('dark');
    } else {
      this.applyTheme('light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't set a manual preference
      this.storageManager.getSettings().then(settings => {
        if (settings.darkMode === undefined) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    });
  }

  /**
   * Apply theme
   */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /**
   * Load and apply settings
   */
  async loadSettings() {
    const settings = await this.storageManager.getSettings();

    // Apply dark mode (if manually set)
    if (settings.darkMode !== undefined) {
      this.applyTheme(settings.darkMode ? 'dark' : 'light');
    }

    // Apply compact view
    if (settings.compactView) {
      document.documentElement.setAttribute('data-density', 'compact');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Header buttons
    const timelineBtn = document.getElementById('timeline-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (timelineBtn) {
      timelineBtn.addEventListener('click', () => this.showTimelineView());
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettings();
      });
    }

    // Quick action buttons
    const newIntentQuick = document.getElementById('new-intent-quick');

    // New Intent button now triggers AI Cluster
    if (newIntentQuick) {
      newIntentQuick.addEventListener('click', () => this.handleAICluster());
    }

    // Research button removed from Quick Actions
    // Research is now available per-tab via the science icon on each tab item

    // Empty state button also triggers AI Cluster
    const emptyNewIntentBtn = document.getElementById('new-intent-btn');
    if (emptyNewIntentBtn) {
      emptyNewIntentBtn.addEventListener('click', () => this.handleAICluster());
    }

    // Detail view back button
    const detailBackBtn = document.getElementById('detail-back-btn');
    if (detailBackBtn) {
      detailBackBtn.addEventListener('click', () => this.showMainView());
    }

    // Timeline view back button
    const timelineBackBtn = document.getElementById('timeline-back-btn');
    if (timelineBackBtn) {
      timelineBackBtn.addEventListener('click', () => this.showMainView());
    }

    // Timeline filters
    const timelineFilters = document.querySelectorAll('.timeline-filters .chip');
    timelineFilters.forEach(filter => {
      filter.addEventListener('click', (e) => this.handleTimelineFilter(e.target));
    });

    // Search is handled by TabManager directly in tab-manager.js
    // No need to duplicate search handler here

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.projects) {
        this.updateStats();
      }
    });

    const feedbackBtn = document.getElementById('feedback-btn');
    if (feedbackBtn) {
      feedbackBtn.addEventListener('click', () => {
        const email = 'your-email@example.com';
        const subject = 'Feedback for BrainMark';
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
      });
    }
  }

  /**
   * Update stats bar
   */
  async updateStats() {
    const projects = await this.storageManager.getProjects();

    let totalTabs = 0;
    projects.forEach(project => {
      totalTabs += project.tabs ? project.tabs.length : 0;
    });

    const totalGroups = projects.length;

    // Calculate session time (simplified)
    const sessionTime = this.calculateSessionTime();

    // Update UI
    const totalTabsEl = document.getElementById('total-tabs');
    const totalGroupsEl = document.getElementById('total-groups');
    const sessionTimeEl = document.getElementById('session-time');

    if (totalTabsEl) {
      totalTabsEl.textContent = `${totalTabs} tab${totalTabs !== 1 ? 's' : ''}`;
    }

    if (totalGroupsEl) {
      totalGroupsEl.textContent = `${totalGroups} group${totalGroups !== 1 ? 's' : ''}`;
    }

    if (sessionTimeEl) {
      sessionTimeEl.textContent = sessionTime;
    }
  }

  /**
   * Calculate session time
   */
  calculateSessionTime() {
    // This is a simplified version - you could store actual session start time
    const now = new Date();
    const sessionStart = localStorage.getItem('sessionStart');

    if (!sessionStart) {
      localStorage.setItem('sessionStart', now.toISOString());
      return '0m';
    }

    const start = new Date(sessionStart);
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Handle search
   */
  async handleSearch(query) {
    if (!query.trim()) {
      // Show all projects
      await this.tabManager.loadProjects();
      this.tabManager.renderProjects();
      return;
    }

    const projects = await this.storageManager.getProjects();
    const filtered = projects.filter(project => {
      // Search in project title and subtitle
      const titleMatch = project.title.toLowerCase().includes(query.toLowerCase());
      const subtitleMatch = project.subtitle && project.subtitle.toLowerCase().includes(query.toLowerCase());

      // Search in tab titles
      const tabMatch = project.tabs && project.tabs.some(tab =>
        tab.title.toLowerCase().includes(query.toLowerCase())
      );

      return titleMatch || subtitleMatch || tabMatch;
    });

    // Render filtered projects
    this.renderFilteredProjects(filtered);
  }

  /**
   * Render filtered projects
   */
  renderFilteredProjects(projects) {
    const projectGroups = document.getElementById('project-groups');
    if (!projectGroups) return;

    if (projects.length === 0) {
      projectGroups.innerHTML = `
        <div class="empty-state-container">
          <div class="empty-icon">🔍</div>
          <h2 class="empty-title">No Results</h2>
          <p class="empty-description">Try a different search term.</p>
        </div>
      `;
      return;
    }

    // Group projects by date (TODAY, LAST 7 DAYS, etc.)
    const grouped = this.groupProjectsByDate(projects);

    projectGroups.innerHTML = Object.entries(grouped)
      .map(([period, periodProjects]) => {
        const icon = period === 'TODAY' ? 'today' : 'calendar_month';
        return `
          <div class="section-header">
            <span class="material-symbols-outlined">${icon}</span>
            ${period}
          </div>
          ${periodProjects.map(project => this.renderProjectGroup(project)).join('')}
        `;
      })
      .join('');

    // Re-attach event listeners
    this.tabManager.attachProjectEventListeners();
  }

  /**
   * Group projects by date
   */
  groupProjectsByDate(projects) {
    const grouped = {
      'TODAY': [],
      'LAST 7 DAYS': [],
      'OLDER': []
    };

    const now = new Date();

    projects.forEach(project => {
      const projectDate = new Date(project.timestamp);
      const diffMs = now - projectDate;
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffDays === 0) {
        grouped['TODAY'].push(project);
      } else if (diffDays <= 7) {
        grouped['LAST 7 DAYS'].push(project);
      } else {
        grouped['OLDER'].push(project);
      }
    });

    // Remove empty groups
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });

    return grouped;
  }

  /**
   * Render a single project group
   */
  renderProjectGroup(project) {
    const tabCount = project.tabs ? project.tabs.length : 0;
    const isExpanded = project.expanded ? 'expanded' : '';

    // Get favicon from first tab
    const firstTab = project.tabs && project.tabs[0];
    const projectFaviconHtml = firstTab ? this.getFaviconHtml(firstTab.url, firstTab.favicon) : '📁';

    return `
      <div class="project-group ${isExpanded}" data-group-id="${project.id}">
        <div class="group-header">
          <div class="group-header-left">
            <div class="group-favicon">${projectFaviconHtml}</div>
            <div class="group-info">
              <div class="group-title">${this.escapeHtml(project.title)}</div>
            </div>
            <span class="group-count">${tabCount} tab${tabCount !== 1 ? 's' : ''}</span>
          </div>
          <span class="material-symbols-outlined group-expand-icon">chevron_right</span>
        </div>
        <div class="group-content">
          <div class="tab-list">
            ${project.tabs ? project.tabs.map(tab => this.renderTabItem(tab, project.id)).join('') : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single tab item
   */
  renderTabItem(tab, projectId) {
    const timeAgo = this.formatTimestamp(tab.timestamp);
    const faviconHtml = this.getFaviconHtml(tab.url, tab.favicon);

    return `
      <div class="tab-item" data-tab-id="${tab.id}" data-project-id="${projectId}" data-tab-url="${this.escapeHtml(tab.url)}">
        <div class="tab-item-icon">${faviconHtml}</div>
        <div class="tab-item-content">
          <div class="tab-item-title">${this.escapeHtml(tab.title)}</div>
        </div>
        <div class="tab-item-time">${timeAgo}</div>
        <button class="tab-item-remove btn-close-tab" title="Remove tab">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `;
  }

  /**
   * Get favicon HTML - either image or emoji with multiple fallbacks
   */
  getFaviconHtml(url, favicon) {
    // If no favicon or it's an emoji, use emoji
    if (!favicon || favicon.length <= 2) {
      return favicon || '🔗';
    }

    // If favicon is a URL, use Google's favicon service with fallbacks
    if (favicon.startsWith('http://') || favicon.startsWith('https://')) {
      try {
        const domain = new URL(url).hostname;
        // Try multiple favicon services for better reliability
        const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        const duckduckgoFavicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;

        return `<img src="${googleFavicon}"
                     alt=""
                     width="20"
                     height="20"
                     onerror="this.onerror=null; this.src='${duckduckgoFavicon}'; this.onerror=function(){this.style.display='none';this.parentElement.innerHTML='��';}">`;
      } catch (e) {
        return '🔗';
      }
    }

    return favicon || '🔗';
  }

  /**
   * Format timestamp - same as TabManager
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  /**
   * Get domain from URL
   */
  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Remove tab
   */
  async removeTab(projectId, tabId) {
    await this.tabManager.removeTab(projectId, tabId);
    await this.updateStats();
  }

  /**
   * Show new intent modal
   */
  showNewIntentModal() {
    this.modalManager.showIntentModal(async (intent) => {
      await this.handleNewIntent(intent);
    });
  }

  /**
   * Handle AI Cluster - Capture current active tab only
   */
  async handleAICluster() {
    // Prevent multiple simultaneous calls
    if (this._isCapturing) {
      this.modalManager.showToast('Please wait, already processing...', 'warning');
      return;
    }

    try {
      this._isCapturing = true;

      // Show loading toast
      this.modalManager.showToast('Capturing current tab...', 'info');

      // Get ONLY the current active tab
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!currentTab) {
        this.modalManager.showToast('No active tab found', 'warning');
        return;
      }

      // Filter out Chrome internal pages
      if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
        this.modalManager.showToast('Cannot capture Chrome internal pages', 'warning');
        return;
      }

      const validTabs = [currentTab];

      if (validTabs.length === 0) {
        this.modalManager.showToast('No valid tab to capture', 'warning');
        return;
      }

      // Get existing projects to check for duplicates
      const existingProjects = await this.storageManager.getProjects();

      // Filter out tabs that already exist in projects
      const existingUrls = new Set();
      existingProjects.forEach(project => {
        project.tabs?.forEach(tab => existingUrls.add(tab.url));
      });

      const newTabs = validTabs.filter(tab => !existingUrls.has(tab.url));

      if (newTabs.length === 0) {
        this.modalManager.showToast('All tabs already captured!', 'info');
        return;
      }

      // Try AI clustering first, fallback to domain grouping
      let grouped;
      if (window.ai && window.ai.languageModel) {
        grouped = await this.clusterTabsWithAI(newTabs);
      } else {
        grouped = this.groupTabsByDomain(newTabs);
      }

      // Merge with existing projects or create new ones
      let projectsCreated = 0;
      let tabsAdded = 0;

      for (const [intent, tabsInGroup] of Object.entries(grouped)) {
        if (tabsInGroup.length === 0) continue;

        // Check if project with this intent already exists
        const existingProject = existingProjects.find(p =>
          p.intent === intent || p.title === intent
        );

        if (existingProject) {
          // Add tabs to existing project
          for (const tabData of tabsInGroup) {
            await this.storageManager.addTabToProject(existingProject.id, {
              title: this.cleanTabTitle(tabData.title, tabData.url),
              url: tabData.url,
              favicon: tabData.favicon
            });
            tabsAdded++;
          }
        } else {
          // Create new project
          const project = await this.createProjectFromTabs(intent, tabsInGroup);
          if (project) {
            projectsCreated++;
            tabsAdded += tabsInGroup.length;
          }
        }
      }

      // Reload and update
      await this.tabManager.loadProjects();
      this.tabManager.renderProjects();
      await this.updateStats();

      if (projectsCreated > 0 || tabsAdded > 0) {
        const intent = Object.keys(grouped)[0];
        this.modalManager.showToast(`Tab saved to "${intent}"!`, 'success');
      }
    } catch (error) {
      this.modalManager.showToast('Failed to save tab: ' + error.message, 'error');
    } finally {
      // Release the lock
      this._isCapturing = false;
    }
  }

  /**
   * Handle Research button - Extract current page data and open research.html
   */
  async handleResearch() {
    try {
      // Show loading toast
      this.modalManager.showToast('Extracting page content...', 'info');

      // Get all tabs in current window
      const tabs = await chrome.tabs.query({ currentWindow: true });

      // Find the active tab that is NOT an extension page
      let currentTab = tabs.find(tab =>
        tab.active &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('about:')
      );

      // If active tab is extension page, find the most recently accessed regular webpage
      if (!currentTab) {
        const validTabs = tabs.filter(tab =>
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('about:')
        ).sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

        currentTab = validTabs[0];
      }

      if (!currentTab) {
        this.modalManager.showToast('No valid webpage found. Please open a webpage first.', 'warning');
        return;
      }

      console.log('Researching tab:', currentTab.title, currentTab.url);

      // Extract page content using content script
      let pageContent = '';
      let visualContent = { images: [], videos: [] };
      let structuredData = { tables: [], lists: [] };
      let metadata = {};
      try {
        // Try to inject content script if not already injected
        try {
          await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['scripts/content-extractor.js']
          });
          console.log('Content script injected successfully');
        } catch (injectError) {
          // Script might already be injected or injection failed - continue anyway
          console.log('Content script injection skipped:', injectError.message);
        }

        // Wait a moment for script to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Try to get page content
        const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageContent' });
        if (response && response.success) {
          pageContent = response.content;
          visualContent = response.visualContent || { images: [], videos: [] };
          structuredData = response.structuredData || { tables: [], lists: [] };
          metadata = response.metadata || {};
          console.log('Successfully extracted page content:', pageContent.length, 'characters');
        } else {
          console.log('Content extraction returned empty response');
        }
      } catch (error) {
        console.log('Content extraction not available, using fallback method:', error.message);
        // Fallback: use title as content - this is fine, AI will still work
        pageContent = '';
      }

      // If content is empty or too short, use title and URL as content
      if (!pageContent || pageContent.trim().length < 20) {
        pageContent = `${currentTab.title}\n\nURL: ${currentTab.url}\n\nThis page may have limited text content. Analysis based on available information.`;
        console.log('Using fallback content (title + URL)');
      }

      // Prepare page data
      const pageData = {
        url: currentTab.url,
        title: currentTab.title,
        content: pageContent,
        visualContent: visualContent || { images: [], videos: [] },
        structuredData: structuredData || { tables: [], lists: [] },
        metadata: metadata || {},
        favicon: currentTab.favIconUrl || 'https://www.google.com/s2/favicons?domain=' + new URL(currentTab.url).hostname + '&sz=32',
        timestamp: new Date().toISOString()
      };

      console.log('Saving page data for research:', {
        url: pageData.url,
        title: pageData.title,
        contentLength: pageData.content.length
      });

      // Save to storage for research.html to use
      await chrome.storage.local.set({ currentPageData: pageData });

      // Verify data was saved
      const verification = await chrome.storage.local.get(['currentPageData']);
      console.log('Data saved successfully:', !!verification.currentPageData);

      // Open research.html in a new tab
      const researchUrl = chrome.runtime.getURL('pages/research.html');
      await chrome.tabs.create({ url: researchUrl, active: true });

      this.modalManager.showToast('Opening research page...', 'success');
    } catch (error) {
      console.error('Research error:', error);
      this.modalManager.showToast('Failed to open research: ' + error.message, 'error');
    }
  }

  /**
   * Cluster tabs using Chrome AI API
   */
  async clusterTabsWithAI(tabs) {
    try {
      const session = await window.ai.languageModel.create({
        systemPrompt: 'You are a helpful assistant that analyzes browser tabs and groups them by user intent. Return only a JSON object mapping intent names to tab indices.'
      });

      const tabsSummary = tabs.map((tab, i) => `${i}: ${tab.title} - ${tab.url}`).join('\n');

      const prompt = `Analyze these browser tabs and group them by user intent (e.g., "Job Search", "Learning", "Shopping"). Return a JSON object where keys are intent names and values are arrays of tab indices.\n\nTabs:\n${tabsSummary}\n\nReturn only valid JSON:`;

      const result = await session.prompt(prompt);
      const aiGrouping = JSON.parse(result);

      // Convert AI grouping to our format
      const grouped = {};
      for (const [intent, indices] of Object.entries(aiGrouping)) {
        grouped[intent] = indices.map(i => ({
          title: tabs[i].title,
          url: tabs[i].url,
          favicon: tabs[i].favIconUrl || '🔗'
        }));
      }

      return grouped;
    } catch (error) {
      return this.groupTabsByDomain(tabs);
    }
  }

  /**
   * Group tabs by domain, then merge by intent
   */
  groupTabsByDomain(tabs) {
    // First group by domain
    const byDomain = {};

    tabs.forEach(tab => {
      // Skip invalid URLs
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        return;
      }

      try {
        const url = new URL(tab.url);
        const domain = url.hostname.replace('www.', '');

        if (!byDomain[domain]) {
          byDomain[domain] = [];
        }

        byDomain[domain].push({
          title: tab.title,
          url: tab.url,
          favicon: tab.favIconUrl || '🔗'
        });
      } catch (error) {}
    });

    // Then merge domains with same intent
    const byIntent = {};

    for (const [domain, domainTabs] of Object.entries(byDomain)) {
      const intent = this.generateIntentFromDomain(domain);

      if (!byIntent[intent]) {
        byIntent[intent] = [];
      }

      byIntent[intent].push(...domainTabs);
    }

    return byIntent;
  }

  /**
   * Generate intent from domain
   */
  generateIntentFromDomain(domain) {
    const domainIntents = {
      'linkedin.com': 'Job Search',
      'indeed.com': 'Job Search',
      'github.com': 'Development',
      'stackoverflow.com': 'Development',
      'youtube.com': 'Learning',
      'udemy.com': 'Learning',
      'amazon.com': 'Shopping',
      'facebook.com': 'Social Media',
      'twitter.com': 'Social Media',
      'reddit.com': 'Social Media'
    };

    return domainIntents[domain] || this.capitalizeFirst(domain.split('.')[0]);
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Clean tab title - if title is a URL, extract domain name instead
   */
  cleanTabTitle(title, url) {
    // Check if title is a URL (starts with http:// or https://)
    if (title && (title.startsWith('http://') || title.startsWith('https://'))) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        // Capitalize first letter
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (e) {
        return title;
      }
    }
    return title;
  }

  /**
   * Create project from tabs array
   */
  async createProjectFromTabs(intent, tabsData) {
    const projectData = {
      title: intent,
      subtitle: `${tabsData.length} tab${tabsData.length > 1 ? 's' : ''}`,
      intent: intent,
      section: 'today',
      expanded: true,
      timestamp: new Date().toISOString(),
      tabs: tabsData.map((tab, index) => ({
        id: `${Date.now()}-${index}`,
        title: this.cleanTabTitle(tab.title, tab.url),
        url: tab.url,
        favicon: tab.favicon,
        timestamp: new Date().toISOString()
      }))
    };

    const result = await this.storageManager.addProject(projectData);
    return result.success ? result.project : null;
  }

  /**
   * Detect current tab and show save modal
   */
  async detectAndSaveCurrentTab() {
    try {
      // Get the current active tab
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!currentTab) {
        return;
      }

      // Don't save Chrome internal pages
      if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
        return;
      }

      // Store current tab info temporarily
      this.currentTabToSave = {
        url: currentTab.url,
        title: currentTab.title,
        favicon: currentTab.favIconUrl || '🔗'
      };

      // Show intent modal with current tab info
      this.showIntentModalForCurrentTab();

    } catch (error) {
    }
  }

  /**
   * Show intent modal for current tab
   */
  showIntentModalForCurrentTab() {
    this.modalManager.showIntentModal(async (intent) => {
      await this.handleNewIntentWithCurrentTab(intent);
    });
  }

  /**
   * Handle new intent with current tab
   */
  async handleNewIntentWithCurrentTab(intent) {
    if (!this.currentTabToSave) {
      this.modalManager.showToast('No tab to save', 'error');
      return;
    }

    // Add to recent intents
    await this.storageManager.addRecentIntent(intent);

    // Create new project with the current tab
    const project = await this.tabManager.addProjectWithTab(
      intent,
      intent,
      this.currentTabToSave
    );

    if (project) {
      this.modalManager.showToast(`Tab saved to "${intent}"!`, 'success');
      // Reload the projects view
      await this.tabManager.loadProjects();
      this.tabManager.renderProjects();
      await this.updateStats();
    } else {
      this.modalManager.showToast('Failed to save tab', 'error');
    }

    // Clear the temporary tab info
    this.currentTabToSave = null;
  }

  /**
   * Handle new intent creation (for manual creation without current tab)
   */
  async handleNewIntent(intent) {
    // Add to recent intents
    await this.storageManager.addRecentIntent(intent);

    // Create new project
    const project = await this.tabManager.addProject(intent, intent);

    if (project) {
      this.modalManager.showToast(`Intent "${intent}" created!`, 'success');
      await this.updateStats();
    } else {
      this.modalManager.showToast('Failed to create intent', 'error');
    }
  }

  /**
   * Load recent intents
   */
  async loadRecentIntents() {
    const intents = await this.storageManager.getRecentIntents();
    const recentIntentsContainer = document.getElementById('recent-intents');

    if (recentIntentsContainer && intents.length > 0) {
      recentIntentsContainer.innerHTML = intents
        .slice(0, 6)
        .map(intent => `<button class="chip">${this.escapeHtml(intent)}</button>`)
        .join('');
    }
  }

  /**
   * Show settings modal
   */
  showSettings() {
    this.modalManager.showSettingsModal(this.storageManager);
  }


  /**
   * Handle restore tabs
   */
  async handleRestoreTabs() {
    this.modalManager.showToast('Restore functionality coming soon!', 'info');
  }

  /**
   * Show main view
   */
  showMainView() {
    this.tabManager.switchView('main');
    this.currentView = 'main';
  }

  /**
   * Show timeline view
   */
  showTimelineView() {
    this.tabManager.switchView('timeline');
    this.currentView = 'timeline';
    this.renderTimeline();
  }

  /**
   * Render timeline
   */
  async renderTimeline() {
    const projects = await this.storageManager.getProjects();
    const timelineContent = document.querySelector('.timeline-content .timeline');

    if (!timelineContent) return;

    // Flatten all tabs from all projects with timestamps
    const allTabs = [];
    projects.forEach(project => {
      project.tabs.forEach(tab => {
        allTabs.push({
          ...tab,
          projectTitle: project.title
        });
      });
    });

    // Sort by timestamp (newest first)
    allTabs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Render timeline items
    timelineContent.innerHTML = allTabs
      .slice(0, 20)
      .map((tab, index) => {
        const faviconHtml = this.getFaviconHtml(tab.url, tab.favicon);
        const isRemoved = tab.removed;
        const removedClass = isRemoved ? 'timeline-item-removed' : '';

        return `
          <div class="timeline-item ${removedClass} stagger-item" style="animation-delay: ${index * 50}ms">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <div class="timeline-favicon">${faviconHtml}</div>
                <div class="timeline-info">
                  <div class="timeline-time">${this.formatTime(tab.timestamp)}</div>
                  <div class="timeline-title">${this.escapeHtml(tab.title)}</div>
                  <div class="tab-url">${this.escapeHtml(tab.projectTitle)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Handle timeline filter
   */
  handleTimelineFilter(filterButton) {
    // Remove active class from all filters
    document.querySelectorAll('.timeline-filters .chip').forEach(chip => {
      chip.classList.remove('active');
    });

    // Add active class to clicked filter
    filterButton.classList.add('active');

    const filter = filterButton.dataset.filter;
    this.filterTimeline(filter);
  }

  /**
   * Filter timeline by period
   */
  async filterTimeline(filter) {
    const projects = await this.storageManager.getProjects();
    const timelineContent = document.querySelector('.timeline-content .timeline');

    if (!timelineContent) return;

    const allTabs = [];
    projects.forEach(project => {
      project.tabs.forEach(tab => {
        allTabs.push({
          ...tab,
          projectTitle: project.title
        });
      });
    });

    // Filter based on time period
    const now = new Date();
    const filteredTabs = allTabs.filter(tab => {
      const tabDate = new Date(tab.timestamp);
      const diffMs = now - tabDate;
      const diffDays = Math.floor(diffMs / 86400000);

      if (filter === 'today') {
        return diffDays === 0;
      } else if (filter === 'week') {
        return diffDays <= 7;
      }
      return true; // 'all'
    });

    // Sort and render
    filteredTabs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filteredTabs.length === 0) {
      timelineContent.innerHTML = `
        <div class="empty-state-container">
          <div class="empty-icon">📭</div>
          <h2 class="empty-title">No tabs found</h2>
          <p class="empty-description">No tabs match the selected filter.</p>
        </div>
      `;
    } else {
      timelineContent.innerHTML = filteredTabs
        .slice(0, 20)
        .map((tab, index) => {
          const faviconHtml = this.getFaviconHtml(tab.url, tab.favicon);
          const isRemoved = tab.removed;
          const removedClass = isRemoved ? 'timeline-item-removed' : '';

          return `
            <div class="timeline-item ${removedClass} stagger-item" style="animation-delay: ${index * 50}ms">
              <div class="timeline-marker"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-favicon">${faviconHtml}</div>
                  <div class="timeline-info">
                    <div class="timeline-time">${this.formatTime(tab.timestamp)}</div>
                    <div class="timeline-title">${this.escapeHtml(tab.title)}</div>
                    <div class="tab-url">${this.escapeHtml(tab.projectTitle)}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }

  /**
   * Format time for timeline
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${displayHours}:${displayMinutes} ${ampm}`;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

}

// Export for debugging
if (typeof window !== 'undefined') {
  window.SidePanelApp = SidePanelApp;
}

// Listen for in-app notification messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'showInAppNotification') {
    console.log('Received in-app notification:', message.data);
    showInAppNotification(message.data);
    sendResponse({ success: true });
  }
  return true;
});

/**
 * Show in-app notification (NO OS permissions needed!)
 */
function showInAppNotification(data) {
  const notification = document.getElementById('in-app-notification');
  const titleEl = document.getElementById('in-app-notification-title');
  const projectEl = document.getElementById('in-app-notification-project');
  const messageEl = document.getElementById('in-app-notification-message');
  const openBtn = document.getElementById('in-app-notification-open');
  const dismissBtn = document.getElementById('in-app-notification-dismiss');
  const closeBtn = document.getElementById('in-app-notification-close');

  if (!notification) return;

  // Set content
  titleEl.textContent = data.title || 'Notification';
  projectEl.textContent = data.project || 'Project';
  messageEl.textContent = data.message || 'Check your tab!';

  // Play notification sound (optional)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSiJzvfTgjMGHm7A7+OZUQ4PVKnn77NYHAk9k9v0xXIn');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Silently fail if not allowed
  } catch (e) {}

  // Show notification with animation
  notification.classList.add('show');

  // Handle button clicks
  const handleOpen = () => {
    if (data.url) {
      chrome.tabs.create({ url: data.url, active: true });
    }
    hideNotification();
  };

  const handleDismiss = () => {
    hideNotification();
  };

  const hideNotification = () => {
    notification.classList.remove('show');
    // Remove event listeners
    openBtn.removeEventListener('click', handleOpen);
    dismissBtn.removeEventListener('click', handleDismiss);
    closeBtn.removeEventListener('click', handleDismiss);
  };

  // Add event listeners
  openBtn.addEventListener('click', handleOpen);
  dismissBtn.addEventListener('click', handleDismiss);
  closeBtn.addEventListener('click', handleDismiss);

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.classList.contains('show')) {
      hideNotification();
    }
  }, 30000);
}

// Initialize app when DOM is ready
function initializeApp() {
  app = new SidePanelApp();
  window.app = app; // Export after creation
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, wait for it
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already loaded, initialize immediately
  initializeApp();
}
