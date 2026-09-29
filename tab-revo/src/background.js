console.log('🛠️ [Tab Revo] Background script loaded successfully!');

// 1. Listen for when the extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 [Tab Revo] Extension installed/updated.');

  // Try to set the default behavior natively
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log('✅ [Tab Revo] Panel behavior set: openPanelOnActionClick = true'))
    .catch((error) => console.error('❌ [Tab Revo] Error setting panel behavior:', error));
});

// 2. Fallback: Listen for the physical click and FORCE the panel open
chrome.action.onClicked.addListener((tab) => {
  console.log(
    '🖱️ [Tab Revo] Icon clicked! Attempting to force-open panel for Window ID:',
    tab.windowId
  );

  chrome.sidePanel
    .open({ windowId: tab.windowId })
    .then(() => console.log('✅ [Tab Revo] Side panel forced open successfully!'))
    .catch((error) => console.error('❌ [Tab Revo] Error forcing side panel open:', error));
});
