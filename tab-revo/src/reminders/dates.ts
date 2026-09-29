import { ReminderError } from './errors.ts';

const pad = (value: number) => String(value).padStart(2, '0');

/** HTML date input values are local calendar dates, never UTC ISO dates. */
export function toLocalDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalTimeInput(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Schedules use the browser's local time zone at creation. Stored epoch values
 * stay fixed if the user later travels. DST gaps are rejected; an ambiguous
 * autumn clock time uses the earlier occurrence (ECMAScript compatible policy).
 */
export function parseLocalSchedule(date: string, time: string, now = Date.now()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ReminderError('invalidDate');
  if (!/^\d{2}:\d{2}$/.test(time)) throw new ReminderError('invalidTime');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ReminderError('invalidDate');
  }
  if (hour > 23 || minute > 59) throw new ReminderError('invalidTime');
  // Check calendar validity without involving local DST midnight transitions.
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
    throw new ReminderError('invalidDate');
  }
  const local = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 ||
      local.getDate() !== day || local.getHours() !== hour || local.getMinutes() !== minute) {
    throw new ReminderError('nonexistentLocalTime');
  }
  if (!Number.isFinite(local.getTime())) throw new ReminderError('invalidSchedule');
  if (local.getTime() <= now) throw new ReminderError('pastSchedule');
  return local.getTime();
}
