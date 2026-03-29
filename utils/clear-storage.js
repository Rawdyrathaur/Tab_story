/**
 * Clear All Storage Data
 * Removes all data from Chrome Storage API and localStorage
 */
(async function clearAllData() {
  try {
    // Clear all chrome.storage.local
    await chrome.storage.local.clear();
    console.log('Chrome storage cleared successfully.');

    // Clear localStorage
    localStorage.clear();
    console.log('LocalStorage cleared successfully.');

    // Verify storage is empty
    const remainingData = await chrome.storage.local.get(null);
    if (Object.keys(remainingData).length === 0) {
      console.log('All data cleared successfully.');
    } else {
      console.warn('Some data still remains:', remainingData);
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
})();
