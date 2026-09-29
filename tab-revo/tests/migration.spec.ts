import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('1.1.1 data migrates atomically, preserves originals and does not duplicate on reopen', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`);
    await expect(page.getByRole('button', { name: 'Collections', exact: true })).toBeVisible();
    const result = await page.evaluate(async () => {
      const db = window.db;
      await db.open();
      const legacy = {
        tab_projects: [{ id: 'old-project', name: 'Research', createdAt: '2025-01-01T00:00:00Z', tabs: [
          { id: 'a', title: 'Kept page', url: 'https://example.com/a', notes: 'My notes', tags: ['study'], pinned: true, timestamp: '2025-02-01T00:00:00Z' },
          { id: 'b', title: 'Removed page', url: 'https://example.com/b', removed: true, removedAt: '2025-02-02T00:00:00Z' },
          { id: 'c', title: 'Completed page', url: 'https://example.com/c', completed: true, completedAt: '2025-02-03T00:00:00Z' },
          { id: 'unsafe', url: 'javascript:alert(1)' },
        ] }],
        tab_items: [{ id: 'a', projectId: 'old-project', url: 'https://example.com/a' }, { id: 'loose', url: 'https://other.example/page', title: 'Loose page' }],
        tab_timeline: [{ action: 'saved', timestamp: '2025-01-01' }],
      };
      await chrome.storage.local.set(legacy);
      await db.tabs.add({ url: 'https://new.example/', title: 'Existing v2 page', domain: 'new.example', tags: [], notes: '', pinned: false, favicon: '', createdAt: Date.now() });
      await db.migrationState.clear();
      // Force a partial import failure: both records and completion marker must roll back.
      const originalAdd = db.tabs.add.bind(db.tabs);
      let calls = 0;
      db.tabs.add = async (...args: Parameters<typeof originalAdd>) => {
        if (++calls === 2) throw new Error('Simulated interrupted migration');
        return originalAdd(...args);
      };
      db.close();
      let failed = false;
      try { await db.open(); } catch { failed = true; }
      db.tabs.add = originalAdd;
      // Inspect the actual stores without running the ready hook again.
      const native = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('TabStoryDB');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const read = (table: string) => new Promise<number>((resolve, reject) => {
        const request = native.transaction(table).objectStore(table).count();
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const rolledBack = { tabs: await read('tabs'), folders: await read('folders'), markers: await read('migrationState') };
      native.close();
      await db.open();
      const first = await db.tabs.toArray();
      const folders = await db.folders.toArray();
      db.close(); await db.open();
      const second = await db.tabs.toArray();
      const preserved = await chrome.storage.local.get(Object.keys(legacy));
      // Explicit deletion in v2 must not resurrect the old data next time.
      await db.tabs.clear(); db.close(); await db.open();
      return { failed, rolledBack, first, folders, second, preserved, legacy, afterDelete: await db.tabs.count() };
    });
    expect(result.failed).toBe(true);
    expect(result.rolledBack).toEqual({ tabs: 1, folders: 0, markers: 0 });
    expect(result.first).toHaveLength(5);
    expect(result.second).toEqual(result.first);
    expect(result.preserved).toEqual(result.legacy);
    expect(result.afterDelete).toBe(0);
    const folder = result.folders.find(f => f.name === 'Research');
    expect(folder).toBeTruthy();
    expect(result.first.find(t => t.title === 'Kept page')).toMatchObject({ folderId: folder!.id, notes: 'My notes', tags: ['study'], pinned: true, createdAt: Date.parse('2025-02-01T00:00:00Z') });
    expect(result.first.find(t => t.title === 'Removed page')?.deletedAt).toBe(Date.parse('2025-02-02T00:00:00Z'));
    expect(result.first.find(t => t.title === 'Completed page')?.completedAt).toBe(Date.parse('2025-02-03T00:00:00Z'));
  } finally { await context.close(); }
});
