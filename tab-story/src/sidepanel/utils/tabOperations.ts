import { db } from '../db';
import { getDomain, getFavicon, isInternalUrl } from './url';
import { requestReminderReconciliation } from '../../reminders/service';
import { updateTab, writeTab } from '../../sync/client';

export async function saveTab(
  tabUrl: string,
  tabTitle: string,
  tabFaviconUrl?: string,
): Promise<void> {
  if (!tabUrl || !tabTitle) return;
  if (isInternalUrl(tabUrl)) return;

  const domain = getDomain(tabUrl);
  const favicon = getFavicon(tabFaviconUrl, domain);

  await db.transaction('rw', db.tabs, db.folders, db.syncOutbox, async () => {
    let folder = await db.folders.where('domain').equals(domain).first();

    if (!folder) {
      const folderId = await db.folders.add({
        name: domain,
        domain,
        createdAt: Date.now(),
      });
      folder = { id: folderId as number, name: domain, domain, createdAt: Date.now() };
    }

    const existing = await db.tabs.where('url').equals(tabUrl).first();
    if (existing) {
      if (existing.deletedAt) await updateTab(existing.id!, { deletedAt: undefined, scheduledAt: undefined, notifiedScheduledAt: undefined });
      return;
    }
    await writeTab({
      url: tabUrl,
      title: tabTitle,
      favicon,
      domain,
      folderId: folder.id,
      tags: [],
      createdAt: Date.now(),
      notes: '',
      pinned: false,
    });
  });
}

export async function saveCurrentTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab?.title) return;
  await saveTab(tab.url, tab.title, tab.favIconUrl);
}

export async function saveAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  await db.transaction('rw', db.tabs, db.folders, db.syncOutbox, async () => {
    for (const tab of tabs) {
      if (!tab.url || !tab.title) continue;
      if (isInternalUrl(tab.url)) continue;

      const domain = getDomain(tab.url);
      const favicon = getFavicon(tab.favIconUrl, domain);

      let folder = await db.folders.where('domain').equals(domain).first();

      if (!folder) {
        const folderId = await db.folders.add({
          name: domain,
          domain,
          createdAt: Date.now(),
        });
        folder = { id: folderId as number, name: domain, domain, createdAt: Date.now() };
      }

      const existing = await db.tabs.where('url').equals(tab.url).first();
      if (existing) {
        if (existing.deletedAt) await updateTab(existing.id!, { deletedAt: undefined, scheduledAt: undefined, notifiedScheduledAt: undefined });
        continue;
      }
      await writeTab({
        url: tab.url,
        title: tab.title,
        favicon,
        domain,
        folderId: folder.id,
        tags: [],
        createdAt: Date.now(),
        notes: '',
        pinned: false,
      });
    }
  });
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.tabs, db.folders, async () => {
    await db.tabs.clear();
    await db.folders.clear();
  });
  await requestReminderReconciliation();
}
