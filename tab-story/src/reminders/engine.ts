import { fireTime, DAY } from './model';
import { setFireAt, housekeeping, createNextOccurrence, archiveTask, restoreTask, bumpStat, REVIEW_ALARM, TEST_ALARM, runWeeklyReview } from './lifecycle';
import { playReminderSound, stopReminderSound } from './sound';
import { db } from '../sidepanel/db';
import type { SavedTab } from '../sidepanel/db';
import { getStoredLocale, translate } from '../i18n/core';
import { ReminderError } from './errors';
import { areReminderNotificationsEnabled } from './service';
import type { ReminderRequest } from './service';
import { updateTab } from '../sync/client';

export const ALARM_PREFIX = 'tab_story_reminder_';
export const RECOVERY_ALARM = 'tab_story_recovery';
export const SUMMARY_ID = 'tab_story_missed';
export const alarmName = (id: number) => `${ALARM_PREFIX}${id}`;
export const notificationId = (id: number, at: number) => `${ALARM_PREFIX}${id}_${at}`;
export function parseNotification(id: string) {
  const match = /^tab_story_reminder_(\d+)_(\d+)$/.exec(id);
  return match ? { tabId: Number(match[1]), scheduledAt: Number(match[2]) } : null;
}
export function isScheduled(tab: SavedTab | undefined): tab is SavedTab {
  return !!tab && !tab.deletedAt && !tab.completedAt && tab.status !== 'archived' && tab.status !== 'completed' && Number.isFinite(fireTime(tab)) && fireTime(tab)! > 0;
}
function validUrl(url: string) {
  try { return ['https:', 'http:'].includes(new URL(url).protocol); } catch { return false; }
}

// All worker entry points share this queue. Failed jobs never poison later jobs.
let tail: Promise<unknown> = Promise.resolve();
export function serialized<T>(job: () => Promise<T>): Promise<T> {
  const next = tail.then(job);
  tail = next.catch(error => console.error('[Tab Story] reminder', error));
  return next;
}

async function clearNotifications(id: number) {
  for (const key of Object.keys(await chrome.notifications.getAll())) {
    if (parseNotification(key)?.tabId === id) await chrome.notifications.clear(key);
  }
  const summary = await db.reminderState.get('missed');
  if (summary) {
    let relevant = false;
    for (const entry of summary.entries) {
      const tab = await db.tabs.get(entry.tabId);
      if (isScheduled(tab) && fireTime(tab) === entry.scheduledAt) relevant = true;
    }
    if (!relevant) { await chrome.notifications.clear(SUMMARY_ID); await db.reminderState.delete('missed'); }
  }
}
async function register(tab: SavedTab) {
  const name = alarmName(tab.id!);
  const existing = await chrome.alarms.get(name);
  if (existing?.scheduledTime === fireTime(tab)) return;
  if (!existing && (await chrome.alarms.getAll()).length >= 499) throw new ReminderError('alarmLimit');
  try { await chrome.alarms.create(name, { when: fireTime(tab) }); }
  catch (cause) { throw new ReminderError('alarmRegistration', { cause }); }
}
export async function ensureRecovery() {
  if (!(await chrome.alarms.get(RECOVERY_ALARM))) {
    await chrome.alarms.create(RECOVERY_ALARM, { periodInMinutes: 1 });
  }
}

export async function execute(request: ReminderRequest) {
  await ensureRecovery();
  if (request.operation === 'test') {
    if (await chrome.notifications.getPermissionLevel() !== 'granted') throw new ReminderError('notificationPermission');
    await chrome.alarms.create(TEST_ALARM, { when: Date.now() + 5000 });
    return;
  }
  if (request.operation === 'reconcile') return recover();
  const id = request.tabId;
  if (!Number.isSafeInteger(id) || id! < 1) throw new ReminderError('invalidTab');
  const tab = await db.tabs.get(id!);
  if (!tab) {
    if (request.operation === 'cancel') { await chrome.alarms.clear(alarmName(id!)); await clearNotifications(id!); return; }
    throw new ReminderError('missingTab');
  }
  if (request.operation === 'archive' || request.operation === 'restore') {
    if (request.operation === 'archive') await archiveTask(tab); else await restoreTask(tab);
    await chrome.alarms.clear(alarmName(id!)); await clearNotifications(id!);
    return;
  }
  if (request.operation === 'open') {
    if (tab.deletedAt || !validUrl(tab.url)) throw new ReminderError('invalidUrl');
    await chrome.tabs.create({ url: tab.url });
    await updateTab(id!, { openedAt: Date.now() });
    await bumpStat('opened');
    return execute({ ...request, operation: 'complete' });
  }
  if (request.operation === 'cancel' || request.operation === 'complete') {
    if (tab.notifiedScheduledAt === fireTime(tab) && fireTime(tab)) await stopReminderSound();
    // Persist cancellation first so an interrupted cleanup cannot deliver a stale reminder.
    await updateTab(id!, {
      scheduledAt: undefined, notifiedScheduledAt: undefined,
      status: request.operation === 'complete' ? 'completed' : undefined,
      fireAt: request.operation === 'complete' ? fireTime(tab) : undefined,
      scheduledDate: request.operation === 'complete' ? tab.scheduledDate : undefined,
      scheduledTime: request.operation === 'complete' ? tab.scheduledTime : undefined,
      recurrence: request.operation === 'cancel' ? null : tab.recurrence, updatedAt: Date.now(),
      completedAt: request.operation === 'complete' ? (tab.completedAt || Date.now()) : undefined,
      completedScheduledAt: request.operation === 'complete' ? (fireTime(tab) || tab.completedScheduledAt) : undefined,
    });
    try { await chrome.alarms.clear(alarmName(id!)); await clearNotifications(id!); }
    catch (cause) { throw new ReminderError('alarmCancellation', { cause }); }
    return;
  }
  if (tab.deletedAt) throw new ReminderError('deletedTab');
  if (!validUrl(tab.url)) throw new ReminderError('invalidUrl');
  let at = request.scheduledAt;
  if (request.operation === 'snooze') {
    if (!isScheduled(tab)) throw new ReminderError('invalidSchedule');
    const minutes = request.minutes ?? 10;
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 10080) throw new ReminderError('invalidSnooze');
    at = Math.max(Date.now(), fireTime(tab) || 0) + minutes * 60000;
  } else if (!['schedule', 'reschedule', 'keep'].includes(request.operation)) throw new ReminderError('invalidSchedule');
  if (!Number.isSafeInteger(at) || at! > 8640000000000000) throw new ReminderError('invalidSchedule');
  if (at! <= Date.now()) throw new ReminderError('pastSchedule');
  if (request.recurrence && (!['daily', 'weekly', 'weekdays'].includes(request.recurrence.freq) || !Number.isInteger(request.recurrence.interval) || request.recurrence.interval < 1 || request.recurrence.interval > 365 || (request.recurrence.until !== null && !Number.isSafeInteger(request.recurrence.until)))) throw new ReminderError('invalidSchedule');
  if (fireTime(tab) !== at || tab.completedAt) {
    await setFireAt(id!, at!, {
      recurrence: request.recurrence === undefined ? tab.recurrence : request.recurrence,
      seriesId: tab.seriesId || `series-${id}`,
      snoozeCount: (tab.snoozeCount || 0) + (request.operation === 'snooze' ? 1 : 0),
      reviewCount: (tab.reviewCount || 0) + (request.operation === 'keep' ? 1 : 0),
      reviewAfter: request.operation === 'keep' ? at! + 7 * DAY : tab.reviewAfter,
    });
    if (request.operation === 'keep') await bumpStat('kept');
  }
  // DB remains authoritative on API failure; the recovery alarm retries it.
  await register((await db.tabs.get(id!))!);
  // Cleanup failure must not turn an already registered schedule into a failed save.
  await clearNotifications(id!).catch(error => console.warn('[Tab Story] notification cleanup', error));
}

async function deliver(tabs: SavedTab[]) {
  if (!tabs.length || !(await areReminderNotificationsEnabled())) return;
  const locale = await getStoredLocale();
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  // Claim each generation transactionally. A lease recovers interrupted workers;
  // deterministic notification IDs replace a partial delivery instead of duplicating it.
  const current: SavedTab[] = [];
  await db.transaction('rw', db.tabs, async () => {
    for (const candidate of tabs) {
      const tab = await db.tabs.get(candidate.id!);
      if (!isScheduled(tab) || fireTime(tab) !== fireTime(candidate) || tab.notifiedScheduledAt === fireTime(tab) || (tab.deliveryClaimAt && Date.now() - tab.deliveryClaimAt < 120000)) continue;
      const now = Date.now(), late = now - fireTime(tab)! > 120000;
      await db.tabs.update(tab.id!, { status: late ? 'missed' : 'fired', firedAt: tab.firedAt || now,
        missedAt: late ? tab.missedAt || now : tab.missedAt, deliveryClaimAt: now, updatedAt: now });
      current.push(tab);
    }
  });
  if (!current.length) return;
  try {
    // `createNextOccurrence` writes a synchronisation record and reads Chrome
    // storage. Do it after the Dexie claim transaction has committed; awaiting
    // non-Dexie promises inside that transaction can cause a PrematureCommitError
    // and leave a missed reminder without its notification summary.
    for (const tab of current) await createNextOccurrence(tab);
    const groups = current.length > 3 ? [current] : current.map(tab => [tab]);
    for (const group of groups) {
      const nativeAllowed = await chrome.notifications.getPermissionLevel().catch(() => 'denied') === 'granted';
      if (!nativeAllowed) throw new ReminderError('notificationPermission');
      const single = group.length === 1 ? group[0] : undefined;
      const id = single ? notificationId(single.id!, fireTime(single)!) : SUMMARY_ID;
      if (!single) await db.reminderState.put({ id: 'missed', entries: group.map(tab => ({ tabId: tab.id!, scheduledAt: fireTime(tab)! })) });
      try {
        if (nativeAllowed) await chrome.notifications.create(id, {
          type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
          title: single ? single.title || single.domain : `${group.length} reminders are due`,
          silent: true, priority: 2, requireInteraction: true,
          message: single ? `${Date.now() - fireTime(single)! > 120000 ? 'Missed · ' : ''}${t('notifications.review', { title: single.title.slice(0,120) })}\n${single.domain} · ${new Date(fireTime(single)!).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}` : t('notifications.missed', { count: group.length }),
          buttons: single ? [{ title: t('notifications.open') }, { title: 'Snooze 1h' }] : [{ title: t('notifications.calendar') }],
        });
      } catch (cause) { throw new ReminderError('notificationFailed', { cause }); }
      await db.transaction('rw', db.tabs, async () => {
        for (const delivered of group) {
          const tab = await db.tabs.get(delivered.id!);
          if (isScheduled(tab) && fireTime(tab) === fireTime(delivered)) await db.tabs.update(tab.id!, { notifiedScheduledAt: fireTime(tab), deliveryClaimAt: undefined });
        }
      });
    }
    await playReminderSound();
  } catch (error) {
    for (const tab of current) await db.tabs.update(tab.id!, { deliveryClaimAt: undefined });
    throw error;
  }
}

export async function recover() {
  await ensureRecovery();
  await housekeeping().catch(error => console.warn('[Tab Story] reminder maintenance', error));
  const tabs = await db.tabs.toArray();
  const active = new Map(tabs.filter(isScheduled).map(tab => [tab.id!, tab]));
  const now = Date.now();
  const overdueCount = [...active.values()].filter(tab => fireTime(tab)! <= now).length;
  // Keep overdue reminders visible even if system banners or sound are disabled.
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#b45309' });
    await chrome.action.setBadgeText({ text: overdueCount ? String(Math.min(overdueCount, 99)) + (overdueCount > 99 ? '+' : '') : '' });
  } catch (error) { console.warn('[Tab Story] reminder badge unavailable', error); }
  const failures: unknown[] = [];
  for (const alarm of await chrome.alarms.getAll()) {
    if (!alarm.name.startsWith(ALARM_PREFIX)) continue;
    const tab = active.get(Number(alarm.name.slice(ALARM_PREFIX.length)));
    if (!tab || fireTime(tab)! <= now || fireTime(tab) !== alarm.scheduledTime) {
      try { await chrome.alarms.clear(alarm.name); } catch (error) { failures.push(error); }
    }
  }
  for (const tab of active.values()) {
    if (fireTime(tab)! > now) {
      try { await register(tab); } catch (error) { failures.push(error); }
    }
  }
  try {
    for (const key of Object.keys(await chrome.notifications.getAll())) {
      const entry = parseNotification(key);
      if (entry && fireTime(active.get(entry.tabId) || {} as SavedTab) !== entry.scheduledAt) await chrome.notifications.clear(key);
    }
    const summary = await db.reminderState.get('missed');
    if (summary && !summary.entries.some(entry => fireTime(active.get(entry.tabId) || {} as SavedTab) === entry.scheduledAt)) {
      await chrome.notifications.clear(SUMMARY_ID);
      await db.reminderState.delete('missed');
    }
  } catch (error) { console.warn('[Tab Story] stale notification cleanup', error); }
  await deliver([...active.values()].filter(tab => fireTime(tab)! <= now && tab.notifiedScheduledAt !== fireTime(tab)));
  if (failures.length) throw failures[0];
}

export async function handleAlarm(alarm: chrome.alarms.Alarm) {
  if (alarm.name === REVIEW_ALARM) return runWeeklyReview();
  if (alarm.name === TEST_ALARM) {
    await chrome.notifications.create('tab_story_notification_test', { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon-128.png'), title: 'Tab Story reminder', message: 'Your test reminder arrived.', requireInteraction: true });
    await playReminderSound();
    return;
  }
  if (alarm.name === RECOVERY_ALARM) return recover();
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const tab = await db.tabs.get(Number(alarm.name.slice(ALARM_PREFIX.length)));
  if (!isScheduled(tab)) return;
  if (fireTime(tab)! > Date.now()) return register(tab);
  // Batch all currently overdue items, including alarms arriving after sleep.
  await recover();
}
export async function handleNotification(id: string, button = 0) {
  await stopReminderSound();
  if (id === 'tab_story_notification_test') { await chrome.notifications.clear(id); return; }
  if (id === 'tab_story_review') { await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html#review') }); await chrome.notifications.clear(id); return; }
  if (id === SUMMARY_ID) {
    const summary = await db.reminderState.get('missed');
    if (summary) {
      for (const entry of summary.entries) {
        const tab = await db.tabs.get(entry.tabId);
        if (isScheduled(tab) && fireTime(tab) === entry.scheduledAt) {
          await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html#calendar') });
          break;
        }
      }
    }
    await chrome.notifications.clear(id);
    return;
  }
  const entry = parseNotification(id);
  if (!entry) return;
  const tab = await db.tabs.get(entry.tabId);
  if (!isScheduled(tab) || fireTime(tab) !== entry.scheduledAt) { await chrome.notifications.clear(id); return; }
  if (button === 1) await execute({ type: 'tab-story:reminder', operation: 'snooze', tabId: entry.tabId, minutes: 60 });
  else {
    if (!validUrl(tab.url)) throw new ReminderError('invalidUrl');
    await execute({ type: 'tab-story:reminder', operation: 'open', tabId: entry.tabId });
    await recover();
  }
  await chrome.notifications.clear(id);
}
