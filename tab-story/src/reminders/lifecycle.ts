import { db, type SavedTab } from '../sidepanel/db';
import { updateTab, writeTab } from '../sync/client';
import { DAY, fireTime, timeFields, reviewQueue, nextOccurrence } from './model';

export const REVIEW_ALARM = 'tab_story_weekly_review';
export const TEST_ALARM = 'tab_story_test_in_five_seconds';
export type ReviewPrefs = { enabled: boolean; day: number; time: string };
export const defaultReviewPrefs: ReviewPrefs = { enabled: true, day: 0, time: '18:00' };
export async function getReviewPrefs(): Promise<ReviewPrefs> {
  return { ...defaultReviewPrefs, ...((await db.meta.get('reviewPrefs'))?.value as Partial<ReviewPrefs> ?? {}) };
}
export async function bumpStat(name: 'opened' | 'kept' | 'letGo', amount = 1) {
  const key = 'stats:' + new Date().toISOString().slice(0,7);
  const stats = ((await db.meta.get(key))?.value || {}) as Record<string, number>;
  await db.meta.put({ key, value: { ...stats, [name]: Math.max(0, (stats[name] || 0) + amount) } });
}
export async function setFireAt(id: number, ms: number, changes: Partial<SavedTab> = {}) {
  await updateTab(id, { ...timeFields(ms), status: 'pending', completedAt: undefined, completedScheduledAt: undefined,
    notifiedScheduledAt: undefined, deliveryClaimAt: undefined, firedAt: undefined, openedAt: undefined, updatedAt: Date.now(), ...changes });
}
export async function createNextOccurrence(t: SavedTab) {
  const at = nextOccurrence(t); if (!at) return;
  const seriesId = t.seriesId || `series-${t.id}`;
  const occurrenceKey = `${seriesId}:${at}`;
  if (await db.tabs.where('occurrenceKey').equals(occurrenceKey).count()) return;
  const next: SavedTab = { ...t, ...timeFields(at), seriesId, occurrenceKey, status: 'pending', createdAt: Date.now(), updatedAt: Date.now(),
    snoozeCount: 0, reviewCount: 0, reviewAfter: undefined, firedAt: undefined, missedAt: undefined, openedAt: undefined,
    completedAt: undefined, completedScheduledAt: undefined, notifiedScheduledAt: undefined, deliveryClaimAt: undefined };
  delete next.id;
  next.uuid = crypto.randomUUID();
  await writeTab(next);
}
export async function scheduleWeeklyReview(now = Date.now()) {
  const prefs = await getReviewPrefs();
  if (!prefs.enabled) { await chrome.alarms.clear(REVIEW_ALARM); return; }
  const d = new Date(now); const [h,m] = prefs.time.split(':').map(Number);
  d.setDate(d.getDate() + (prefs.day - d.getDay() + 7) % 7); d.setHours(h,m,0,0);
  if (+d <= now) d.setDate(d.getDate()+7);
  const alarm = await chrome.alarms.get(REVIEW_ALARM);
  if (!alarm || alarm.scheduledTime > now && Math.abs(alarm.scheduledTime - +d) > 1000) await chrome.alarms.create(REVIEW_ALARM, { when: +d });
}
export async function runWeeklyReview() {
  const prefs = await getReviewPrefs();
  if (prefs.enabled) {
    const q = reviewQueue(await db.tabs.toArray());
    if (q.length && await chrome.notifications.getPermissionLevel() === 'granted') await chrome.notifications.create('tab_story_review', {
      type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title: `${q.length} links are waiting`,
      message: 'Keep or let go: takes about 2 minutes', requireInteraction: true,
    });
  }
  await chrome.alarms.clear(REVIEW_ALARM);
  await scheduleWeeklyReview();
}
export async function housekeeping(now = Date.now()) {
  await db.meta.put({ key: 'lastTickAt', value: now });
  const expired = (await db.tabs.toArray()).filter(t => t.status === 'archived' && t.archivedAt && t.archivedAt < now - 30 * DAY);
  await db.tabs.bulkDelete(expired.map(t => t.id!));
  await scheduleWeeklyReview();
  const last = Number((await db.meta.get('lastSnapshotAt'))?.value || 0);
  if (now - last >= DAY) {
    const tasks = (await db.tabs.toArray()).sort((a,b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).slice(0,100);
    const payload = JSON.stringify({ schemaVersion: 11, tasks, prefs: await getReviewPrefs() });
    const compressed = await new Response(new Blob([payload]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const data = btoa(Array.from(new Uint8Array(compressed), byte => String.fromCharCode(byte)).join(''));
    await chrome.storage.local.set({ 'tabStory.schedulerSnapshot': { createdAt: now, encoding: 'gzip-base64', data } });
    await db.meta.put({ key: 'lastSnapshotAt', value: now });
  }
}
export async function archiveTask(t: SavedTab) {
  if (t.status === 'archived') return;
  await updateTab(t.id!, { status: 'archived', archivedAt: Date.now(), deletedAt: Date.now(), updatedAt: Date.now(),
    archivePrevious: { status: t.status, notifiedScheduledAt: t.notifiedScheduledAt, completedAt: t.completedAt } });
  await bumpStat('letGo');
}
export async function restoreTask(t: SavedTab) {
  if (t.status !== 'archived') return;
  const at = fireTime(t);
  await updateTab(t.id!, { status: t.archivePrevious?.status || (at ? 'pending' : undefined),
    archivedAt: undefined, deletedAt: undefined, archivePrevious: undefined, updatedAt: Date.now(),
    completedAt: t.archivePrevious?.completedAt, notifiedScheduledAt: t.archivePrevious?.notifiedScheduledAt });
  await bumpStat('letGo', -1);
}
