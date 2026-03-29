import React from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const isDevelopment = import.meta.env.DEV;

/**
 * Load data from Chrome Storage
 */
const loadFromStorage = async (key) => {
  const result = await chrome.storage.local.get(key);
  return result[key];
};

/**
 * Save data to Chrome Storage
 */
const saveToStorage = async (key, value) => {
  await chrome.storage.local.set({ [key]: value });
};

/**
 * Extract all tabs from projects/folders
 */
const extractTabsFromProjects = (projects) => {
  const allTabs = [];
  if (Array.isArray(projects)) {
    projects.forEach((project) => {
      if (project.tabs && Array.isArray(project.tabs)) {
        allTabs.push(...project.tabs);
      }
    });
  }
  return allTabs;
};

/**
 * Toggle folder expanded state recursively
 */
const toggleFolderRecursive = (folders, targetId) => {
  return folders.map((folder) => {
    if (folder.id === targetId) {
      return { ...folder, expanded: !folder.expanded };
    }
    if (folder.children?.length > 0) {
      return { ...folder, children: toggleFolderRecursive(folder.children, targetId) };
    }
    return folder;
  });
};

/**
 * Tab Store - manages tab data
 */
export const useTabStore = create(
  devtools(
    (set) => ({
      // Data
      tabs: [],
      projects: [],
      folders: [],
      tags: [],

      // UI State
      activeTab: null,
      isLoading: false,
      error: null,

      // Actions
      setTabs: (tabs) => set({ tabs }),
      setProjects: (projects) => set({ projects }),
      setLoading: (bool) => set({ isLoading: bool }),
      setError: (err) => set({ error: err }),
      // Load data from storage and update state
      loadData: async () => {
        console.log('loadData: Fetching data...');
        try {
          const projects = await loadFromStorage('projects') || [];
          const tabs = extractTabsFromProjects(projects);
          console.log('loadData: Data fetched successfully', { projects, tabs });
          set({ projects, tabs, isLoading: false, error: null });
        } catch (err) {
          console.error('loadData: Error fetching data', err);
          set({ isLoading: false, error: 'Failed to load data' });
        }
      },
    }),
    { name: 'TabStore', enabled: isDevelopment }
  )
);

export default useTabStore;

/**
 * Folder Store - manages folder/tree state
 */
export const useFolderStore = create(
  devtools(
    (set) => ({
      folders: [],
      selectedFolder: null,

      setFolders: (folders) => set({ folders }),
      setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),
      toggleFolder: (folderId) => set((state) => {
        const newFolders = toggleFolderRecursive(state.folders, folderId);
        saveToStorage('tab_projects', newFolders);
        return { folders: newFolders };
      }),
      addFolder: (name, intent = '') => set((state) => {
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
        saveToStorage('tab_projects', newFolders);
        return { folders: newFolders };
      }),
      deleteFolder: (folderId) => set((state) => {
        const newFolders = state.folders.filter((folder) => folder.id !== folderId);
        saveToStorage('tab_projects', newFolders);
        return {
          folders: newFolders,
          selectedFolder: state.selectedFolder === folderId ? null : state.selectedFolder,
        };
      }),
      addTabToFolder: (folderId, tab) => set((state) => {
        const addToFolderRecursive = (folders) =>
          folders.map((folder) => {
            if (folder.id === folderId) {
              return { ...folder, tabs: [...(folder.tabs || []), tab] };
            }
            if (folder.children?.length > 0) {
              return { ...folder, children: addToFolderRecursive(folder.children) };
            }
            return folder;
          });

        const newFolders = addToFolderRecursive(state.folders);
        saveToStorage('tab_projects', newFolders);

        return { folders: newFolders };
      }),
    }),
    { name: 'FolderStore' }
  )
);

/**
 * UI Store - manages popup, filter, search state
 */
export const useUIStore = create(
  devtools(
    (set) => ({
      isPopupOpen: false,
      selectedTab: null,
      popupPosition: { x: 0, y: 0 },
      searchQuery: '',
      activeFilter: null,
      storageError: null,

      setPopupOpen: (isOpen, tab = null, position = { x: 0, y: 0 }) =>
        set({
          isPopupOpen: isOpen,
          selectedTab: tab,
          popupPosition: position,
        }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setStorageError: (error) => set({ storageError: error }),
    }),
    { name: 'UIStore' }
  )
);

/**
 * Tag Store - manages tags
 */
export const useTagStore = create(
  devtools(
    (set) => ({
      tags: [],

      setTags: (tags) => set({ tags }),
      addTag: (tag) => set((state) => {
        if (state.tags.includes(tag)) return state;
        const newTags = [...state.tags, tag];
        saveToStorage('recent_intents', newTags);
        return { tags: newTags };
      }),
      removeTag: (tag) => set((state) => {
        const newTags = state.tags.filter((t) => t !== tag);
        saveToStorage('recent_intents', newTags);
        return { tags: newTags };
      }),
    }),
    { name: 'TagStore' }
  )
);

/**
 * Hook to initialize store and listen for storage changes
 */
export const useInitializeStore = () => {
  const loadData = useTabStore((state) => state.loadData);

  React.useEffect(() => {
    loadData();

    if (typeof chrome !== 'undefined' && chrome.storage) {
      const handleStorageChange = (changes, areaName) => {
        if (areaName === 'local') {
          const changedKeys = Object.keys(changes);
          // Listen to relevant storage keys
          const relevantKeys = ['tab_projects', 'tab_timeline', 'recent_intents'];
          if (changedKeys.some((key) => relevantKeys.includes(key))) {
            loadData();
          }
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [loadData]);
};
