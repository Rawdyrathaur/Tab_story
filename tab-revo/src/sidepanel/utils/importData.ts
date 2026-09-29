import { db, type SavedTab, type Folder } from '../db';
import { requestReminderReconciliation } from '../../reminders/service';

export async function importData(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid backup');
  const data = value as { tabs: SavedTab[]; folders: Folder[] };
  if (!Array.isArray(data.tabs) || !Array.isArray(data.folders)) throw new Error('Invalid backup');
  for (const folder of data.folders) if (!folder || typeof folder.domain !== 'string' || typeof folder.name !== 'string') throw new Error('Invalid folder');
  for (const tab of data.tabs) {
    if (!tab || typeof tab.url !== 'string' || !/^https?:\/\//i.test(tab.url) || typeof tab.title !== 'string' || !Array.isArray(tab.tags) || !tab.tags.every(tag => typeof tag === 'string')) throw new Error('Invalid tab');
    new URL(tab.url);
    for (const key of ['scheduledAt', 'completedAt', 'completedScheduledAt', 'deletedAt'] as const) if (tab[key] !== undefined && (!Number.isFinite(tab[key]) || tab[key]! < 0 || tab[key]! > 8640000000000000)) throw new Error('Invalid timestamp');
  }
  await db.transaction('rw', db.tabs, db.folders, async () => {
    const folderIds = new Map<number, number>();
    for (const folder of data.folders) {
      const existing = await db.folders.where('domain').equals(folder.domain).first();
      const id = existing?.id ?? await db.folders.add({ name: folder.name, domain: folder.domain, createdAt: Number.isFinite(folder.createdAt) ? folder.createdAt : Date.now() });
      if (folder.id !== undefined) folderIds.set(folder.id, Number(id));
    }
    for (const tab of data.tabs) {
      if (await db.tabs.where('url').equals(tab.url).first()) continue;
      let folderId = folderIds.get(tab.folderId!);
      const domain = new URL(tab.url).hostname;
      if (!folderId) {
        const folder = await db.folders.where('domain').equals(domain).first();
        folderId = folder?.id ?? Number(await db.folders.add({ name: domain, domain, createdAt: Date.now() }));
      }
      await db.tabs.add({ url: tab.url, title: tab.title, domain, favicon: typeof tab.favicon === 'string' ? tab.favicon : '', folderId, tags: tab.tags, notes: typeof tab.notes === 'string' ? tab.notes : '', pinned: !!tab.pinned, createdAt: Number.isFinite(tab.createdAt) ? tab.createdAt : Date.now(), scheduledAt: tab.scheduledAt, deletedAt: tab.deletedAt, completedAt: tab.completedAt, completedScheduledAt: tab.completedScheduledAt });
    }
  });
  await requestReminderReconciliation();
}
