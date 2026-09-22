import { db } from './db';
import { getDomain, getFavicon } from './utils/url';
import { updateTab, writeTab } from '../sync/client';

export async function createCollection(name: string, category: string) {
  name = name.trim();
  if (!name || name.length > 100) throw new Error('Enter a collection name (up to 100 characters).');
  return Number(await db.collections.add({ name, category: category.trim().slice(0, 100), tabIds: [], createdAt: Date.now() }));
}

export async function addToCollection(id: number, sources: { url: string; title: string; favicon?: string }[]) {
  await db.transaction('rw', db.collections, db.tabs, db.folders, db.syncOutbox, async () => {
    const collection = await db.collections.get(id);
    if (!collection) throw new Error('This collection no longer exists.');
    const members = new Set(collection.tabIds);
    for (const source of sources) {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS pages can be collected.');
      const tab = await db.tabs.where('url').equals(source.url).first();
      if (tab?.deletedAt) await updateTab(tab.id!, { deletedAt: undefined });
      if (!tab) {
        const domain = getDomain(source.url);
        let folder = await db.folders.where('domain').equals(domain).first();
        if (!folder) {
          const folderId = Number(await db.folders.add({ name: domain, domain, createdAt: Date.now() }));
          folder = { id: folderId, name: domain, domain, createdAt: Date.now() };
        }
        const tabId = await writeTab({ url: source.url, title: source.title || source.url, favicon: getFavicon(source.favicon, domain), domain, folderId: folder.id, tags: [], notes: '', pinned: false, createdAt: Date.now() });
        members.add(tabId);
        continue;
      }
      members.add(tab!.id!);
    }
    await db.collections.update(id, { tabIds: [...members] });
  });
}
