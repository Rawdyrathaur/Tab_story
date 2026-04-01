/**
 * Storage Constants - Define all LocalStorage keys here
 * @version 1.0
 *
 * Usage:
 *   import { STORAGE } from '../constants/storage'
 *   Then: STORAGE.TABS or STORAGE.PROJECTS
 *
 * Example:
 *   chrome.storage.local.get({ [STORAGE.TABS]: [] })
 */

export const STORAGE = Object.freeze({
  TABS: {
    key: 'tab_items',
    description: 'All saved tabs',
    version: '1.0.0'
  },
  PROJECTS: {
    key: 'tab_projects',
    description: 'User projects/intents',
    version: '1.0.0'
  },
  TAGS: {
    key: 'recent_intents',
    description: 'Recent tags and labels',
    version: '1.0.0'
  },
  TIMELINE: {
    key: 'tab_timeline',
    description: 'Tab timeline history',
    version: '1.0.0'
  },
  SETTINGS: {
    key: 'user_settings',
    description: 'User preferences and settings',
    version: '1.0.0'
  }
});

// Helper for getting the actual storage key string
export function getStorageKey(storageConstant) {
  return storageConstant?.key ?? null;
}

// Export keys as plain strings for legacy compatibility
export const STORAGE_KEYS = Object.freeze({
  TABS: STORAGE.TABS.key,
  PROJECTS: STORAGE.PROJECTS.key,
  TAGS: STORAGE.TAGS.key,
  TIMELINE: STORAGE.TIMELINE.key,
  SETTINGS: STORAGE.SETTINGS.key
});

// Current storage version for migrations
export const STORAGE_VERSION = '1.2.0';
