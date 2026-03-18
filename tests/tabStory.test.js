"use strict";

/**
 * Tests for Tab Story — Storage & Core Logic
 *
 * Since the extension uses chrome.storage APIs and Chrome-specific globals,
 * we mock them here so Jest can run these tests in Node without a browser.
 */

// ─── Mock chrome API ───────────────────────────────────────────────────────
const mockStorage = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach((k) => {
          if (mockStorage[k] !== undefined) result[k] = mockStorage[k];
        });
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        Object.assign(mockStorage, items);
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach((k) => delete mockStorage[k]);
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    lastError: null,
  },
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("StorageManager integration", () => {
  let StorageManager;
  let storageManager;

  beforeAll(() => {
    global.window = global.window || {};
    require("../scripts/storage-manager.js");
    StorageManager = global.window.StorageManager;
  });

  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();
    storageManager = new StorageManager();
  });

  test("addProject and getProjects works", async () => {
    const project = await storageManager.addProject({ title: "Test", intent: "Test" });
    expect(project.success).toBe(true);
    expect(project.project.title).toBe("Test");

    const projects = await storageManager.getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe("Test");
  });

  test("addTabToProject and removeTabFromProject + undoRemoveTab works", async () => {
    const projectResult = await storageManager.addProject({ title: "Test", intent: "Test" });
    const projectId = projectResult.project.id;

    const addTabResult = await storageManager.addTabToProject(projectId, { title: "Tab", url: "https://example.com" });
    expect(addTabResult.success).toBe(true);
    expect(addTabResult.tab).toBeDefined();

    const projects = await storageManager.getProjects();
    expect(projects[0].tabs).toHaveLength(1);

    const tabId = projects[0].tabs[0].id;
    await storageManager.removeTabFromProject(projectId, tabId);
    let afterRemove = await storageManager.getProjects();
    expect(afterRemove[0].tabs[0].removed).toBe(true);

    const undo = await storageManager.undoRemoveTab(projectId, tabId);
    expect(undo.success).toBe(true);
    const afterUndo = await storageManager.getProjects();
    expect(afterUndo[0].tabs[0].removed).toBeUndefined();
  });

  test("cleanupRemovedTabs deletes old removed tabs and empty projects", async () => {
    const projectResult = await storageManager.addProject({ title: "Test2", intent: "Test2" });
    const projectId = projectResult.project.id;
    await storageManager.addTabToProject(projectId, { title: "Tab2", url: "https://example2.com" });

    let projects = await storageManager.getProjects();
    const tabId = projects[0].tabs[0].id;
    const now = new Date();
    const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    projects[0].tabs[0].removed = true;
    projects[0].tabs[0].removedAt = oldDate;
    await storageManager.saveProjects(projects);

    const cleanupResult = await storageManager.cleanupRemovedTabs();
    expect(cleanupResult.success).toBe(true);

    const finalProjects = await storageManager.getProjects();
    expect(finalProjects).toHaveLength(0);
  });

  test("getStorageUsage returns structured usage object", async () => {
    await storageManager.addProject({ title: "Usage1", intent: "Usage" });
    const usage = await storageManager.getStorageUsage();
    expect(usage.success).toBe(true);
    expect(usage.usage).toBeDefined();
    expect(typeof usage.usage.total).toBe("number");
  });
});

describe("Chrome Storage Mock", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();
  });
  test("creates a tab group with correct name", () => {
    const group = createTabGroup("Job Search");
    expect(group.name).toBe("Job Search");
    expect(group.tabs).toEqual([]);
    expect(group.id).toBeDefined();
    expect(group.createdAt).toBeDefined();
  });

  test("trims whitespace from group name", () => {
    const group = createTabGroup("  Learning React  ");
    expect(group.name).toBe("Learning React");
  });

  test("throws error when name is empty", () => {
    expect(() => createTabGroup("")).toThrow("Tab group name is required");
  });

  test("throws error when name is only spaces", () => {
    expect(() => createTabGroup("   ")).toThrow("Tab group name is required");
  });

  test("creates group with initial tabs", () => {
    const tabs = [{ id: 1, url: "https://example.com", title: "Example" }];
    const group = createTabGroup("Shopping", tabs);
    expect(group.tabs).toHaveLength(1);
    expect(group.tabs[0].url).toBe("https://example.com");
  });

  test("each group gets a unique ID", () => {
    const g1 = createTabGroup("Group A");
    const g2 = createTabGroup("Group B");
    expect(g1.id).not.toBe(g2.id);
  });
});

describe("Tab Management", () => {
  let group;

  beforeEach(() => {
    group = createTabGroup("Research");
  });

  test("adds a tab to a group", () => {
    const tab = { id: 101, url: "https://github.com", title: "GitHub" };
    const updated = addTabToGroup(group, tab);
    expect(updated.tabs).toHaveLength(1);
    expect(updated.tabs[0].url).toBe("https://github.com");
  });

  test("preserves existing tabs when adding a new one", () => {
    const tab1 = { id: 1, url: "https://google.com", title: "Google" };
    const tab2 = { id: 2, url: "https://github.com", title: "GitHub" };
    let updated = addTabToGroup(group, tab1);
    updated = addTabToGroup(updated, tab2);
    expect(updated.tabs).toHaveLength(2);
  });

  test("throws error when tab has no URL", () => {
    expect(() => addTabToGroup(group, { id: 1, title: "No URL" })).toThrow(
      "Tab must have a URL"
    );
  });

  test("removes a tab from a group by ID", () => {
    const tab = { id: 55, url: "https://example.com", title: "Example" };
    let updated = addTabToGroup(group, tab);
    updated = removeTabFromGroup(updated, 55);
    expect(updated.tabs).toHaveLength(0);
  });

  test("does not remove other tabs when removing one", () => {
    const tab1 = { id: 1, url: "https://a.com", title: "A" };
    const tab2 = { id: 2, url: "https://b.com", title: "B" };
    let updated = addTabToGroup(group, tab1);
    updated = addTabToGroup(updated, tab2);
    updated = removeTabFromGroup(updated, 1);
    expect(updated.tabs).toHaveLength(1);
    expect(updated.tabs[0].id).toBe(2);
  });

  test("removing non-existent tab ID changes nothing", () => {
    const tab = { id: 1, url: "https://a.com", title: "A" };
    let updated = addTabToGroup(group, tab);
    updated = removeTabFromGroup(updated, 999);
    expect(updated.tabs).toHaveLength(1);
  });
});

describe("Tab Search", () => {
  let groups;

  beforeEach(() => {
    groups = [
      {
        name: "Work",
        tabs: [
          { id: 1, title: "GitHub Issues", url: "https://github.com/issues" },
          { id: 2, title: "Jira Board", url: "https://jira.example.com" },
        ],
      },
      {
        name: "Learning",
        tabs: [
          { id: 3, title: "MDN Web Docs", url: "https://developer.mozilla.org" },
          { id: 4, title: "React Docs", url: "https://react.dev" },
        ],
      },
    ];
  });

  test("finds tabs matching title query", () => {
    const results = searchTabs(groups, "github");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("GitHub Issues");
  });

  test("finds tabs matching URL query", () => {
    const results = searchTabs(groups, "mozilla");
    expect(results).toHaveLength(1);
    expect(results[0].url).toContain("mozilla");
  });

  test("search is case-insensitive", () => {
    const results = searchTabs(groups, "REACT");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("React Docs");
  });

  test("returns empty array for empty query", () => {
    const results = searchTabs(groups, "");
    expect(results).toHaveLength(0);
  });

  test("returns empty array when no match found", () => {
    const results = searchTabs(groups, "xyz_no_match_xyz");
    expect(results).toHaveLength(0);
  });

  test("includes group name in search results", () => {
    const results = searchTabs(groups, "jira");
    expect(results[0].groupName).toBe("Work");
  });
});

describe("Intent Sanitization", () => {
  test("trims whitespace from intent", () => {
    expect(sanitizeIntent("  Job Search  ")).toBe("Job Search");
  });

  test("removes HTML tags from intent", () => {
    expect(sanitizeIntent("<script>alert(1)</script>")).toBe("alert(1)");
  });

  test("returns empty string for null input", () => {
    expect(sanitizeIntent(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(sanitizeIntent(undefined)).toBe("");
  });

  test("truncates intent to 100 characters", () => {
    const longIntent = "a".repeat(150);
    expect(sanitizeIntent(longIntent)).toHaveLength(100);
  });

  test("preserves normal intent string", () => {
    expect(sanitizeIntent("Learning React")).toBe("Learning React");
  });
});

describe("Timestamp Formatting", () => {
  test("formats a valid timestamp to ISO string", () => {
    const ts = new Date("2024-01-15T10:00:00.000Z").getTime();
    const result = formatTimestamp(ts);
    expect(result).toBe("2024-01-15T10:00:00.000Z");
  });

  test("returns invalid date message for null", () => {
    expect(formatTimestamp(null)).toBe("Invalid date");
  });

  test("returns invalid date message for NaN", () => {
    expect(formatTimestamp(NaN)).toBe("Invalid date");
  });
});

describe("Group Merging", () => {
  test("merges tabs from two groups", () => {
    const g1 = createTabGroup("Group A");
    const g2 = createTabGroup("Group B");
    const tab1 = { id: 1, url: "https://a.com", title: "A" };
    const tab2 = { id: 2, url: "https://b.com", title: "B" };
    const a = addTabToGroup(g1, tab1);
    const b = addTabToGroup(g2, tab2);
    const merged = mergeGroups(a, b);
    expect(merged.tabs).toHaveLength(2);
    expect(merged.name).toBe("Group A");
  });

  test("merged group keeps original group name", () => {
    const g1 = createTabGroup("Primary");
    const g2 = createTabGroup("Secondary");
    const merged = mergeGroups(g1, g2);
    expect(merged.name).toBe("Primary");
  });
});

describe("Chrome Storage Mock", () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  test("stores and retrieves a value", async () => {
    await chrome.storage.local.set({ testKey: "testValue" });
    const result = await chrome.storage.local.get(["testKey"]);
    expect(result.testKey).toBe("testValue");
  });

  test("removes a stored value", async () => {
    await chrome.storage.local.set({ removeMe: "value" });
    await chrome.storage.local.remove(["removeMe"]);
    const result = await chrome.storage.local.get(["removeMe"]);
    expect(result.removeMe).toBeUndefined();
  });

  test("stores multiple tab groups", async () => {
    const groups = [
      createTabGroup("Work"),
      createTabGroup("Shopping"),
    ];
    await chrome.storage.local.set({ tabGroups: groups });
    const result = await chrome.storage.local.get(["tabGroups"]);
    expect(result.tabGroups).toHaveLength(2);
    expect(result.tabGroups[0].name).toBe("Work");
  });
});

describe("StorageManager integration", () => {
  let StorageManager;
  let storageManager;

  beforeAll(() => {
    global.window = global.window || {};
    require("../scripts/storage-manager.js");
    StorageManager = global.window.StorageManager;
  });

  beforeEach(async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    jest.clearAllMocks();
    storageManager = new StorageManager();
  });

  test("addProject and getProjects works", async () => {
    const project = await storageManager.addProject({ title: "Test", intent: "Test" });
    expect(project.success).toBe(true);
    expect(project.project.title).toBe("Test");

    const projects = await storageManager.getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].title).toBe("Test");
  });

  test("addTabToProject and removeTabFromProject + undoRemoveTab works", async () => {
    const projectResult = await storageManager.addProject({ title: "Test", intent: "Test" });
    const projectId = projectResult.project.id;

    const addTabResult = await storageManager.addTabToProject(projectId, { title: "Tab", url: "https://example.com" });
    expect(addTabResult.success).toBe(true);
    expect(addTabResult.tab).toBeDefined();

    const projects = await storageManager.getProjects();
    expect(projects[0].tabs).toHaveLength(1);

    const tabId = projects[0].tabs[0].id;
    await storageManager.removeTabFromProject(projectId, tabId);
    let afterRemove = await storageManager.getProjects();
    expect(afterRemove[0].tabs[0].removed).toBe(true);

    const undo = await storageManager.undoRemoveTab(projectId, tabId);
    expect(undo.success).toBe(true);
    let afterUndo = await storageManager.getProjects();
    expect(afterUndo[0].tabs[0].removed).toBeUndefined();
  });

  test("cleanupRemovedTabs deletes old removed tabs and empty projects", async () => {
    const projectResult = await storageManager.addProject({ title: "Test2", intent: "Test2" });
    const projectId = projectResult.project.id;
    await storageManager.addTabToProject(projectId, { title: "Tab2", url: "https://example2.com" });

    let projects = await storageManager.getProjects();
    const tabId = projects[0].tabs[0].id;
    // mark as removed and old
    const now = new Date();
    const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    projects[0].tabs[0].removed = true;
    projects[0].tabs[0].removedAt = oldDate;
    await storageManager.saveProjects(projects);

    const cleanupResult = await storageManager.cleanupRemovedTabs();
    expect(cleanupResult.success).toBe(true);

    const finalProjects = await storageManager.getProjects();
    expect(finalProjects).toHaveLength(0);
  });

  test("getStorageUsage returns structured usage object", async () => {
    await storageManager.addProject({ title: "Usage1", intent: "Usage" });
    const usage = await storageManager.getStorageUsage();
    expect(usage.success).toBe(true);
    expect(usage.usage).toBeDefined();
    expect(typeof usage.usage.total).toBe("number");
  });
});
