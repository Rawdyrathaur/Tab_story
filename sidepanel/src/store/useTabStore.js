import { create } from 'zustand';
import { useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storage';
import { DEFAULT_TIME_SECTIONS } from '../constants/time';

// Initial empty state
const initialState = {
  tabs: [],
  folders: [], // Will be populated from tab_projects
  tags: [],
  timeSections: DEFAULT_TIME_SECTIONS,
  selectedFolder: null,
  selectedTab: null,
  searchQuery: '',
  activeFilter: null,
  isPopupOpen: false,
  popupPosition: { x: 0, y: 0 },
  isLoading: true,
};

// Helper function to load from Chrome Storage
const loadFromStorage = async (key) => {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return null;
  }
  try {
    const result = await chrome.storage.local.get(key);
    return result[key];
  } catch (error) {
    return null;
  }
};

// Helper function to save to Chrome Storage
const saveToStorage = async (key, value) => {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    // Silently fail in production
  }
};

// Helper to convert projects to folder structure
const projectsToFolders = (projects) => {
  if (!Array.isArray(projects)) return [];

  return projects.map((project) => ({
    id: project.id || `folder-${Date.now()}`,
    name: project.title || project.intent || 'Untitled',
    icon: 'folder',
    expanded: false,
    intent: project.intent,
    tabs: project.tabs || [],
    createdAt: project.createdAt,
    section: project.section,
  }));
};

// Helper to group tabs by time
const groupTabsByTime = (tabs) => {
  const groups = {
    today: { id: 'today', label: 'TODAY', tabs: [] },
    yesterday: { id: 'yesterday', label: 'YESTERDAY', tabs: [] },
    week: { id: 'week', label: 'THIS WEEK', tabs: [] },
    older: { id: 'older', label: 'OLDER', tabs: [] },
  };

  const now = Date.now();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - (24 * 60 * 60 * 1000);
  const week = today - (7 * 24 * 60 * 60 * 1000);

  tabs.forEach((tab) => {
    const tabTimestamp = tab.timestamp || tab.createdAt || Date.now();

    if (tabTimestamp >= today) {
      groups.today.tabs.push(tab);
    } else if (tabTimestamp >= yesterday) {
      groups.yesterday.tabs.push(tab);
    } else if (tabTimestamp >= week) {
      groups.week.tabs.push(tab);
    } else {
      groups.older.tabs.push(tab);
    }
  });

  return groups;
};

export const useTabStore = create((set, get) => ({
  ...initialState,

  // Initialize store with data from Chrome Storage
  initialize: async () => {
    set({ isLoading: true });

    const [projects, tabs, tags, timeline] = await Promise.all([
      loadFromStorage(STORAGE_KEYS.PROJECTS),
      loadFromStorage(STORAGE_KEYS.TABS),
      loadFromStorage(STORAGE_KEYS.TAGS),
      loadFromStorage(STORAGE_KEYS.TIMELINE),
    ]);

    const folders = projectsToFolders(projects || []);
    const allTabs = [...(tabs || []), ...(timeline || [])];

    set({
      folders,
      tabs: allTabs,
      tags: tags || [],
      timeSections: groupTabsByTime(allTabs),
      isLoading: false,
    });
  },

  // Actions
  setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),

  setSelectedTab: (tab) => set({ selectedTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),

  setPopupOpen: (isOpen, tab = null, position = { x: 0, y: 0 }) =>
    set({
      isPopupOpen: isOpen,
      selectedTab: tab,
      popupPosition: position,
    }),

  toggleFolder: (folderId) =>
    set((state) => {
      const toggleRecursive = (folders) =>
        folders.map((folder) => {
          if (folder.id === folderId) {
            const newExpanded = !folder.expanded;
            // Save expanded state to storage
            saveToStorage(STORAGE_KEYS.PROJECTS, folders);
            return { ...folder, expanded: newExpanded };
          }
          if (folder.children && folder.children.length > 0) {
            return { ...folder, children: toggleRecursive(folder.children) };
          }
          return folder;
        });

      return { folders: toggleRecursive(state.folders) };
    }),

  addFolder: (name, intent = '') =>
    set((state) => {
      const newFolder = {
        id: `folder-${Date.now()}`,
        name,
        intent,
        icon: 'folder',
        expanded: false,
        tabs: [],
        createdAt: new Date().toISOString(),
        section: 'today',
      };

      const newFolders = [...state.folders, newFolder];
      saveToStorage(STORAGE_KEYS.PROJECTS, newFolders);

      return { folders: newFolders };
    }),

  deleteFolder: (folderId) =>
    set((state) => {
      const newFolders = state.folders.filter((folder) => folder.id !== folderId);
      saveToStorage(STORAGE_KEYS.PROJECTS, newFolders);

      return {
        folders: newFolders,
        selectedFolder: state.selectedFolder === folderId ? null : state.selectedFolder,
      };
    }),

  addTabToFolder: (folderId, tab) =>
    set((state) => {
      const addToFolderRecursive = (folders) =>
        folders.map((folder) => {
          if (folder.id === folderId) {
            return {
              ...folder,
              tabs: [...(folder.tabs || []), tab],
            };
          }
          if (folder.children && folder.children.length > 0) {
            return {
              ...folder,
              children: addToFolderRecursive(folder.children),
            };
          }
          return folder;
        });

      const newFolders = addToFolderRecursive(state.folders);
      const newTabs = [...state.tabs, tab];

      saveToStorage(STORAGE_KEYS.PROJECTS, newFolders);
      saveToStorage(STORAGE_KEYS.TABS, newTabs);

      return {
        folders: newFolders,
        tabs: newTabs,
        timeSections: groupTabsByTime(newTabs),
      };
    }),

  updateTabStatus: (tabId, status) =>
    set((state) => {
      const newTabs = state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, status } : tab,
      );

      saveToStorage(STORAGE_KEYS.TABS, newTabs);

      return {
        tabs: newTabs,
        timeSections: groupTabsByTime(newTabs),
      };
    }),

  addTag: (tag) =>
    set((state) => {
      if (state.tags.includes(tag)) return state;

      const newTags = [...state.tags, tag];
      saveToStorage(STORAGE_KEYS.TAGS, newTags);

      return { tags: newTags };
    }),

  removeTag: (tag) =>
    set((state) => {
      const newTags = state.tags.filter((t) => t !== tag);
      saveToStorage(STORAGE_KEYS.TAGS, newTags);

      return { tags: newTags };
    }),

  syncWithChrome: async () => {
    await get().initialize();
  },

  // Capture all tabs from Chrome and save to storage
  captureTabs: async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.warn('Chrome Tabs API not available');
      return;
    }

    try {
      const chromeTabs = await chrome.tabs.query({});
      const savedTabs = chromeTabs
        .filter(tab => tab.url && !tab.url.startsWith('chrome://'))
        .map(tab => ({
          id: `tab-${tab.id}`,
          chromeId: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url,
          domain: new URL(tab.url).hostname,
          favicon: tab.favIconUrl || '',
          status: 'To Explore',
          timestamp: Date.now(),
          tags: [],
          active: tab.active,
        }));

      // Save to storage
      await saveToStorage(STORAGE_KEYS.TABS, savedTabs);

      // Update store
      set({
        tabs: savedTabs,
        timeSections: groupTabsByTime(savedTabs),
      });

      return savedTabs;
    } catch (error) {
      // Silently fail
    }
  },

  // Add a single tab from Chrome
  addTabFromChrome: async (chromeTab) => {
    const newTab = {
      id: `tab-${chromeTab.id}`,
      chromeId: chromeTab.id,
      title: chromeTab.title || 'Untitled',
      url: chromeTab.url,
      domain: new URL(chromeTab.url).hostname,
      favicon: chromeTab.favIconUrl || '',
      status: 'To Explore',
      timestamp: Date.now(),
      tags: [],
      active: chromeTab.active,
    };

    const currentTabs = get().tabs;
    const updatedTabs = [...currentTabs, newTab];

    await saveToStorage(STORAGE_KEYS.TABS, updatedTabs);

    set({
      tabs: updatedTabs,
      timeSections: groupTabsByTime(updatedTabs),
    });

    return newTab;
  },

  // Remove a tab
  removeTab: (tabId) =>
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId);
      saveToStorage(STORAGE_KEYS.TABS, newTabs);

      return {
        tabs: newTabs,
        timeSections: groupTabsByTime(newTabs),
      };
    }),
}));

// Hook to initialize store on mount
export const useInitializeStore = () => {
  const initialize = useTabStore((state) => state.initialize);

  useEffect(() => {
    initialize();

    // Listen for storage changes from other parts of the extension
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorageChange = (changes, areaName) => {
        if (areaName === 'local') {
          Object.keys(changes).forEach((key) => {
            if (Object.values(STORAGE_KEYS).includes(key)) {
              initialize(); // Re-sync when storage changes
            }
          });
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [initialize]);
};
