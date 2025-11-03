/**
 * BrainMark - Tab Manager
 * Handles tab grouping, rendering, and interactions
 */

class TabManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.currentView = 'main';
    this.projects = [];
    this.filteredProjects = [];
    this.searchQuery = '';

    // Initialize asynchronously
    this.init().catch(err => {});
  }

  async init() {
    // Load projects from storage
    await this.loadProjects();

    // Setup event listeners
    this.setupEventListeners();

    // Render initial view
    this.renderProjects();
  }

  /**
   * Load projects from storage
   */
  async loadProjects() {
    const rawProjects = await this.storageManager.getProjects();

    // Deduplicate projects by ID (in case of data corruption)
    const projectMap = new Map();
    rawProjects.forEach(project => {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    });

    this.projects = Array.from(projectMap.values());
    this.filteredProjects = [...this.projects];
  }

  /**
   * Create sample projects for initial display
   */
  createSampleProjects() {
    const now = new Date();
    return [
      {
        id: 'demo-1',
        title: 'Job Search',
        subtitle: 'Software engineering positions',
        intent: 'Job hunting',
        section: 'today',
        expanded: true,
        timestamp: now.toISOString(),
        tabs: [
          {
            id: 'tab-1',
            title: 'LinkedIn Jobs - Software Engineer',
            url: 'https://www.linkedin.com/jobs',
            favicon: '💼',
            timestamp: now.toISOString()
          },
          {
            id: 'tab-2',
            title: 'Indeed - Job Search',
            url: 'https://www.indeed.com',
            favicon: '🔍',
            timestamp: now.toISOString()
          },
          {
            id: 'tab-3',
            title: 'GitHub Jobs Board',
            url: 'https://github.com/jobs',
            favicon: '💻',
            timestamp: now.toISOString()
          }
        ]
      },
      {
        id: 'demo-2',
        title: '2D Game Development',
        subtitle: 'Learning game dev with JavaScript',
        intent: 'Learning',
        section: 'today',
        expanded: false,
        timestamp: now.toISOString(),
        tabs: [
          {
            id: 'tab-4',
            title: 'Phaser - HTML5 Game Framework',
            url: 'https://phaser.io',
            favicon: '🎮',
            timestamp: now.toISOString()
          },
          {
            id: 'tab-5',
            title: 'WebGL Fundamentals',
            url: 'https://webglfundamentals.org',
            favicon: '🎨',
            timestamp: now.toISOString()
          }
        ]
      },
      {
        id: 'demo-3',
        title: 'Shopping',
        subtitle: 'Electronics and gadgets',
        intent: 'Shopping',
        section: 'week',
        expanded: false,
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        tabs: [
          {
            id: 'tab-6',
            title: 'Amazon Electronics',
            url: 'https://www.amazon.com/electronics',
            favicon: '🛒',
            timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    ];
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Attach project event listeners
    this.attachProjectEventListeners();
  }

  /**
   * Attach event listeners to project groups (called after rendering)
   */
  attachProjectEventListeners() {
    // Project group clicks (event delegation)
    const projectGroups = document.getElementById('project-groups');
    if (projectGroups) {
      // Remove existing listener if already attached
      if (this.projectGroupsListener) {
        projectGroups.removeEventListener('click', this.projectGroupsListener);
      }

      // Create and store the listener
      this.projectGroupsListener = (e) => {
        // Handle research group button
        const researchGroupBtn = e.target.closest('.btn-research-group');
        if (researchGroupBtn) {
          const projectId = researchGroupBtn.dataset.projectId;
          this.handleGroupResearch(projectId);
          e.stopPropagation();
          return;
        }

        // Handle group header click (expand/collapse)
        const groupHeader = e.target.closest('.group-header');
        if (groupHeader && !e.target.closest('.tab-item') && !e.target.closest('.btn-research-group')) {
          const projectGroup = groupHeader.closest('.project-group');
          this.toggleGroup(projectGroup);
          return;
        }

        // Handle open tab button
        const openBtn = e.target.closest('.btn-open-tab');
        if (openBtn) {
          const tabItem = openBtn.closest('.tab-item');
          const url = openBtn.dataset.url || tabItem.dataset.tabUrl;
          if (url) {
            window.open(url, '_blank');
          }
          e.stopPropagation();
          return;
        }

        // Handle close tab button
        const closeBtn = e.target.closest('.btn-close-tab');
        if (closeBtn) {
          const tabItem = closeBtn.closest('.tab-item');
          const tabId = tabItem.dataset.tabId;
          const projectId = tabItem.dataset.projectId;
          this.removeTab(projectId, tabId);
          e.stopPropagation();
          return;
        }

        // Handle tab item click (show details)
        const tabItem = e.target.closest('.tab-item');
        if (tabItem && !e.target.closest('.tab-item-actions')) {
          const tabId = tabItem.dataset.tabId;
          const projectId = tabItem.closest('.project-group').dataset.groupId;
          this.showTabDetails(projectId, tabId);
          e.stopPropagation();
        }
      };

      // Attach the listener
      projectGroups.addEventListener('click', this.projectGroupsListener);
    }
  }

  /**
   * Handle search - Simple show/hide approach (no re-rendering)
   */
  handleSearch(query) {
    this.searchQuery = query.toLowerCase().trim();

    // Get all rendered elements
    const allProjects = document.querySelectorAll('.project-group');
    const allSections = document.querySelectorAll('.section-header');

    if (!this.searchQuery) {
      // No search - show everything normally
      allSections.forEach(section => section.style.display = '');
      allProjects.forEach(project => {
        project.style.display = '';
        const tabs = project.querySelectorAll('.tab-item');
        tabs.forEach(tab => tab.style.display = '');
      });
      return;
    }

    // Hide all section headers during search
    allSections.forEach(section => section.style.display = 'none');

    // Search mode - hide non-matching items
    allProjects.forEach(projectEl => {
      const projectId = projectEl.dataset.groupId;
      const project = this.projects.find(p => p.id === projectId);
      if (!project) return;

      let hasVisibleTabs = false;

      // Check each tab
      const tabs = projectEl.querySelectorAll('.tab-item');
      tabs.forEach(tabEl => {
        const tabId = tabEl.dataset.tabId;
        const tab = project.tabs.find(t => t.id === tabId);
        if (!tab || tab.removed) {
          tabEl.style.display = 'none';
          return;
        }

        // Check if tab matches search
        const matches =
          tab.title.toLowerCase().includes(this.searchQuery) ||
          tab.url.toLowerCase().includes(this.searchQuery) ||
          (tab.notes && tab.notes.toLowerCase().includes(this.searchQuery)) ||
          project.title.toLowerCase().includes(this.searchQuery) ||
          project.intent.toLowerCase().includes(this.searchQuery);

        if (matches) {
          tabEl.style.display = '';
          hasVisibleTabs = true;
        } else {
          tabEl.style.display = 'none';
        }
      });

      // Show/hide project based on visible tabs
      projectEl.style.display = hasVisibleTabs ? '' : 'none';
    });
  }

  /**
   * Toggle project group expand/collapse
   */
  toggleGroup(projectGroup) {
    projectGroup.classList.toggle('expanded');
  }

  /**
   * Render all projects
   */
  renderProjects() {
    const container = document.getElementById('project-groups');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');

    if (!container) {
      return;
    }

    if (loadingState) loadingState.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    container.innerHTML = '';

    setTimeout(() => {
      if (loadingState) loadingState.classList.add('hidden');

      if (this.filteredProjects.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
      }

      const now = new Date();
      this.filteredProjects.forEach(project => {
        if (!project.section) {
          const projectDate = new Date(project.timestamp || project.createdAt || now);
          const daysDiff = Math.floor((now - projectDate) / (24 * 60 * 60 * 1000));

          if (daysDiff === 0) {
            project.section = 'today';
          } else if (daysDiff <= 7) {
            project.section = 'week';
          } else {
            project.section = 'older';
          }
        }
      });

      const todayProjects = this.filteredProjects.filter(p => p.section === 'today');
      const weekProjects = this.filteredProjects.filter(p => p.section === 'week');
      const olderProjects = this.filteredProjects.filter(p => p.section === 'older');

      if (todayProjects.length > 0) {
        const todayHeader = this.createSectionHeader('today', 'TODAY');
        container.appendChild(todayHeader);

        todayProjects.forEach(project => {
          const activeTabs = project.tabs.filter(tab => !tab.removed);
          if (activeTabs.length > 0) {
            const projectElement = this.createProjectElement(project);
            container.appendChild(projectElement);
          }
        });
      }

      if (weekProjects.length > 0) {
        const weekHeader = this.createSectionHeader('calendar_month', 'LAST 7 DAYS');
        container.appendChild(weekHeader);

        weekProjects.forEach(project => {
          const activeTabs = project.tabs.filter(tab => !tab.removed);
          if (activeTabs.length > 0) {
            const projectElement = this.createProjectElement(project);
            container.appendChild(projectElement);
          }
        });
      }

      if (olderProjects.length > 0) {
        const olderHeader = this.createSectionHeader('history', 'OLDER');
        container.appendChild(olderHeader);

        olderProjects.forEach(project => {
          const activeTabs = project.tabs.filter(tab => !tab.removed);
          if (activeTabs.length > 0) {
            const projectElement = this.createProjectElement(project);
            container.appendChild(projectElement);
          }
        });
      }

      this.attachProjectEventListeners();
    }, 300);
  }

  /**
   * Create section header element
   */
  createSectionHeader(icon, title) {
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <span class="material-symbols-outlined">${icon}</span>
      ${title}
    `;
    return header;
  }

  /**
   * Create project element
   */
  createProjectElement(project) {
    const projectDiv = document.createElement('div');
    projectDiv.className = project.expanded ? 'project-group expanded' : 'project-group';
    projectDiv.dataset.groupId = project.id;

    // Count only non-removed tabs
    const tabCount = project.tabs.filter(tab => !tab.removed).length;
    const tabsLabel = tabCount === 1 ? 'tab' : 'tabs';

    // Get favicon from first non-removed tab
    const firstTab = project.tabs.find(tab => !tab.removed);
    const projectFaviconHtml = firstTab ? this.getFaviconHtml(firstTab.url, firstTab.favicon) : '📁';

    projectDiv.innerHTML = `
      <div class="group-header">
        <div class="group-header-left">
          <div class="group-favicon">${projectFaviconHtml}</div>
          <div class="group-info">
            <div class="group-title">${this.escapeHtml(project.title)}</div>
          </div>
          <span class="group-count">${tabCount} ${tabsLabel}</span>
        </div>
        <div class="group-header-actions">
          <button class="btn-icon btn-research-group" data-project-id="${project.id}" title="Research all tabs">
            <span class="material-symbols-outlined">science</span>
          </button>
          <span class="material-symbols-outlined group-expand-icon">chevron_right</span>
        </div>
      </div>
      <div class="group-content">
        <div class="tab-list">
          ${project.tabs.filter(tab => !tab.removed).map(tab => this.createTabElement(tab, project.id)).join('')}
        </div>
      </div>
    `;

    return projectDiv;
  }

  /**
   * Create tab element HTML
   */
  createTabElement(tab, projectId) {
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
                     onerror="this.onerror=null; this.src='${duckduckgoFavicon}'; this.onerror=function(){this.style.display='none';this.parentElement.innerHTML='🔗';}">`;
      } catch (e) {
        return '🔗';
      }
    }

    return favicon || '🔗';
  }

  /**
   * Open tab in browser
   */
  async openTab(projectId, tabId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const tab = project.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Open URL in new tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: tab.url });
    } else {
      window.open(tab.url, '_blank');
    }
  }

  /**
   * Remove tab from project with undo option
   */
  async removeTab(projectId, tabId) {
    const result = await this.storageManager.removeTabFromProject(projectId, tabId);

    if (result.success) {
      await this.loadProjects();
      this.renderProjects();

      // Show undo toast for 4 seconds
      this.showUndoToast(projectId, tabId);

      // Auto-cleanup after 4 seconds
      setTimeout(async () => {
        await this.storageManager.cleanupRemovedTabs();
        await this.loadProjects();
        this.renderProjects();
      }, 4000);
    } else {
      this.showToast('Failed to remove tab', 'error');
    }
  }



  /**
   * Restore all tabs from a project
   */
  async restoreProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const activeTabs = project.tabs.filter(tab => !tab.removed);

    if (activeTabs.length === 0) {
      this.showToast('No tabs to restore', 'warning');
      return;
    }

    // Show confirmation for many tabs
    if (activeTabs.length > 5) {
      const confirmed = confirm(`This will open ${activeTabs.length} tabs. Continue?`);
      if (!confirmed) return;
    }

    // Open all tabs
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        // Use Chrome API to open tabs
        for (const tab of activeTabs) {
          await chrome.tabs.create({ url: tab.url, active: false });
        }
        this.showToast(`Restored ${activeTabs.length} tabs`, 'success');
      } else {
        // Fallback for non-Chrome environment
        activeTabs.forEach(tab => {
          window.open(tab.url, '_blank');
        });
        this.showToast(`Opened ${activeTabs.length} tabs`, 'success');
      }
    } catch (error) {
      this.showToast('Failed to restore tabs', 'error');
    }
  }

  /**
   * Handle research for all tabs in a group
   */
  async handleGroupResearch(projectId) {
    try {
      this.showToast('Opening research page...', 'info');

      // Get the project
      const project = this.projects.find(p => p.id === projectId);
      if (!project) {
        this.showToast('Project not found', 'warning');
        return;
      }

      // Get all active tabs from the project
      const activeTabs = project.tabs.filter(tab => !tab.removed);

      if (activeTabs.length === 0) {
        this.showToast('No tabs to research', 'warning');
        return;
      }

      // Prepare combined research data from all tabs
      const combinedContent = activeTabs.map(tab =>
        `Title: ${tab.title}\nURL: ${tab.url}\n`
      ).join('\n---\n\n');

      const pageData = {
        url: activeTabs[0].url,
        title: `${project.title} (${activeTabs.length} tabs)`,
        content: `Research for intent: ${project.title}\n\n${combinedContent}`,
        favicon: activeTabs[0].favicon || `https://www.google.com/s2/favicons?domain=${new URL(activeTabs[0].url).hostname}&sz=32`,
        timestamp: new Date().toISOString()
      };

      // Save to storage for research.html to use
      await chrome.storage.local.set({ currentPageData: pageData });

      // Open research.html in a new tab
      const researchUrl = chrome.runtime.getURL('pages/research.html');
      await chrome.tabs.create({ url: researchUrl, active: true });

    } catch (error) {
      console.error('Research error:', error);
      this.showToast('Failed to open research page', 'error');
    }
  }

  /**
   * Show undo toast with action button
   */
  showUndoToast(projectId, tabId) {
    // Remove any existing undo toasts
    const existingUndo = document.querySelector('.toast-undo');
    if (existingUndo) existingUndo.remove();

    const toast = document.createElement('div');
    toast.className = 'toast toast-undo animate-slide-up';
    toast.innerHTML = `
      <span>Tab removed</span>
      <button class="toast-undo-btn" data-project-id="${projectId}" data-tab-id="${tabId}">
        UNDO
      </button>
    `;

    document.body.appendChild(toast);

    // Undo button handler
    const undoBtn = toast.querySelector('.toast-undo-btn');
    undoBtn.addEventListener('click', async () => {
      const result = await this.storageManager.undoRemoveTab(projectId, tabId);
      if (result.success) {
        await this.loadProjects();
        this.renderProjects();
        toast.remove();
        this.showToast('Tab restored', 'success');
      }
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  }

  /**
   * Show tab details view
   */
  showTabDetails(projectId, tabId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const tab = project.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const tabCount = project.tabs.length;
    const tabsLabel = tabCount === 1 ? 'tab' : 'tabs';

    // Truncate and clean up title for display
    const cleanTitle = this.truncateTitle(tab.title, 4);
    const cleanProjectTitle = this.truncateTitle(project.title, 4);

    // Populate detail view - header with truncated title
    document.getElementById('detail-title').textContent = cleanTitle;

    // Populate detail card - title with count
    const detailCardTitle = document.getElementById('detail-card-title');
    detailCardTitle.innerHTML = `${this.escapeHtml(cleanProjectTitle)} <span class="tab-detail-count">(${tabCount} ${tabsLabel})</span>`;

    // Generate smart intent or use existing
    const smartIntent = project.intent || this.generateSmartIntent(tab.title);
    document.getElementById('detail-intent').textContent = smartIntent;

    // Populate summary with description and timestamp
    const detailSummary = document.getElementById('detail-summary');
    const summary = tab.summary || this.generateSmartSummary(tab, project);
    detailSummary.textContent = summary;

    // Update timestamp separately
    const detailTime = document.getElementById('detail-time');
    detailTime.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
      Opened ${this.formatTimestamp(tab.timestamp)}
    `;

    // Switch to detail view
    this.switchView('detail');

    // Setup detail view actions with current tab data
    this.setupDetailActions(tab.url, projectId, tabId);
  }


  /**
   * Generate smart summary based on tab and project context
   */
  generateSmartSummary(tab, project) {
    const domain = this.extractDomain(tab.url);
    const intent = project.intent.toLowerCase();

    // Smart summaries based on domain and intent
    const summaries = {
      'linkedin.com': `Professional networking and ${intent} platform for career opportunities.`,
      'indeed.com': `Job search engine for finding ${intent} opportunities and career resources.`,
      'github.com': `Open source development platform for ${intent} projects and collaboration.`,
      'amazon.com': `Online shopping for ${intent} with fast delivery and customer reviews.`,
      'phaser.io': `HTML5 game framework for ${intent} with JavaScript and WebGL support.`,
      'webglfundamentals.org': `Interactive tutorials and guides for ${intent} with WebGL graphics.`
    };

    return summaries[domain] || `${tab.title} - ${intent} related content and resources.`;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  /**
   * Setup detail view actions
   */
  setupDetailActions(url, projectId, tabId) {
    const summarizeBtn = document.getElementById('detail-summarize');

    // Remove any existing listeners by cloning and replacing
    const summarizeBtnNew = summarizeBtn.cloneNode(true);

    summarizeBtn.parentNode.replaceChild(summarizeBtnNew, summarizeBtn);

    // AI Summary - Generate AI-powered summary
    summarizeBtnNew.addEventListener('click', async () => {
      const project = this.projects.find(p => p.id === projectId);
      const tab = project?.tabs.find(t => t.id === tabId);

      if (!tab || !project) return;

      const summaryElement = document.getElementById('detail-summary');
      const originalText = summaryElement.textContent;

      try {
        // Show loading state
        summarizeBtnNew.disabled = true;
        summaryElement.textContent = 'Generating AI summary...';
        summaryElement.style.fontStyle = 'italic';

        // Try to use Chrome AI Summarizer API
        if (window.ai && window.ai.summarizer) {
          const summarizer = await window.ai.summarizer.create({
            type: 'tl;dr',
            format: 'plain-text',
            length: 'short'
          });

          const aiSummary = await summarizer.summarize(tab.title + ' - ' + tab.url + ' - Intent: ' + project.intent);

          // Update summary
          summaryElement.textContent = aiSummary;
          summaryElement.style.fontStyle = 'normal';

          // Save AI summary to tab
          tab.summary = aiSummary;
          await this.storageManager.saveProjects(this.projects);

          this.showToast('AI summary generated!', 'success');
        } else {
          // Fallback: Generate enhanced summary
          const enhancedSummary = this.generateEnhancedSummary(tab, project);
          summaryElement.textContent = enhancedSummary;
          summaryElement.style.fontStyle = 'normal';

          tab.summary = enhancedSummary;
          await this.storageManager.saveProjects(this.projects);

          this.showToast('Enhanced summary generated!', 'success');
        }
      } catch (error) {
        summaryElement.textContent = originalText;
        summaryElement.style.fontStyle = 'normal';
        this.showToast('AI summary not available. Using smart summary.', 'warning');
      } finally {
        summarizeBtnNew.disabled = false;
      }
    });

    // Setup Restore All Tabs button
    const restoreAllBtn = document.getElementById('detail-restore-all');
    if (restoreAllBtn) {
      // Remove any existing listeners by cloning and replacing
      const restoreAllBtnNew = restoreAllBtn.cloneNode(true);
      restoreAllBtn.parentNode.replaceChild(restoreAllBtnNew, restoreAllBtn);

      // Restore All Tabs - Restore all tabs from the project
      restoreAllBtnNew.addEventListener('click', async () => {
        await this.restoreProject(projectId);
      });
    }
  }

  /**
   * Generate enhanced summary with more details
   */
  generateEnhancedSummary(tab, project) {
    const domain = this.extractDomain(tab.url);

    const enhancedSummaries = {
      'linkedin.com': `LinkedIn professional network helps with ${project.intent} by connecting you with recruiters, industry leaders, and relevant job postings.`,
      'indeed.com': `Indeed aggregates job listings from across the web, making it easier for ${project.intent} by providing filters and salary information.`,
      'github.com': `GitHub hosts open-source ${project.intent} projects, allowing developers to collaborate, learn from code, and contribute to the community.`,
      'amazon.com': `Amazon e-commerce platform offers extensive ${project.intent} options with customer reviews, competitive pricing, and fast shipping.`,
      'phaser.io': `Phaser is a robust HTML5 game framework perfect for ${project.intent}, supporting both Canvas and WebGL rendering for 2D games.`,
      'webglfundamentals.org': `WebGL Fundamentals provides comprehensive tutorials for ${project.intent}, covering 3D graphics programming from basics to advanced techniques.`
    };

    return enhancedSummaries[domain] || `${tab.title} provides valuable resources and tools for ${project.intent}, helping you achieve your goals efficiently.`;
  }

  /**
   * Switch between views
   */
  switchView(view) {
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('detail-view');
    const timelineView = document.getElementById('timeline-view');

    mainView.classList.remove('active');
    detailView.classList.remove('active');
    timelineView.classList.remove('active');

    if (view === 'main') {
      mainView.classList.add('active');
    } else if (view === 'detail') {
      detailView.classList.add('active');
    } else if (view === 'timeline') {
      timelineView.classList.add('active');
    }

    this.currentView = view;
  }

  /**
   * Format URL for display
   */
  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Truncate title to max words and make it readable
   */
  truncateTitle(title, maxWords = 4) {
    if (!title) return 'Untitled';

    // Remove common prefixes and clean up
    let cleanTitle = title
      .replace(/^https?:\/\/(www\.)?/, '') // Remove URLs
      .replace(/\s*[\|\-\–\:]\s*.*/g, '') // Remove everything after separators
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Split into words
    const words = cleanTitle.split(' ');

    // If already short enough, return as is
    if (words.length <= maxWords) {
      return this.capitalizeWords(cleanTitle);
    }

    // Take first maxWords words
    const truncated = words.slice(0, maxWords).join(' ');

    // Add ellipsis if truncated
    return this.capitalizeWords(truncated) + '...';
  }

  /**
   * Capitalize each word in a title
   */
  capitalizeWords(text) {
    return text
      .split(' ')
      .map(word => {
        // Don't capitalize small connecting words if not first word
        const smallWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in'];
        if (smallWords.includes(word.toLowerCase()) && text.indexOf(word) !== 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Generate smart intent from title
   */
  generateSmartIntent(title) {
    const keywords = {
      'job': 'Job Search',
      'career': 'Job Search',
      'linkedin': 'Job Search',
      'indeed': 'Job Search',
      'github': 'Development',
      'code': 'Development',
      'programming': 'Development',
      'stackoverflow': 'Development',
      'learn': 'Learning',
      'tutorial': 'Learning',
      'course': 'Learning',
      'education': 'Learning',
      'shop': 'Shopping',
      'buy': 'Shopping',
      'amazon': 'Shopping',
      'product': 'Shopping',
      'news': 'Reading',
      'article': 'Reading',
      'blog': 'Reading'
    };

    const lowerTitle = title.toLowerCase();

    for (const [keyword, intent] of Object.entries(keywords)) {
      if (lowerTitle.includes(keyword)) {
        return intent;
      }
    }

    // Default: use first 2 words from title
    const words = title.split(' ').filter(w => w.length > 2);
    return words.slice(0, 2).join(' ') || 'General';
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
   * Add new project
   */
  async addProject(title, intent) {
    const result = await this.storageManager.addProject({
      title,
      subtitle: intent,
      intent,
      section: 'today'
    });

    if (result.success) {
      await this.loadProjects();
      this.renderProjects();
      return result.project;
    }

    return null;
  }

  /**
   * Add new project with a tab
   */
  async addProjectWithTab(title, intent, tabInfo) {
    // Create the tab object
    const newTab = {
      id: Date.now().toString() + Math.random(),
      title: tabInfo.title || 'Untitled',
      url: tabInfo.url,
      favicon: tabInfo.favicon || '🔗',
      timestamp: new Date().toISOString()
    };

    // Create project with the tab
    const result = await this.storageManager.addProject({
      title,
      subtitle: intent,
      intent,
      section: 'today',
      tabs: [newTab]
    });

    if (result.success) {
      await this.loadProjects();
      this.renderProjects();
      return result.project;
    }

    return null;
  }

  /**
   * Clear all projects
   */
  async clearAllProjects() {
    const confirmed = confirm('Are you sure you want to clear all projects? This action cannot be undone.');

    if (confirmed) {
      await this.storageManager.clearAllData();
      await this.loadProjects();
      this.renderProjects();
      this.showToast('All projects cleared', 'success');
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.TabManager = TabManager;
}
