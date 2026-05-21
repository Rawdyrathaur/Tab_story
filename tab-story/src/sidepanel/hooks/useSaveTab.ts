import { db } from '../db';
import type { SavedTab } from '../db';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFavicon(tab: chrome.tabs.Tab, domain: string): string {
  if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
    return tab.favIconUrl;
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

export async function saveCurrentTab(): Promise<void> {
  console.log('saveCurrentTab called');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('tab found:', tab);

    // Ensure both URL and Title exist based on older logic
    if (!tab?.url || !tab?.title) {
      console.log('no url or title');
      return;
    }

    // Keep the safety checks from the newer code
    if (tab.url.startsWith('chrome://')) return;
    if (tab.url.startsWith('chrome-extension://')) return;
    if (tab.url.startsWith('about:')) return;

    const domain = getDomain(tab.url);
    const title = tab.title; 
    const favicon = getFavicon(tab, domain);

    // find or create folder
    let folder = await db.folders.where('domain').equals(domain).first();
    if (!folder) {
      const folderId = await db.folders.add({
        name: domain,
        domain,
        createdAt: Date.now(),
      });
      folder = { id: folderId as number, name: domain, domain, createdAt: Date.now() };
    }
    console.log('folder:', folder);

    // skip duplicate
    const existing = await db.tabs.where('url').equals(tab.url).first();
    if (existing) {
      console.log('tab already saved');
      return;
    }

    const newTab: SavedTab = {
      url: tab.url,
      title,
      favicon,
      domain,
      folderId: folder.id,
      tags: [],
      createdAt: Date.now(),
      notes: '',
      pinned: false,
    };

    await db.tabs.add(newTab);
    console.log('tab saved!', newTab);
  } catch (err) {
    console.error('saveCurrentTab error:', err);
  }
}