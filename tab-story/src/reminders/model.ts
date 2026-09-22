import type { SavedTab } from '../sidepanel/db';
import { toLocalDateInput, toLocalTimeInput } from './dates';

export const DAY = 86400000;
export type TaskStatus = 'pending' | 'fired' | 'missed' | 'completed' | 'archived';
export type Recurrence = { freq: 'daily' | 'weekly' | 'weekdays'; interval: number; until: number | null };
export const fireTime = (t: SavedTab) => t.fireAt ?? t.scheduledAt ?? t.completedScheduledAt;
export function normalizeTaskUrl(value: string): string {
  try {
    const u = new URL(value); u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) u.searchParams.delete(key);
    u.searchParams.sort();
    // Paths and query values can be case sensitive.
    return u.origin + u.pathname.replace(/\/$/, '') + u.search;
  } catch { return value; }
}
export function timeFields(ms: number) {
  if (!Number.isSafeInteger(ms) || ms <= 0 || ms > 8640000000000000) throw new Error('Invalid reminder time');
  return { fireAt: ms, scheduledAt: ms, scheduledDate: toLocalDateInput(ms), scheduledTime: toLocalTimeInput(ms) };
}
export function migrateTask(t: SavedTab, now = Date.now()): SavedTab {
  const at = fireTime(t);
  return { ...t, ...(at ? timeFields(at) : {}),
    scheduledAt: t.completedAt || t.deletedAt ? undefined : at,
    status: t.deletedAt ? 'archived' : t.completedAt ? 'completed' : t.status ?? (at ? at < now ? 'missed' : 'pending' : undefined),
    urlKey: normalizeTaskUrl(t.url), tz: t.tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
    snoozeCount: t.snoozeCount ?? 0, reviewCount: t.reviewCount ?? 0,
    archivedAt: t.archivedAt ?? t.deletedAt, updatedAt: t.updatedAt ?? now,
    source: t.source ?? 'extension', type: t.type ?? 'tab' };
}
export function reviewQueue(rows: SavedTab[], now = Date.now(), limit = 10) {
  return rows.filter(t => !t.deletedAt && !t.openedAt && !t.completedAt && ['pending', 'fired', 'missed'].includes(t.status || '') &&
    !((t.reviewAfter ?? 0) > now) && ((t.status !== 'pending' && now - (fireTime(t) ?? now) >= 7 * DAY) || (t.snoozeCount ?? 0) >= 3))
    .sort((a, b) => score(b) - score(a)).slice(0, limit);
  function score(t: SavedTab) { return (now - (fireTime(t) ?? now)) / DAY + (t.snoozeCount ?? 0) * 3 + (t.reviewCount ?? 0) * 5; }
}
export function getPresets(now = new Date(), prefs = { morning: '09:00', evening: '19:00', weekend: '10:00' }) {
  const at = (days: number, hhmm: string) => { const d = new Date(now); d.setDate(d.getDate() + days); const [h,m] = hhmm.split(':').map(Number); d.setHours(h,m,0,0); return d.getTime(); };
  const next = (day: number) => ((day - now.getDay() + 7) % 7) || 7;
  const later = new Date(now.getTime() + 3 * 3600000); later.setMinutes(Math.ceil(later.getMinutes() / 15) * 15,0,0);
  return [
    ...(later.toDateString() === now.toDateString() && later.getHours() < 22 ? [{ id: 'later', label: 'Later today', when: +later }] : []),
    ...(at(0, prefs.evening) - +now > 3600000 ? [{ id: 'tonight', label: 'Tonight', when: at(0, prefs.evening) }] : []),
    { id: 'tomorrow', label: 'Tomorrow morning', when: at(1, prefs.morning) },
    ...(![0,6].includes(now.getDay()) ? [{ id: 'weekend', label: 'This weekend', when: at(next(6), prefs.weekend) }] : []),
    { id: 'nextweek', label: 'Next week', when: at(next(1), prefs.morning) },
  ];
}
export function nextOccurrence(t: SavedTab, now = Date.now()): number | undefined {
  const recurrence = t.recurrence, at = fireTime(t);
  if (!recurrence || !at) return;
  const d = new Date(at);
  // Skip elapsed occurrences after sleep, preserving local wall-clock time over DST.
  do {
    d.setDate(d.getDate() + (recurrence.freq === 'weekly' ? 7 : 1) * Math.max(1, recurrence.interval));
    if (recurrence.freq === 'weekdays') while ([0,6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  } while (+d <= now);
  return recurrence.until && +d > recurrence.until ? undefined : +d;
}
export function toICS(t: SavedTab) {
  const at = fireTime(t); if (!at) throw new Error('Schedule this item first');
  const f = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const esc = (s: string) => s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TabStory//Reminders//EN','BEGIN:VEVENT',`UID:task-${t.id}-${at}@tabstory`, `DTSTAMP:${f(Date.now())}`,`DTSTART:${f(at)}`,`DTEND:${f(at+900000)}`,`SUMMARY:${esc(t.title)}`,`DESCRIPTION:${esc(t.url)}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Reminder','TRIGGER:PT0M','END:VALARM','END:VEVENT','END:VCALENDAR'];
  // Fold at UTF-8 octet boundaries (RFC 5545), preserving Unicode titles.
  return lines.map(line => { let out = '', count = 0; for (const char of line) { const bytes = new TextEncoder().encode(char).length; if (count + bytes > 75) { out += '\r\n '; count = 1; } out += char; count += bytes; } return out; }).join('\r\n') + '\r\n';
}
export function downloadCalendar(t: SavedTab) {
  const url = URL.createObjectURL(new Blob([toICS(t)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'tab-story-reminder.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
