/**
 * BrainMark - Background Service Worker
 * Handles Chrome extension background tasks and side panel management
 */


// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('BrainMark installed');

    // Set default settings
    chrome.storage.local.set({
      user_settings: {
        encryptData: false,
        autoClear: false,
        darkMode: false,
        compactView: false
      }
    });

    // Open side panel on installation
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(error => console.log('Side panel setup error:', error));

    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'welcome.html' });
  } else if (details.reason === 'update') {
    console.log('BrainMark updated to', chrome.runtime.getManifest().version);
  }

  // Create context menu items (on install or update)
  if (chrome.contextMenus) {
    try {
      // Remove all existing context menus first to avoid duplicates
      chrome.contextMenus.removeAll(() => {
        // Create context menu items
        chrome.contextMenus.create({
          id: 'save-to-intent',
          title: 'Save to Intent',
          contexts: ['page']
        });

        chrome.contextMenus.create({
          id: 'add-to-project',
          title: 'Add to Project',
          contexts: ['page']
        });

        console.log('Context menus created successfully');
      });
    } catch (error) {
      console.log('Context menus setup error:', error);
    }
  }
});

// Handle action button click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Open the side panel
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log('Side panel opened for tab:', tab.id);
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
  // Tab created - logged for timeline only
});

// Track new tabs to show intent capture
const newTabsAwaitingIntent = new Set();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Log tab activity for timeline (silently)
    logTabActivity(tab).catch(() => {});

    // Automatic intent capture disabled
    // Users manually add tabs using the AI Cluster button
  }
});

/**
 * Check if tab needs intent capture
 */
function isNewTabNeedingIntent(tab) {
  // Don't show on Chrome internal pages
  if (!tab.url) return false;
  if (tab.url.startsWith('chrome://')) return false;
  if (tab.url.startsWith('chrome-extension://')) return false;
  if (tab.url.startsWith('about:')) return false;
  if (tab.url === 'chrome://newtab/') return false;

  // Only show for actual web pages
  return tab.url.startsWith('http://') || tab.url.startsWith('https://');
}

/**
 * Show intent capture modal for a tab
 */
async function showIntentCaptureForTab(tabId) {
  try {
    // Wait a moment for page to stabilize
    setTimeout(async () => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'showIntentCapture'
        });
        console.log('Intent capture triggered for tab:', tabId);
      } catch (messageError) {
        // Silently fail if content script not available
        // This is expected for pages that don't have our content script
        console.debug('Content script not available for tab:', tabId);
      }
    }, 1000);
  } catch (error) {
    console.log('Could not inject intent capture:', error);
  }
}

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Tab removed - could auto-archive tab data here
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Tab activated - tracking for analytics
});

/**
 * Log tab activity to timeline
 */
async function logTabActivity(tab) {
  try {
    const result = await chrome.storage.local.get('tab_timeline');
    const timeline = result.tab_timeline || [];

    // Add new activity
    timeline.unshift({
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 activities
    if (timeline.length > 100) {
      timeline.length = 100;
    }

    // Save updated timeline
    await chrome.storage.local.set({ tab_timeline: timeline });
  } catch (error) {
    console.error('Failed to log tab activity:', error);
  }
}

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  if (message.action === 'captureIntent') {
    handleIntentCapture(message.intent, sender.tab);
    sendResponse({ success: true });
  } else if (message.action === 'getTabInfo') {
    getTabInfo(message.tabId).then(sendResponse);
    return true; // Indicates async response
  } else if (message.action === 'saveTabWithIntent') {
    saveTabWithIntent(message.intent, message.url, message.title, sender.tab).then(sendResponse);
    return true;
  } else if (message.action === 'getRecentIntents') {
    getRecentIntents().then(sendResponse);
    return true;
  }
});

/**
 * Handle intent capture
 */
async function handleIntentCapture(intent, tab) {
  try {
    const result = await chrome.storage.local.get('recent_intents');
    const intents = result.recent_intents || [];

    // Add new intent if not already present
    if (!intents.includes(intent)) {
      intents.unshift(intent);
      if (intents.length > 10) {
        intents.pop();
      }
      await chrome.storage.local.set({ recent_intents: intents });
    }

    console.log('Intent captured:', intent);
  } catch (error) {
    console.error('Failed to capture intent:', error);
  }
}

/**
 * Get tab information
 */
async function getTabInfo(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return {
      success: true,
      tab: {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl
      }
    };
  } catch (error) {
    console.error('Failed to get tab info:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save tab with intent
 */
async function saveTabWithIntent(intent, url, title, tab) {
  try {
    // Get existing projects
    const result = await chrome.storage.local.get('tab_projects');
    let projects = result.tab_projects || [];

    // Find or create project for this intent
    let project = projects.find(p => p.intent === intent || p.title === intent);

    if (!project) {
      // Create new project
      project = {
        id: Date.now().toString(),
        title: intent,
        subtitle: intent,
        intent: intent,
        tabs: [],
        section: 'today',
        createdAt: new Date().toISOString()
      };
      projects.push(project);
    }

    // Add tab to project
    const newTab = {
      id: Date.now().toString() + Math.random(),
      title: title || 'Untitled',
      url: url,
      favicon: tab?.favIconUrl || '🔗',
      timestamp: new Date().toISOString()
    };

    project.tabs.push(newTab);

    // Save updated projects
    await chrome.storage.local.set({ tab_projects: projects });

    // Add to recent intents
    await handleIntentCapture(intent, tab);

    // Remove from awaiting set
    if (tab?.id) {
      newTabsAwaitingIntent.delete(tab.id);
    }

    console.log('Tab saved with intent:', intent, url);

    return { success: true, project, tab: newTab };
  } catch (error) {
    console.error('Failed to save tab with intent:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent intents
 */
async function getRecentIntents() {
  try {
    const result = await chrome.storage.local.get('recent_intents');
    const intents = result.recent_intents || [];
    return { success: true, intents };
  } catch (error) {
    console.error('Failed to get recent intents:', error);
    return { success: false, intents: [] };
  }
}

/**
 * Handle context menu clicks
 */
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'save-to-intent') {
      console.log('Save to intent clicked for:', tab.url);
      // Show intent capture dialog
    } else if (info.menuItemId === 'add-to-project') {
      console.log('Add to project clicked for:', tab.url);
      // Show project selection dialog
    }
  });
}


// Export for debugging
console.log('BrainMark background service worker loaded');