/**
 * Chrome Storage Utility Module
 * Provides shared methods for interacting with Chrome Storage API
 */

/**
 * Load data from Chrome Storage
 */
export const loadFromStorage = async (key) => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    console.warn('Chrome Storage API not available');
    return null;
  }
  try {
    const result = await chrome.storage.local.get(key);
    return result[key];
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return null;
  }
};

/**
 * Save data to Chrome Storage
 */
export const saveToStorage = async (key, value) => {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    console.warn('Chrome Storage API not available');
    return;
  }
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    throw error;
  }
};

/**
 * Clear all data from Chrome Storage
 */
export const clearStorage = async () => {
  try {
    await chrome.storage.local.clear();
    console.log('Chrome storage cleared!');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};