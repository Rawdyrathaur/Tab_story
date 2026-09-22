import type Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Folder, SavedTab } from './db';

export const LEGACY_MIGRATION = 'chrome-storage-v1';
type MigrationDB = Dexie & {
  tabs: Table<SavedTab>;
  folders: Table<Folder>;
  migrationState: Table<{ id: string }, string>;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
function timestamp(value: unknown, fallback: number): number {
  const at = typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isSafeInteger(at) && at > 0 && at <= 8640000000000000 ? at : fallback;
}

/** Original Chrome storage stays untouched, including unsupported legacy fields. */
export async function migrateLegacyStorage(db: MigrationDB) {
  if (await db.migrationState.get(LEGACY_MIGRATION)) return;
  const legacy = await chrome.storage.local.get(['tab_projects', 'tab_items']);
  // A failed storage read or transaction must not mark migration as complete.
  await db.transaction('rw', db.tabs, db.folders, db.migrationState, async () => {
    // Serialize competing worker/panel initializations through this transaction.
    if (await db.migrationState.get(LEGACY_MIGRATION)) return;
    const now = Date.now();
    const seen = new Set<string>();
    const projects = Array.isArray(legacy.tab_projects) ? legacy.tab_projects : [];
    const projectFolders = new Map<string, number>();
    async function addTab(value: unknown, folderId?: number) {
      const tab = record(value);
      let url: URL;
      try { url = new URL(text(tab.url)); } catch { return; }
      if (!['http:', 'https:'].includes(url.protocol)) return;
      // The same tab can be represented in both legacy containers.
      const key = JSON.stringify([folderId, tab.id ?? tab.url]);
      if (seen.has(key)) return;
      seen.add(key);
      const domain = url.hostname.replace(/^www\./, '');
      if (folderId === undefined) {
        const existing = await db.folders.where('domain').equals(domain).first();
        folderId = existing?.id ?? Number(await db.folders.add({ name: domain, domain, createdAt: now }));
      }
      await db.tabs.add({
        url: url.href, title: text(tab.title, url.href), domain, folderId,
        favicon: text(tab.favIconUrl, text(tab.favicon)),
        tags: Array.isArray(tab.tags) ? tab.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        notes: text(tab.notes), pinned: tab.pinned === true,
        createdAt: timestamp(tab.createdAt ?? tab.timestamp, now),
        deletedAt: tab.removed === true ? timestamp(tab.removedAt, now) : undefined,
        completedAt: tab.completed === true ? timestamp(tab.completedAt, now) : undefined,
      });
    }
    for (const value of projects) {
      const project = record(value);
      if (!Object.keys(project).length) continue;
      const id = Number(await db.folders.add({
        name: text(project.name, 'Imported project'), domain: '',
        createdAt: timestamp(project.createdAt, now),
      }));
      if (project.id !== undefined) projectFolders.set(String(project.id), id);
      if (Array.isArray(project.tabs)) for (const tab of project.tabs) await addTab(tab, id);
    }
    if (Array.isArray(legacy.tab_items)) {
      for (const item of legacy.tab_items) {
        const tab = record(item);
        await addTab(tab, projectFolders.get(String(tab.projectId)));
      }
    }
    await db.migrationState.put({ id: LEGACY_MIGRATION });
  });
}
