/**
 * Tab Story - Background Service Worker
 * Handles Chrome extension background tasks and side panel management
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      user_settings: {
        darkMode: false,
        compactView: false
      }
    });

    // Open side panel on installation
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch(error => console.error('Side panel setup error:', error));
  }

  // Create context menu items
  if (chrome.contextMenus) {
    try {
      chrome.contextMenus.removeAll(() => {
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
      });
    } catch (error) {
      console.error('Context menus setup error:', error);
    }
  }
});

// Handle action button click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
  // Tab created - logged for timeline only
});

// Track new tabs awaiting intent
const newTabsAwaitingIntent = new Set();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    logTabActivity(tab).catch(() => {});
  }
});

/**
 * Check if tab needs intent capture
 */
function isNewTabNeedingIntent(tab) {
  if (!tab.url) return false;
  if (tab.url.startsWith('chrome://')) return false;
  if (tab.url.startsWith('chrome-extension://')) return false;
  if (tab.url.startsWith('about:')) return false;
  if (tab.url === 'chrome://newtab/') return false;

  return tab.url.startsWith('http://') || tab.url.startsWith('https://');
}

/**
 * Show intent capture modal for a tab
 */
async function showIntentCaptureForTab(tabId) {
  try {
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'showIntentCapture'
        });
      } catch (messageError) {
        // Silently fail if content script not available
      }
    }, 1000);
  } catch (error) {
    console.error('Could not inject intent capture:', error);
  }
}

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Tab removed - could auto-archive tab data here
});

// Listen for tab activation
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

    await chrome.storage.local.set({ tab_timeline: timeline });
  } catch (error) {
    console.error('Failed to log tab activity:', error);
  }
}

/**
 * Handle messages from popup or content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureIntent') {
    handleIntentCapture(message.intent, sender.tab);
    sendResponse({ success: true });
  } else if (message.action === 'getTabInfo') {
    getTabInfo(message.tabId).then(sendResponse);
    return true;
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

    if (!intents.includes(intent)) {
      intents.unshift(intent);
      if (intents.length > 10) {
        intents.pop();
      }
      await chrome.storage.local.set({ recent_intents: intents });
    }
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
    const result = await chrome.storage.local.get('tab_projects');
    let projects = result.tab_projects || [];

    let project = projects.find(p => p.intent === intent || p.title === intent);

    if (!project) {
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

    const newTab = {
      id: Date.now().toString() + Math.random(),
      title: title || 'Untitled',
      url: url,
      favicon: tab?.favIconUrl || '🔗',
      timestamp: new Date().toISOString()
    };

    project.tabs.push(newTab);

    await chrome.storage.local.set({ tab_projects: projects });
    await handleIntentCapture(intent, tab);

    if (tab?.id) {
      newTabsAwaitingIntent.delete(tab.id);
    }

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
      // Show intent capture dialog
    } else if (info.menuItemId === 'add-to-project') {
      // Show project selection dialog
    }
  });
}
