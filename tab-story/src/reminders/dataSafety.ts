import { db, type SavedTab } from '../sidepanel/db';
import { migrateTask, fireTime, normalizeTaskUrl } from './model';
import { defaultReviewPrefs, getReviewPrefs, type ReviewPrefs } from './lifecycle';
import { requestReminderReconciliation } from './service';

export function validatePrefs(value: unknown): ReviewPrefs {
  const p = value as ReviewPrefs;
  if (!p || typeof p.enabled !== 'boolean' || !Number.isInteger(p.day) || p.day < 0 || p.day > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) throw new Error('Invalid review preferences');
  return { enabled: p.enabled, day: p.day, time: p.time };
}
export async function exportScheduler() {
  const data = { schemaVersion: 11, tasks: await db.tabs.toArray(), prefs: await getReviewPrefs(), exportedAt: Date.now() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'tab-story-schedule.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
export async function importScheduler(value: unknown) {
  const data = value as { schemaVersion: number; tasks: SavedTab[]; prefs?: ReviewPrefs };
  if (!data || data.schemaVersion !== 11 || !Array.isArray(data.tasks) || data.tasks.length > 100000) throw new Error('Unsupported schedule backup');
  const prefs = validatePrefs(data.prefs || defaultReviewPrefs);
  const rows = data.tasks.map(t => {
    if (!t || typeof t.url !== 'string' || !/^https?:\/\//i.test(t.url) || typeof t.title !== 'string' || !Array.isArray(t.tags) || !t.tags.every(x => typeof x === 'string')) throw new Error('Invalid saved link');
    new URL(t.url);
    for (const key of ['fireAt','scheduledAt','createdAt','updatedAt','completedAt','deletedAt','archivedAt','firedAt','openedAt','reviewAfter','missedAt','completedScheduledAt'] as const) {
      if (t[key] !== undefined && (!Number.isSafeInteger(t[key]) || t[key]! < 0 || t[key]! > 8640000000000000)) throw new Error('Invalid timestamp');
    }
    if (t.status && !['pending','fired','missed','completed','archived'].includes(t.status)) throw new Error('Invalid status');
    for (const key of ['snoozeCount','reviewCount'] as const) if (t[key] !== undefined && (!Number.isSafeInteger(t[key]) || t[key]! < 0)) throw new Error('Invalid counter');
    if (t.recurrence && (!['daily','weekly','weekdays'].includes(t.recurrence.freq) || !Number.isInteger(t.recurrence.interval) || t.recurrence.interval < 1 || t.recurrence.interval > 365 || (t.recurrence.until !== null && (!Number.isSafeInteger(t.recurrence.until) || t.recurrence.until < 0)))) throw new Error('Invalid recurrence');
    const row = migrateTask({ ...t, notes: typeof t.notes === 'string' ? t.notes : '', favicon: typeof t.favicon === 'string' ? t.favicon : '', pinned: !!t.pinned, createdAt: t.createdAt || Date.now(), domain: new URL(t.url).hostname });
    delete row.id; delete row.folderId; delete row.deliveryClaimAt; delete row.occurrenceKey;
    return row;
  });
  let added = 0;
  await db.transaction('rw', db.tabs, db.meta, async () => {
    const key = (t: SavedTab) => `${normalizeTaskUrl(t.url)}|${fireTime(t) || 0}`;
    const seen = new Set((await db.tabs.toArray()).map(key));
    for (const row of rows) if (!seen.has(key(row))) { await db.tabs.add(row); seen.add(key(row)); added++; }
    await db.meta.put({ key: 'reviewPrefs', value: prefs });
  });
  await requestReminderReconciliation();
  return added;
}
export async function restoreSnapshot() {
  const stored = (await chrome.storage.local.get('tabStory.schedulerSnapshot'))['tabStory.schedulerSnapshot'] as { data?: string; encoding?: string } | undefined;
  if (!stored?.data || stored.encoding !== 'gzip-base64') throw new Error('No daily recovery copy yet');
  const bytes = Uint8Array.from(atob(stored.data), c => c.charCodeAt(0));
  const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return importScheduler(JSON.parse(text));
}
