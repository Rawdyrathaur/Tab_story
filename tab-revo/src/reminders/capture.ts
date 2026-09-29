import { db } from '../sidepanel/db';
import { normalizeTaskUrl, migrateTask } from './model';
import { writeTab } from '../sync/client';

export async function captureLink(url: string, title: string, favicon = '', keepBoth = false): Promise<number> {
  const parsed = new URL(url);
  if (!['http:','https:'].includes(parsed.protocol)) throw new Error('Only http and https links can be scheduled. Chrome and file pages cannot be reopened.');
  const key = normalizeTaskUrl(url);
  const existing = (await db.tabs.toArray()).find(t => !t.deletedAt && !t.completedAt && normalizeTaskUrl(t.url) === key);
  if (existing && !keepBoth) return existing.id!;
  return writeTab(migrateTask({ url, title: title.trim() || `${parsed.hostname} ${decodeURI(parsed.pathname)}`, favicon, domain: parsed.hostname, tags: [], createdAt: Date.now(), notes: '', pinned: false }));
}
