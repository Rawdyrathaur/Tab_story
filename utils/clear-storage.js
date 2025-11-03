/**
 * Clear All Storage Data - Paste this in the extension console
 * This will remove all dummy/fake data completely
 */

(async function clearAllData() {
  console.log('Starting to clear all data...');

  try {
    // Clear all chrome.storage.local
    await chrome.storage.local.clear();
    console.log('Chrome storage cleared!');

    // Clear localStorage if any
    localStorage.clear();
    console.log('LocalStorage cleared!');

    // Verify storage is empty
    const check = await chrome.storage.local.get(null);
    console.log('Storage after clearing:', check);

    if (Object.keys(check).length === 0) {
      console.log('ALL DATA SUCCESSFULLY CLEARED!');
      console.log('Reloading extension...');
      setTimeout(() => location.reload(), 1000);
    } else {
      console.log('Warning: Some data still exists:', check);
    }

  } catch (error) {
    console.error('Error clearing data:', error);
  }
})();
