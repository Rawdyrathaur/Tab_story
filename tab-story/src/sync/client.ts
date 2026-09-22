import { io } from 'socket.io-client';
import { db, type SavedTab, type SyncOutboxEntry } from '../sidepanel/db';

export type SyncSettings = {
  serverUrl: string;
  bootstrapSecret: string;
  userId?: string;
  deviceId: string;
  accessToken?: string;
  refreshToken?: string;
  cursor: string;
  tier?: 'free' | 'premium';
  lastSyncAt?: number;
  email?: string;
  name?: string;
  authProvider?: 'google';
};

type SyncRecord = { id: string; type: string; isDeleted: boolean; editedAt: string; content?: Record<string, unknown> };
type SyncRejection = { id: string; code?: string; [key: string]: unknown };
type SyncPage = { records: SyncRecord[]; cursor: string; hasMore: boolean; fullResync: boolean; purgeHorizon: string };
export type SyncResponse = { ok: boolean; error?: string; pushed: { authoritative: SyncRecord[]; rejected: SyncRejection[] }; page: SyncPage };
type Session = SyncSettings;

const settingsKey = 'tabStorySync';
const makeId = () => crypto.randomUUID();
const localFields = (ms: number) => {
  const date = new Date(ms);
  return {
    scheduledDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    scheduledTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
};

function normalizeServerUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/$/, '') || '';
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function envValue(name: string): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
  return env[name] || '';
}

function syncOrigin(serverUrl: string): string {
  const parsed = new URL(serverUrl);
  return `${parsed.protocol}//${parsed.host}/*`;
}

async function settings(): Promise<Session> {
  const stored = (await chrome.storage.local.get(settingsKey))[settingsKey] as Partial<Session> | undefined;
  const configuredUrl = envValue('VITE_SYNC_SERVER_URL');
  const storedUrl = stored?.serverUrl === 'http://localhost:8787' && !configuredUrl ? '' : stored?.serverUrl;
  const value: Session = {
    serverUrl: normalizeServerUrl(storedUrl || configuredUrl),
    bootstrapSecret: stored?.bootstrapSecret || envValue('VITE_SYNC_BOOTSTRAP_SECRET'),
    userId: stored?.userId,
    deviceId: stored?.deviceId || makeId(),
    accessToken: stored?.accessToken,
    refreshToken: stored?.refreshToken,
    cursor: stored?.cursor || '0',
    tier: stored?.tier,
    lastSyncAt: stored?.lastSyncAt,
    email: stored?.email,
    name: stored?.name,
    authProvider: stored?.authProvider,
  };
  await chrome.storage.local.set({ [settingsKey]: value });
  return value;
}

async function saveSettings(value: Session) {
  await chrome.storage.local.set({ [settingsKey]: value });
}

export async function getSyncSettings(): Promise<SyncSettings> {
  return settings();
}

export async function updateSyncSettings(changes: Partial<SyncSettings>): Promise<SyncSettings> {
  const value = await settings();
  if (changes.serverUrl !== undefined) value.serverUrl = normalizeServerUrl(changes.serverUrl);
  Object.assign(value, changes);
  value.serverUrl = normalizeServerUrl(value.serverUrl);
  await saveSettings(value);
  return value;
}

export async function requestSyncServerAccess(): Promise<void> {
  const cfg = await settings();
  if (!cfg.serverUrl) throw new Error('Tab Story sync is not configured for this build.');
  const granted = await chrome.permissions.request({ origins: [syncOrigin(cfg.serverUrl)] });
  if (!granted) throw new Error('Chrome permission for Tab Story sync was denied.');
}

export async function signInWithGoogle(): Promise<SyncSettings> {
  const cfg = await settings();
  if (!cfg.serverUrl) throw new Error('Tab Story sync is not configured for this build.');
  await requestSyncServerAccess();
  const result = await chrome.identity.getAuthToken({ interactive: true, scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'] });
  const googleAccessToken = typeof result === 'string' ? result : result?.token;
  if (!googleAccessToken) throw new Error('Google sign-in did not return an account token.');
  const response = await fetch(`${cfg.serverUrl}/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: cfg.deviceId, credential: googleAccessToken, credentialType: 'access_token' }),
  });
  const data = await response.json().catch(() => ({})) as Partial<SyncSettings> & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not create the Tab Story account.');
  if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string' || typeof data.userId !== 'string' || !data.tier) throw new Error('Sync server returned an invalid account session.');
  Object.assign(cfg, data, { bootstrapSecret: '', authProvider: 'google' as const });
  await saveSettings(cfg);
  return cfg;
}

export async function signOut(): Promise<SyncSettings> {
  const cfg = await settings();
  cfg.accessToken = undefined;
  cfg.refreshToken = undefined;
  cfg.userId = undefined;
  cfg.email = undefined;
  cfg.name = undefined;
  cfg.authProvider = undefined;
  cfg.tier = undefined;
  cfg.cursor = '0';
  cfg.lastSyncAt = undefined;
  await saveSettings(cfg);
  return cfg;
}

const content = (tab: SavedTab) => {
  const { notes, scheduledAt, fireAt, ...value } = tab;
  const canonicalFireAt = fireAt ?? scheduledAt;
  const fields = canonicalFireAt ? localFields(canonicalFireAt) : {};
  return { ...value, note: notes, fireAt: canonicalFireAt, ...fields } as unknown as Record<string, unknown>;
};

export async function writeTab(tab: SavedTab): Promise<number> {
  const cfg = await settings();
  const now = Date.now();
  tab.uuid ??= makeId();
  tab.updatedAt = now;
  const entry: SyncOutboxEntry = {
    id: tab.uuid,
    type: 'resource',
    content: content(tab),
    collectionId: null,
    isDeleted: !!tab.deletedAt,
    editedAt: new Date(now).toISOString(),
    editedBy: cfg.deviceId,
  };
  return db.transaction('rw', db.tabs, db.syncOutbox, async () => {
    const id = Number(await db.tabs.put(tab));
    await db.syncOutbox.put(entry);
    return id;
  });
}

export async function updateTab(id: number, changes: Partial<SavedTab>) {
  const current = await db.tabs.get(id);
  if (!current) return 0;
  return writeTab({ ...current, ...changes, id });
}

async function ensureSession(cfg: Session) {
  if (!cfg.serverUrl) throw new Error('Sync server is not configured');
  if (cfg.accessToken && cfg.refreshToken && cfg.tier) return cfg;
  if (!cfg.bootstrapSecret || cfg.bootstrapSecret.length < 32) throw new Error('Sign in with Google to enable sync.');
  const response = await fetch(`${cfg.serverUrl}/auth/device`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId: cfg.deviceId, userId: cfg.userId, bootstrapSecret: cfg.bootstrapSecret }),
  });
  const data = await response.json().catch(() => ({})) as Partial<Session> & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Could not authenticate sync device');
  if (typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string' || typeof data.userId !== 'string' || !data.tier) {
    throw new Error('Sync server returned an invalid session');
  }
  Object.assign(cfg, data);
  await saveSettings(cfg);
  return cfg;
}

async function emitSync(socket: ReturnType<typeof io>, payload: unknown) {
  return await new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Sync request timed out')), 30_000);
    socket.emit('sync', payload, (result: unknown) => { clearTimeout(timer); resolve(result); });
  });
}

async function applyRecord(record: SyncRecord) {
  if (record.type !== 'resource') return;
  const local = await db.tabs.where('uuid').equals(record.id).first();
  const editedAt = new Date(record.editedAt).getTime();
  if (record.isDeleted) {
    if (local?.id) await db.tabs.update(local.id, { deletedAt: editedAt, updatedAt: editedAt });
    return;
  }
  const source = record.content ?? {};
  const canonicalFireAt = source.fireAt ?? source.scheduledAt;
  const fields = typeof canonicalFireAt === 'number' ? localFields(canonicalFireAt) : {};
  const value = {
    ...source,
    uuid: record.id,
    notes: typeof source.notes === 'string' ? source.notes : typeof source.note === 'string' ? source.note : '',
    fireAt: canonicalFireAt,
    scheduledAt: canonicalFireAt,
    ...fields,
    type: typeof source.type === 'string' ? source.type : 'tab',
    updatedAt: editedAt,
  } as SavedTab;
  delete (value as unknown as Record<string, unknown>).note;
  if (local?.id) await db.tabs.put({ ...value, id: local.id });
  else await db.tabs.add(value);
}

let activeSync: Promise<SyncResponse | undefined> | null = null;

async function runSync(): Promise<SyncResponse | undefined> {
  const cfg = await ensureSession(await settings());
  const socket = io(cfg.serverUrl, { transports: ['websocket'], auth: { accessToken: cfg.accessToken, refreshToken: cfg.refreshToken } });
  socket.on('auth:access-token', (payload: { accessToken?: string }) => {
    if (payload?.accessToken) { cfg.accessToken = payload.accessToken; void saveSettings(cfg); }
  });
  let cursor = cfg.cursor;
  let skipHorizon = false;
  let fullResyncHandled = false;
  const remaining = await db.syncOutbox.toArray();
  let lastResult: SyncResponse | undefined;
  try {
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    for (;;) {
      const batch = remaining.splice(0, 500);
      const result = await emitSync(socket, { changes: batch, cursor, skipHorizon }) as SyncResponse;
      if (!result?.ok) throw new Error(result?.error || 'Sync failed');
      if (!result.page || !Array.isArray(result.page.records) || typeof result.page.cursor !== 'string' || !result.pushed || !Array.isArray(result.pushed.authoritative) || !Array.isArray(result.pushed.rejected)) throw new Error('Sync response is invalid');
      lastResult = result;

      for (const row of result.pushed.authoritative || []) {
        await applyRecord(row);
        await db.syncOutbox.delete(row.id);
      }
      for (const rejection of result.pushed.rejected || []) {
        await db.syncOutbox.delete(rejection.id);
        if (rejection.code === 'LIMIT_REACHED' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('tab-story:limit-reached', { detail: rejection }));
      }

      const page = result.page;
      if (page.fullResync && !fullResyncHandled) {
        await db.tabs.clear();
        cursor = '0';
        skipHorizon = true;
        fullResyncHandled = true;
      }
      for (const row of page.records) await applyRecord(row);
      cursor = page.cursor;
      cfg.cursor = cursor;
      await saveSettings(cfg);
      if (!remaining.length && !page.hasMore) break;
    }
    cfg.lastSyncAt = Date.now();
    await saveSettings(cfg);
    return lastResult;
  } finally {
    socket.close();
  }
}

export function syncNow(): Promise<SyncResponse | undefined> {
  if (!activeSync) activeSync = runSync().finally(() => { activeSync = null; });
  return activeSync;
}
