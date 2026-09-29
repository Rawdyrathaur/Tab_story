import type { SyncSettings, SyncStatus } from './client';

export type SyncOperation = 'connect' | 'sync' | 'signout' | null;

export function belongsToAccount(entry: { accountId?: string }, accountId?: string): boolean {
  return !entry.accountId || entry.accountId === accountId;
}

export function syncProblem(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (/AUTH_REQUIRED|refresh token|Sign in with Google/i.test(message)) return 'Sign in again to resume sync. Your local changes are safe.';
  if (/GOOGLE_SIGN_IN_NOT_CONFIGURED|not configured/i.test(message)) return 'Google account sync is not configured for this build yet.';
  if (/GOOGLE_SIGN_IN_FAILED|Google sign-in/i.test(message)) return 'Google sign-in could not finish. Try again and check the allowed Google accounts.';
  if (/permission.*denied|permission.*not granted/i.test(message)) return 'Allow access to the sync server in Chrome, then try again.';
  if (/RATE_LIMITED|429/i.test(message)) return 'The server is busy. Your changes are saved here; try again shortly.';
  if (/timed? ?out|timeout|TimeoutError/i.test(message)) return 'The server took too long to respond. Your changes are saved here.';
  if (/PAYLOAD_TOO_LARGE/i.test(message)) return 'One saved item is too large to upload. It is still on this device.';
  if (/quota|storage|database/i.test(message)) return 'Device storage is unavailable. Check browser storage before retrying.';
  if (/network|fetch|websocket|connection|interrupted|AbortError/i.test(message)) return 'Cannot reach the sync server. Your changes are saved here and will retry.';
  return 'Sync could not finish. Your local data is safe; try again.';
}

export function latestSyncStatus(local: SyncStatus, shared: SyncStatus | undefined, settings: SyncSettings | null): SyncStatus {
  const current = local.userId === settings?.userId && local.serverUrl === settings?.serverUrl ? local : { phase: 'local' as const };
  if (shared?.userId === settings?.userId && shared?.serverUrl === settings?.serverUrl
      && shared?.updatedAt && shared.updatedAt >= (current.updatedAt || 0)
      && (shared.phase !== 'syncing' || Date.now() - shared.updatedAt < 45_000)) return shared;
  return current;
}

export function syncPresentation(settings: SyncSettings | null, status: SyncStatus, pending: number, failed: number,
  online: boolean, operation: SyncOperation, loading: boolean) {
  const session = !!(settings?.userId && settings?.refreshToken);
  const needsSignIn = !!settings?.serverUrl && (status.phase === 'reauth' || (!!settings?.userId && !session));
  const connected = session && !!settings?.serverUrl && !needsSignIn;
  let label = 'Local only';
  let tone = 'local';
  let detail = settings?.serverUrl ? 'Use the same Google account on all your devices.'
    : 'Cloud sync is not configured yet. Your data stays on this device.';
  if (loading) label = 'Checking…';
  else if (operation === 'connect') { label = 'Connecting…'; tone = 'syncing'; detail = 'Connecting your Google account…'; }
  else if (operation === 'signout') { label = 'Signing out…'; detail = 'Your saved data will stay on this device.'; }
  else if (!online && settings?.serverUrl) { label = session ? 'Offline' : 'Local only'; detail = session ? 'Changes will sync automatically when you reconnect.' : 'Saved on this device. Sign in when you are back online.'; }
  else if (needsSignIn) { label = 'Needs sign-in'; tone = 'reauth'; detail = 'Sign in again to resume sync. Your local changes are safe.'; }
  else if (connected) {
    if (operation === 'sync' || (status.phase === 'syncing' && (!status.updatedAt || Date.now() - status.updatedAt < 45_000))) {
      label = 'Syncing…'; tone = 'syncing'; detail = 'Updating tabs, notes and collections…';
    } else if (status.phase === 'error' || failed > 0) {
      label = 'Needs attention'; tone = 'error'; detail = status.error ? syncProblem(status.error) : 'Some changes could not upload. They are still saved here.';
    } else if (pending > 0 || !settings?.lastSyncAt) {
      label = 'Waiting to sync'; detail = 'Your changes are saved here and will sync automatically.';
    } else {
      label = 'Synced'; tone = 'connected'; detail = 'Tabs, notes and collections are up to date.';
    }
  }
  return { label, tone, detail, connected, needsSignIn };
}

export function formatLastSync(value?: number): string {
  if (!value || !Number.isFinite(value)) return 'Not yet';
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString([], sameDay ? { hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
