import { DAY, getPresets, migrateTask, normalizeTaskUrl, reviewQueue, nextOccurrence, toICS } from '../src/reminders/model';
import { REVIEW_ALARM } from '../src/reminders/lifecycle';
import { test, expect } from '@playwright/test';
import { db, type SavedTab } from '../src/sidepanel/db';
import { execute, recover, handleAlarm, handleNotification, notificationId, alarmName, RECOVERY_ALARM } from '../src/reminders/engine';
import { parseLocalSchedule, toLocalDateInput, toLocalTimeInput } from '../src/reminders/dates';
import { messages, resolveLocale, translate, getDirection, getWeekInfo } from '../src/i18n/core';

const tabs = new Map<number, SavedTab>();
const alarms = new Map<string, { name: string; scheduledTime: number }>();
const notifications = new Map<string, chrome.notifications.NotificationOptions>();
const opened: string[] = [];
const metadata = new Map<string, unknown>();
const summaries = new Map<string, unknown>();
let locale = 'en-US';
let failAlarm = false;
let failNotification = false;
let permission = 'granted';
const createTab = (id = 1, scheduledAt?: number) => {
  const tab = { id, url: 'https://example.com/' + id, title: 'Resource ' + id, domain: 'example.com', favicon: '', tags: [], createdAt: Date.now(), pinned: false, notes: '', scheduledAt };
  tabs.set(id, tab); return tab;
};
const request = (operation: 'schedule' | 'reschedule' | 'cancel' | 'complete' | 'snooze', tabId = 1, scheduledAt?: number) => execute({ type: 'tab-story:reminder', operation, tabId, scheduledAt });

test.beforeEach(() => {
  tabs.clear(); alarms.clear(); notifications.clear(); opened.length = 0; summaries.clear();
  metadata.clear(); metadata.set('lastSnapshotAt', Date.now());
  locale = 'en-US'; failAlarm = false; failNotification = false; permission = 'granted';
  Object.assign(db.tabs, {
    bulkDelete: async (ids: number[]) => ids.forEach(id => tabs.delete(id)),
    add: async (tab: SavedTab) => { const id = Math.max(0, ...tabs.keys()) + 1; tabs.set(id, { ...tab, id }); return id; },
    where: (field: keyof SavedTab) => ({ equals: (value: unknown) => ({ count: async () => [...tabs.values()].filter(t => t[field] === value).length }) }),
    get: async (id: number) => tabs.get(id) && { ...tabs.get(id) },
    toArray: async () => [...tabs.values()].map(tab => ({ ...tab })),
    update: async (id: number, changes: Partial<SavedTab>) => { const tab = tabs.get(id); if (!tab) return 0; Object.assign(tab, changes); return 1; },
  });
  Object.assign(db.meta, { get: async (key: string) => metadata.has(key) ? { key, value: metadata.get(key) } : undefined, put: async (row: { key: string; value: unknown }) => metadata.set(row.key,row.value) });
  Object.assign(db.reminderState, { get: async (id: string) => summaries.get(id), put: async (value: { id: string }) => summaries.set(value.id, value), delete: async (id: string) => summaries.delete(id) });
  Object.defineProperty(db, 'transaction', { configurable: true, value: async (...args: unknown[]) => (args.at(-1) as () => Promise<void>)() });
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: {
    action: { setBadgeBackgroundColor: async () => {}, setBadgeText: async () => {} },
    offscreen: { Reason: { AUDIO_PLAYBACK: 'AUDIO_PLAYBACK' }, createDocument: async () => {} },
    runtime: { ContextType: { OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' }, getContexts: async () => [{}], sendMessage: async () => ({ ok: true }), getURL: (path: string) => 'chrome-extension://test/' + path },
    storage: { local: { set: async () => {}, get: async () => ({ 'tabStory.locale': locale }) } },
    alarms: {
      get: async (name: string) => alarms.get(name), getAll: async () => [...alarms.values()],
      clear: async (name: string) => alarms.delete(name),
      create: async (name: string, options: { when?: number }) => { if (failAlarm && name !== RECOVERY_ALARM && name !== REVIEW_ALARM) throw new Error('Alarm failure'); alarms.set(name, { name, scheduledTime: options.when || Date.now() + 60000 }); },
    },
    notifications: {
      getPermissionLevel: async () => permission,
      getAll: async () => Object.fromEntries(notifications), clear: async (id: string) => notifications.delete(id),
      create: async (id: string, options: chrome.notifications.NotificationOptions) => { if (failNotification) throw new Error('Notification failure'); notifications.set(id, options); return id; },
    },
    tabs: { create: async ({ url }: { url: string }) => opened.push(url) },
  } });
});

test('all languages have complete keys, interpolation, fallback, direction and regional week starts', () => {
  for (const language of ['hi', 'es', 'de', 'ar', 'ur']) expect(Object.keys(messages[language]).sort()).toEqual(Object.keys(messages.en).sort());
  expect(resolveLocale('de-DE', ['en-US'])).toBe('de-DE');
  expect(resolveLocale(undefined, ['es-MX'])).toBe('es-MX');
  expect(resolveLocale(undefined, ['xx-XX'])).toBe('en-US');
  expect(getDirection('ar-EG')).toBe('rtl');
  expect(getWeekInfo('en-US').firstDay).toBe(7);
  expect(getWeekInfo('de-DE').firstDay).toBe(1);
  expect(translate('hi', 'notifications.review', { title: 'Test' })).toContain('समीक्षा');
  expect(translate('ar', 'notifications.missed', { count: 3 })).not.toContain('{count}');
});

test('date conversion rejects invalid dates, past times and DST gaps', () => {
  const previous = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    expect(() => parseLocalSchedule('2027-02-30', '10:00', 0)).toThrow('errors.invalidDate');
    expect(() => parseLocalSchedule('2027-03-14', '02:30', 0)).toThrow('errors.nonexistentLocalTime');
    expect(() => parseLocalSchedule('2027-01-01', '24:00', 0)).toThrow('errors.invalidTime');
    expect(() => parseLocalSchedule('2020-01-01', '10:00')).toThrow('errors.pastSchedule');
    const at = parseLocalSchedule('2027-11-07', '01:30', 0);
    expect(new Date(at).toISOString()).toBe('2027-11-07T05:30:00.000Z');
    expect(toLocalDateInput(at)).toBe('2027-11-07'); expect(toLocalTimeInput(at)).toBe('01:30');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('schedule and reschedule replace the deterministic alarm, cancel is idempotent', async () => {
  createTab(); const at = Date.now() + 3600000;
  await request('schedule', 1, at); await request('schedule', 1, at);
  expect(alarms.size).toBe(2); expect(alarms.get(alarmName(1))?.scheduledTime).toBe(at);
  await request('reschedule', 1, at + 3600000);
  expect(alarms.get(alarmName(1))?.scheduledTime).toBe(at + 3600000);
  await request('cancel'); await request('cancel');
  expect(tabs.get(1)?.scheduledAt).toBeUndefined(); expect(alarms.has(alarmName(1))).toBe(false);
});

test('alarm delivery is localized and repeated wakeups do not duplicate or open tabs', async () => {
  locale = 'es'; const tab = createTab(1, Date.now() - 1000);
  await handleAlarm({ name: alarmName(1), scheduledTime: tab.scheduledAt!, persistAcrossSessions: true });
  const id = notificationId(1, tab.scheduledAt!);
  expect(notifications.get(id)?.message).toContain('Hora de revisar'); expect(opened).toEqual([]);
  await recover(); expect(notifications.size).toBe(1);
  await handleNotification(id); expect(opened).toEqual([tab.url]); expect(notifications.size).toBe(0);
  await recover(); expect(notifications.size).toBe(0);
});

test('snooze replaces the schedule and stale notification cannot act on it', async () => {
  const tab = createTab(1, Date.now() - 1000); const oldAt = tab.scheduledAt!;
  await recover(); await handleNotification(notificationId(1, oldAt), 1);
  expect(tab.scheduledAt).toBeGreaterThan(Date.now() + 590000);
  expect(alarms.has(alarmName(1))).toBe(true); expect(notifications.size).toBe(0);
  await handleNotification(notificationId(1, oldAt)); expect(opened).toEqual([]);
});

test('completed and deleted records cannot notify or open stale notifications', async () => {
  const tab = createTab(1, Date.now() - 1000); const at = tab.scheduledAt!;
  await recover(); await request('complete');
  expect(tab.completedScheduledAt).toBe(at); expect(tab.completedAt).toBeTruthy(); expect(tab.scheduledAt).toBeUndefined();
  await handleNotification(notificationId(1, at)); expect(opened).toEqual([]);
  const deleted = createTab(2, at); await recover(); deleted.deletedAt = Date.now();
  await handleNotification(notificationId(2, at)); await recover(); expect(opened).toEqual([]); expect(notifications.size).toBe(0);
});

test('restart restores future alarms, clears orphans, and aggregates missed reminders once', async () => {
  createTab(1, Date.now() + 3600000);
  for (let id = 2; id < 10; id++) createTab(id, Date.now() - id * 60000);
  alarms.set(alarmName(99), { name: alarmName(99), scheduledTime: Date.now() + 5000 });
  await recover(); expect(alarms.has(alarmName(1))).toBe(true); expect(alarms.has(alarmName(99))).toBe(false);
  expect(notifications.size).toBe(1); expect(notifications.get('tab_story_missed')?.message).toContain('8');
  notifications.clear(); alarms.clear(); await recover(); expect(notifications.size).toBe(0); expect(alarms.has(alarmName(1))).toBe(true);
  await handleNotification('tab_story_missed'); expect(opened[0]).toContain('#calendar');
});

test('failed alarm creation preserves DB schedule for recovery, failed notification remains retryable', async () => {
  const tab = createTab(); failAlarm = true;
  await expect(request('schedule', 1, Date.now() + 100000)).rejects.toThrow('errors.alarmRegistration');
  expect(tab.scheduledAt).toBeTruthy(); failAlarm = false; await recover(); expect(alarms.has(alarmName(1))).toBe(true);
  tab.fireAt = tab.scheduledAt = Date.now() - 1000; failNotification = true;
  await expect(recover()).rejects.toThrow('errors.notificationFailed'); expect(tab.notifiedScheduledAt).toBeUndefined();
  failNotification = false; await recover(); expect(tab.notifiedScheduledAt).toBe(tab.scheduledAt);
});

test('schedules survive denied notifications, delivery retries, and unsafe URLs are rejected', async () => {
  const tab = createTab(); permission = 'denied';
  const at = Date.now() + 10000;
  await request('schedule', 1, at);
  expect(tab.scheduledAt).toBe(at);
  expect(alarms.get(alarmName(1))?.scheduledTime).toBe(at);
  tab.fireAt = tab.scheduledAt = Date.now() - 1000;
  await expect(recover()).rejects.toThrow('errors.notificationPermission');
  expect(tab.notifiedScheduledAt).toBeUndefined();
  permission = 'granted';
  await recover();
  expect(tab.notifiedScheduledAt).toBe(tab.scheduledAt);
  tab.url = 'javascript:alert(1)';
  await expect(request('schedule', 1, Date.now() + 10000)).rejects.toThrow('errors.invalidUrl');
});


test('epoch snooze rolls across midnight, month and year without pulling future reminders earlier', async () => {
  const future = new Date(2030, 11, 31, 23, 55).getTime();
  const tab = createTab(1, future);
  await request('snooze');
  expect(tab.scheduledAt).toBe(future + 600000);
  expect(tabs.get(1)?.scheduledDate).toBe('2031-01-01');
  expect(tabs.get(1)?.snoozeCount).toBe(1);
});

test('review excludes opened, completed and archived items; Keep prevents immediate reappearance', async () => {
  const tab = createTab(1, Date.now() - 8 * DAY);
  Object.assign(tab, migrateTask(tab), { snoozeCount: 3 });
  expect(reviewQueue([tab])).toHaveLength(1);
  await execute({ type: 'tab-story:reminder', operation: 'keep', tabId: 1, scheduledAt: Date.now()+DAY });
  expect(reviewQueue([tab])).toHaveLength(0);
  expect(tabs.get(1)?.reviewCount).toBe(1);
  expect(reviewQueue([{ ...tab, openedAt: Date.now() }])).toHaveLength(0);
});

test('archive undo restores schedule and suppresses redelivery of an already fired reminder', async () => {
  const tab = createTab(1, Date.now() - 1000);
  await recover(); const at = tab.scheduledAt;
  await execute({ type: 'tab-story:reminder', operation: 'archive', tabId: 1 });
  expect(tabs.get(1)?.status).toBe('archived');
  await execute({ type: 'tab-story:reminder', operation: 'restore', tabId: 1 });
  expect(tabs.get(1)?.status).toBe('fired');
  expect(tab.scheduledAt).toBe(at);
  notifications.clear(); await recover(); expect(notifications.size).toBe(0);
});

test('three due reminders remain individual; a leased delivery waits then recovers', async () => {
  for (let id = 1; id <= 3; id++) createTab(id, Date.now()-1000);
  await recover(); expect(notifications.size).toBe(3);
  const tab = createTab(4, Date.now()-1000);
  Object.assign(tab, { deliveryClaimAt: Date.now() });
  await recover(); expect(notifications.size).toBe(3);
  Object.assign(tab, { deliveryClaimAt: Date.now()-121000 });
  await recover(); expect(notifications.size).toBe(4);
});

test('recurrence creates one next occurrence even after recovery runs again', async () => {
  const tab = createTab(1, Date.now()-1000);
  Object.assign(tab, { recurrence: { freq: 'daily', interval: 1, until: null } });
  await recover(); await recover();
  expect(tabs.size).toBe(2);
  expect(tabs.get(2)?.status).toBe('pending');
  expect(tabs.get(2)?.scheduledAt).toBeGreaterThan(Date.now());
});

test('presets stay in the future, URL tracking is normalized without corrupting case, ICS escapes content', () => {
  for (let h = 0; h < 24; h++) {
    const now = new Date(2030,0,1,h,55);
    expect(getPresets(now).every(p => p.when > +now)).toBe(true);
  }
  expect(normalizeTaskUrl('https://EXAMPLE.com/Case?utm_source=x&b=2#frag')).toBe('https://example.com/Case?b=2');
  const tab = createTab(1, Date.now()+DAY);
  tab.title = 'Hello, world;\nNext';
  expect(toICS(tab)).toContain('SUMMARY:Hello\\, world\\;\\nNext');
  expect(toICS(tab)).toContain('BEGIN:VALARM');
});

test('weekly and weekday recurrence preserve local hours across daylight-saving changes', () => {
  const previous = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const at = new Date(2027,2,12,9).getTime();
    const tab = { ...createTab(1,at), recurrence: { freq: 'weekdays' as const, interval: 1, until: null } };
    const next = new Date(nextOccurrence(tab,at)!);
    expect(next.getDay()).toBe(1); expect(next.getHours()).toBe(9);
    expect(+next-at).toBe(71*3600000);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
