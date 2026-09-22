import type { Recurrence } from './model';
import { ReminderError, type ReminderErrorCode } from './errors.ts';

export { ReminderError } from './errors.ts';
export const REMINDER_MESSAGE = 'tab-story:reminder';
export const REMINDER_NOTIFICATIONS_KEY = 'tabStory.reminderNotificationsEnabled';
export type ReminderOperation = 'schedule' | 'reschedule' | 'cancel' | 'complete' | 'snooze' | 'reconcile' | 'test' | 'archive' | 'restore' | 'keep' | 'open';
export interface ReminderRequest {
  type: typeof REMINDER_MESSAGE;
  operation: ReminderOperation;
  tabId?: number;
  scheduledAt?: number;
  minutes?: number;
  recurrence?: Recurrence | null;
}
export type ReminderResponse = { ok: true } | { ok: false; code: ReminderErrorCode };

/** Every UI window delegates to the single service-worker writer. */
async function request(operation: ReminderOperation, options: Partial<ReminderRequest> = {}): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.runtime.sendMessage) {
    throw new ReminderError('reminderUnavailable');
  }
  let response: ReminderResponse;
  try {
    response = await chrome.runtime.sendMessage({ type: REMINDER_MESSAGE, operation, ...options });
  } catch (cause) {
    throw new ReminderError('reminderUnavailable', { cause });
  }
  if (!response) throw new ReminderError('reminderUnavailable');
  if (!response.ok) throw new ReminderError(response.code);
}

/** Request notification access only from a user-initiated reminder action. */
export async function requestReminderPermission(): Promise<void> {
  const granted = await chrome.permissions.request({ permissions: ['notifications'] });
  if (!granted) throw new ReminderError('notificationPermission');
  await chrome.storage.local.set({ [REMINDER_NOTIFICATIONS_KEY]: true });
}

export async function setReminderNotificationsEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [REMINDER_NOTIFICATIONS_KEY]: enabled });
}

export async function areReminderNotificationsEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(REMINDER_NOTIFICATIONS_KEY);
  return result[REMINDER_NOTIFICATIONS_KEY] === true;
}

export const scheduleTabReminder = (tabId: number, scheduledAt: number, recurrence?: Recurrence | null) => request('schedule', { tabId, scheduledAt, recurrence });
export const rescheduleTabReminder = (tabId: number, scheduledAt: number) => request('reschedule', { tabId, scheduledAt });
export const cancelTabReminder = (tabId: number) => request('cancel', { tabId });
export const completeTabReminder = (tabId: number) => request('complete', { tabId });
export const snoozeTabReminder = (tabId: number, minutes = 10) => request('snooze', { tabId, minutes });
export const requestReminderReconciliation = () => request('reconcile');
export const restoreScheduledReminders = requestReminderReconciliation;
export const reconcileMissedReminders = requestReminderReconciliation;
export const testReminderNotification = async () => { await requestReminderPermission(); await request('test'); };

export async function archiveReminder(tabId: number) {
  await request('archive', { tabId });
  window.dispatchEvent(new CustomEvent('tab-story:archived', { detail: tabId }));
}
export const restoreReminder = (tabId: number) => request('restore', { tabId });
export const keepReminder = (tabId: number, scheduledAt: number) => request('keep', { tabId, scheduledAt });
export const openReminder = (tabId: number) => request('open', { tabId });
