import { io } from 'socket.io-client';
import { connectSyncSocket, sendSyncRequest } from './socket';
import { db, type Collection, type SavedTab, type SyncOutboxEntry } from '../sidepanel/db';
import { withSyncLock } from './lock';

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
  linkedAccountId?: string;
  initialPullPending?: boolean;
};

type SyncRecord = {
  id: string;
  type: string;
  isDeleted: boolean;
  editedAt: string;
  editedBy?: string;
  serverVersion?: string;
  content?: Record<string, unknown>;
};
type SyncRejection = { id: string; code?: string; [key: string]: unknown };
type SyncPage = {
  records: SyncRecord[];
  cursor: string;
  hasMore: boolean;
  fullResync: boolean;
  purgeHorizon: string;
};
export type SyncResponse = {
  ok: boolean;
  error?: string;
  pushed: { authoritative: SyncRecord[]; rejected: SyncRejection[] };
  page: SyncPage;
};
type Session = SyncSettings;
export type SyncStatus = {
  phase: 'local' | 'syncing' | 'synced' | 'offline' | 'reauth' | 'error';
  error?: string;
  updatedAt?: number;
  userId?: string;
  serverUrl?: string;
};
let syncStatus: SyncStatus = { phase: 'local' };
let statusWrite: Promise<void> = Promise.resolve();
const statusListeners = new Set<(status: SyncStatus) => void>();
export const getSyncStatus = () => syncStatus;
export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}
function setSyncStatus(status: SyncStatus, cfg?: Session): void {
  syncStatus = { ...status, updatedAt: Date.now(), userId: cfg?.userId, serverUrl: cfg?.serverUrl };
  statusListeners.forEach((listener) => listener(syncStatus));
  const snapshot = syncStatus;
  statusWrite = statusWrite
    .then(async () => {
      if (snapshot.userId) await db.meta.put({ key: 'tabStorySync.status', value: snapshot });
      else await db.meta.delete('tabStorySync.status');
    })
    .catch(() => {});
}

function sameChange(
  current: SyncOutboxEntry | undefined,
  sent: SyncOutboxEntry | undefined
): boolean {
  if (!current || !sent) return false;
  return current.mutationId && sent.mutationId
    ? current.mutationId === sent.mutationId
    : current.editedAt === sent.editedAt && current.editedBy === sent.editedBy;
}

async function takeBatch(remaining: SyncOutboxEntry[]): Promise<SyncOutboxEntry[]> {
  const batch: SyncOutboxEntry[] = [];
  let bytes = 0;
  while (remaining.length && batch.length < 500) {
    const next = remaining[0];
    const size = new TextEncoder().encode(JSON.stringify(next)).byteLength;
    if (size > 1_750_000) {
      remaining.shift();
      await db.transaction('rw', db.syncOutbox, async () => {
        const current = await db.syncOutbox.get(next.id);
        if (sameChange(current, next))
          await db.syncOutbox.put({ ...next, failed: 'PAYLOAD_TOO_LARGE' });
      });
      continue;
    }
    if (batch.length && bytes + size > 1_750_000) break;
    remaining.shift();
    bytes += size;
    batch.push(next);
  }
  return batch;
}

async function upgradeOutbox(cfg: Session): Promise<void> {
  await db.transaction('rw', db.tabs, db.collections, db.syncOutbox, db.meta, async () => {
    const legacy = await db.syncOutbox.filter((entry) => !entry.mutationId).toArray();
    if (!legacy.length) return;
    await db.meta.put({ key: `tabStorySync.outbox-backup.${makeId()}`, value: legacy });
    for (const entry of legacy) {
      const record =
        entry.type === 'collection'
          ? await db.collections.where('uuid').equals(entry.id).first()
          : await db.tabs.where('uuid').equals(entry.id).first();
      await db.syncOutbox.put({
        ...entry,
        mutationId: makeId(),
        baseVersion: record?.syncVersion || '0',
        accountId: entry.accountId || cfg.linkedAccountId,
      });
    }
  });
}

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
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname))
      return '';
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
  const stored = (await chrome.storage.local.get(settingsKey))[settingsKey] as
    | Partial<Session>
    | undefined;
  const configuredUrl = envValue('VITE_SYNC_SERVER_URL');
  const storedUrl =
    stored?.serverUrl === 'http://localhost:8787' && !configuredUrl ? '' : stored?.serverUrl;
  const value: Session = {
    serverUrl: normalizeServerUrl(storedUrl || configuredUrl),
    bootstrapSecret: '',
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
    linkedAccountId: stored?.linkedAccountId || stored?.userId,
    initialPullPending: stored?.initialPullPending,
  };
  const persisted = (await db.meta.get(`${settingsKey}.cursor`))?.value as
    | Partial<Session>
    | undefined;
  if (value.userId && persisted?.userId === value.userId && typeof persisted.cursor === 'string') {
    value.cursor = persisted.cursor;
    value.initialPullPending = persisted.initialPullPending;
    value.lastSyncAt = persisted.lastSyncAt ?? value.lastSyncAt;
    if (persisted.refreshToken === value.refreshToken && persisted.accessToken)
      value.accessToken = persisted.accessToken;
  }
  if (!stored?.deviceId || value.serverUrl !== stored?.serverUrl)
    await chrome.storage.local.set({ [settingsKey]: value });
  return value;
}

async function saveSettings(value: Session) {
  await chrome.storage.local.set({ [settingsKey]: value });
}

export async function getSyncSettings(): Promise<SyncSettings> {
  return settings();
}

export function subscribeSyncSettings(listener: () => void): () => void {
  const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[settingsKey]) listener();
  };
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
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
  if (!cfg.serverUrl) throw new Error('Tab Revo sync is not configured for this build.');
  const granted = await chrome.permissions.request({ origins: [syncOrigin(cfg.serverUrl)] });
  if (!granted) throw new Error('Chrome permission for Tab Revo sync was denied.');
}

export class AccountSwitchRequiredError extends Error {
  readonly email?: string;
  constructor(email?: string) {
    super(
      'This device contains data from another account. Confirm before uploading it to a different account.'
    );
    this.email = email;
  }
}

export async function signInWithGoogle(switchMode?: 'upload'): Promise<SyncSettings> {
  if (!navigator.onLine)
    throw new Error('You are offline. Local saving still works; sign in when you reconnect.');
  const cfg = await settings();
  if (!cfg.serverUrl) throw new Error('Tab Revo sync is not configured for this build.');
  await requestSyncServerAccess();
  const result = await chrome.identity.getAuthToken({
    interactive: true,
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  const googleAccessToken = typeof result === 'string' ? result : result?.token;
  if (!googleAccessToken) throw new Error('Google sign-in did not return an account token.');
  const response = await fetch(`${cfg.serverUrl}/auth/google`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      deviceId: cfg.deviceId,
      credential: googleAccessToken,
      credentialType: 'access_token',
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<SyncSettings> & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error || 'Could not create the Tab Revo account.');
  if (
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string' ||
    typeof data.userId !== 'string' ||
    !data.tier
  )
    throw new Error('Sync server returned an invalid account session.');
  if (cfg.linkedAccountId && cfg.linkedAccountId !== data.userId && switchMode !== 'upload')
    throw new AccountSwitchRequiredError(data.email);
  sessionGeneration++;
  stopActiveSync();
  const previousAccountId = cfg.linkedAccountId;
  const firstLink = !previousAccountId || previousAccountId !== data.userId;
  Object.assign(cfg, data, {
    bootstrapSecret: '',
    authProvider: 'google' as const,
    linkedAccountId: data.userId,
  });
  if (firstLink) {
    cfg.cursor = '0';
    cfg.initialPullPending = true;
    await db.transaction('rw', db.tabs, db.collections, db.syncOutbox, db.meta, async () => {
      if (previousAccountId && previousAccountId !== data.userId) {
        await db.meta.put({
          key: `tabStorySync.pending.${previousAccountId}`,
          value: await db.syncOutbox.toArray(),
        });
        await db.syncOutbox.clear();
      }
      const saved = (await db.meta.get(`tabStorySync.pending.${data.userId}`))?.value;
      if (Array.isArray(saved)) {
        for (const entry of saved)
          if (entry && typeof entry.id === 'string')
            await db.syncOutbox.put(entry as SyncOutboxEntry);
        await db.meta.delete(`tabStorySync.pending.${data.userId}`);
      }
      for (const tab of await db.tabs.toArray()) {
        if (!tab.uuid) continue;
        const existing = await db.syncOutbox.get(tab.uuid);
        if (existing?.editedAt && new Date(existing.editedAt).getTime() >= (tab.updatedAt || 0))
          continue;
        await db.syncOutbox.put({
          id: tab.uuid,
          mutationId: makeId(),
          baseVersion: tab.syncVersion || '0',
          type: 'resource',
          content: content(tab),
          collectionId: null,
          isDeleted: !!tab.deletedAt,
          editedAt: new Date(tab.updatedAt || Date.now()).toISOString(),
          editedBy: cfg.deviceId,
          accountId: data.userId,
        });
      }
      for (const collection of await db.collections.toArray()) {
        if (!collection.uuid) continue;
        const pending = await db.syncOutbox.get(collection.uuid);
        if (
          pending?.editedAt &&
          new Date(pending.editedAt).getTime() >= (collection.updatedAt || 0)
        )
          continue;
        await queueCollection(collection, cfg.deviceId, data.userId);
      }
      await db.meta.put({ key: settingsKey, value: cfg });
      await db.meta.put({
        key: `${settingsKey}.cursor`,
        value: {
          userId: cfg.userId,
          cursor: cfg.cursor,
          initialPullPending: cfg.initialPullPending,
        },
      });
    });
  }
  await saveSettings(cfg);
  return cfg;
}

export async function signOut(): Promise<SyncSettings> {
  sessionGeneration++;
  stopActiveSync();
  clearTimeout(retryTimer);
  clearTimeout(changeTimer);
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
  setSyncStatus({ phase: 'local' });
  return cfg;
}

const localResourceFields = [
  'id',
  'syncVersion',
  'folderId',
  'articleId',
  'articleStatus',
  'articleError',
  'readingMinutes',
  'deliveryClaimAt',
  'notifiedScheduledAt',
] as const;
function withoutLocalFields(record: object, keys: readonly string[]): Record<string, unknown> {
  const value = { ...record } as Record<string, unknown>;
  for (const key of keys) delete value[key];
  return value;
}

const content = (tab: SavedTab) => {
  const { notes, scheduledAt, fireAt } = tab;
  const value = withoutLocalFields(tab, [...localResourceFields, 'notes', 'scheduledAt', 'fireAt']);
  const canonicalFireAt = fireAt ?? scheduledAt;
  const fields = canonicalFireAt ? localFields(canonicalFireAt) : {};
  return { ...value, note: notes, fireAt: canonicalFireAt, ...fields } as unknown as Record<
    string,
    unknown
  >;
};

export async function writeTabInTransaction(
  tab: SavedTab,
  deviceId: string,
  accountId?: string
): Promise<number> {
  const now = Math.max(Date.now(), (tab.updatedAt || 0) + 1);
  tab.uuid ??= makeId();
  tab.updatedAt = now;
  const entry: SyncOutboxEntry = {
    id: tab.uuid,
    mutationId: makeId(),
    baseVersion: tab.syncVersion || '0',
    type: 'resource',
    content: content(tab),
    collectionId: null,
    isDeleted: !!tab.deletedAt,
    editedAt: new Date(now).toISOString(),
    editedBy: deviceId,
    accountId,
  };
  const id = Number(await db.tabs.put(tab));
  await db.syncOutbox.put(entry);
  return id;
}

export async function writeTab(tab: SavedTab): Promise<number> {
  const { deviceId, linkedAccountId } = await settings();
  return db.transaction('rw', db.tabs, db.syncOutbox, () =>
    writeTabInTransaction(tab, deviceId, linkedAccountId)
  );
}

export async function updateTabInTransaction(
  id: number,
  changes: Partial<SavedTab>,
  deviceId: string,
  accountId?: string
): Promise<number> {
  const current = await db.tabs.get(id);
  if (!current) return 0;
  return writeTabInTransaction({ ...current, ...changes, id }, deviceId, accountId);
}

export async function updateTab(id: number, changes: Partial<SavedTab>) {
  const { deviceId, linkedAccountId } = await settings();
  return db.transaction('rw', db.tabs, db.syncOutbox, () =>
    updateTabInTransaction(id, changes, deviceId, linkedAccountId)
  );
}

async function queueCollection(
  collection: Collection,
  deviceId: string,
  accountId?: string
): Promise<void> {
  const { tabIds } = collection;
  const value = withoutLocalFields(collection, ['id', 'tabIds', 'syncVersion']);
  const members = await db.tabs.bulkGet(tabIds);
  const tabUuids = [
    ...new Set([
      ...(collection.tabUuids || []),
      ...members.flatMap((tab) => (tab?.uuid ? [tab.uuid] : [])),
    ]),
  ];
  if (collection.id) await db.collections.update(collection.id, { tabUuids });
  await db.syncOutbox.put({
    id: collection.uuid!,
    mutationId: makeId(),
    baseVersion: collection.syncVersion || '0',
    type: 'collection',
    content: { ...value, tabUuids },
    collectionId: null,
    isDeleted: !!collection.deletedAt,
    editedAt: new Date(collection.updatedAt || collection.createdAt).toISOString(),
    editedBy: deviceId,
    accountId,
  });
}

export async function writeCollectionInTransaction(
  collection: Collection,
  deviceId: string,
  accountId?: string
): Promise<number> {
  collection.uuid ??= makeId();
  collection.updatedAt = Math.max(Date.now(), (collection.updatedAt || 0) + 1);
  const id = Number(await db.collections.put(collection));
  await queueCollection({ ...collection, id }, deviceId, accountId);
  return id;
}

export async function writeCollection(collection: Collection): Promise<number> {
  const { deviceId, linkedAccountId } = await settings();
  return db.transaction('rw', db.collections, db.tabs, db.syncOutbox, () =>
    writeCollectionInTransaction(collection, deviceId, linkedAccountId)
  );
}

export async function updateCollection(id: number, changes: Partial<Collection>): Promise<void> {
  const { deviceId, linkedAccountId } = await settings();
  await db.transaction('rw', db.collections, db.tabs, db.syncOutbox, async () => {
    const current = await db.collections.get(id);
    if (!current) return;
    const next = { ...current, ...changes };
    if (changes.tabIds) {
      const removed = await db.tabs.bulkGet(
        current.tabIds.filter((tabId) => !changes.tabIds!.includes(tabId))
      );
      const uuids = new Set(removed.flatMap((tab) => (tab?.uuid ? [tab.uuid] : [])));
      next.tabUuids = (next.tabUuids || []).filter((uuid) => !uuids.has(uuid));
    }
    await writeCollectionInTransaction(next, deviceId, linkedAccountId);
  });
}

async function reconcileCollectionMembers(): Promise<void> {
  for (const collection of await db.collections.toArray()) {
    if (!collection.tabUuids?.length || collection.deletedAt) continue;
    const members = await db.tabs.where('uuid').anyOf(collection.tabUuids).toArray();
    const ids = [...new Set(members.flatMap((tab) => (tab.id ? [tab.id] : [])))].sort(
      (a, b) => a - b
    );
    if (ids.join(',') !== [...collection.tabIds].sort((a, b) => a - b).join(',')) {
      await db.collections.update(collection.id!, { tabIds: ids });
    }
  }
}

async function applyCollection(
  record: SyncRecord,
  cfg: Session,
  acknowledged?: SyncOutboxEntry
): Promise<void> {
  const local = await db.collections.where('uuid').equals(record.id).first();
  if (!newerVersion(local, record) && !acknowledged) return;
  const pending = await db.syncOutbox.get(record.id);
  if (pending && !sameChange(pending, acknowledged)) {
    if (acknowledged && record.editedBy === cfg.deviceId && record.serverVersion) {
      if (local?.id) await db.collections.update(local.id, { syncVersion: record.serverVersion });
      await db.syncOutbox.put({ ...pending, baseVersion: record.serverVersion });
      return;
    }
    if (pending.isDeleted && !record.isDeleted) await db.syncOutbox.delete(record.id);
    else return;
  }
  const editedAt = new Date(record.editedAt).getTime();
  if (!Number.isFinite(editedAt)) throw new Error('Sync server returned an invalid timestamp.');
  if (record.isDeleted) {
    if (local?.id)
      await db.collections.update(local.id, {
        deletedAt: editedAt,
        updatedAt: editedAt,
        syncVersion: record.serverVersion,
      });
    return;
  }
  const source = withoutLocalFields(record.content || {}, ['id', 'tabIds', 'syncVersion']);
  const tabUuids = Array.isArray(source.tabUuids)
    ? [...new Set(source.tabUuids.filter((id): id is string => typeof id === 'string'))]
    : local?.tabUuids || [];
  const members = tabUuids.length ? await db.tabs.where('uuid').anyOf(tabUuids).toArray() : [];
  const value: Collection = {
    ...local,
    ...source,
    uuid: record.id,
    name: typeof source.name === 'string' ? source.name : local?.name || 'Collection',
    category: typeof source.category === 'string' ? source.category : local?.category || '',
    tabIds: members.flatMap((tab) => (tab.id ? [tab.id] : [])),
    tabUuids,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : editedAt,
    updatedAt: editedAt,
    deletedAt: undefined,
    syncVersion: record.serverVersion,
  };
  if (local?.id) await db.collections.put({ ...value, id: local.id });
  else await db.collections.add(value);
}

function noteOf(value: Record<string, unknown>): string {
  return typeof value.notes === 'string'
    ? value.notes
    : typeof value.note === 'string'
      ? value.note
      : '';
}

function newerVersion(local: { syncVersion?: string } | undefined, record: SyncRecord): boolean {
  if (!local?.syncVersion || !record.serverVersion) return true;
  try {
    return BigInt(record.serverVersion) > BigInt(local.syncVersion);
  } catch {
    return true;
  }
}

async function conflictCopy(
  tab: SavedTab,
  parentId: string,
  source: string,
  deviceId: string,
  accountId?: string
): Promise<void> {
  if (!tab.notes?.trim()) return;
  if (
    await db.tabs
      .filter((row) => row.conflictOf === parentId && row.conflictFrom === source)
      .first()
  )
    return;
  const copy: SavedTab = {
    ...tab,
    id: undefined,
    uuid: makeId(),
    title: `${tab.title || 'Untitled'} (conflict copy)`,
    conflictOf: parentId,
    conflictFrom: source,
    deletedAt: undefined,
    updatedAt: Date.now(),
    syncVersion: undefined,
    type: 'note',
    status: 'pending',
    fireAt: undefined,
    scheduledAt: undefined,
    scheduledDate: undefined,
    scheduledTime: undefined,
    recurrence: null,
  };
  await db.transaction('rw', db.tabs, db.syncOutbox, async () => {
    await db.tabs.add(copy);
    await db.syncOutbox.put({
      id: copy.uuid!,
      mutationId: makeId(),
      baseVersion: '0',
      type: 'resource',
      content: content(copy),
      collectionId: null,
      isDeleted: false,
      editedAt: new Date(copy.updatedAt!).toISOString(),
      editedBy: deviceId,
      accountId,
    });
  });
}

async function applyRecord(record: SyncRecord, cfg: Session, acknowledged?: SyncOutboxEntry) {
  if (record.type === 'collection') return applyCollection(record, cfg, acknowledged);
  if (record.type !== 'resource') return;
  const local = await db.tabs.where('uuid').equals(record.id).first();
  if (!newerVersion(local, record) && !acknowledged) return;
  const pending = await db.syncOutbox.get(record.id);
  if (pending && !sameChange(pending, acknowledged)) {
    if (
      acknowledged &&
      record.editedBy === cfg.deviceId &&
      record.serverVersion &&
      noteOf(record.content || {}) === noteOf(acknowledged.content)
    ) {
      if (local?.id) await db.tabs.update(local.id, { syncVersion: record.serverVersion });
      await db.syncOutbox.put({ ...pending, baseVersion: record.serverVersion });
      return;
    }
    if (pending.isDeleted && !record.isDeleted) await db.syncOutbox.delete(record.id);
    else {
      if (!record.isDeleted && noteOf(record.content || {}) !== (local?.notes || '')) {
        const incoming = record.content || {};
        await conflictCopy(
          { ...local, ...incoming, notes: noteOf(incoming), uuid: record.id } as SavedTab,
          record.id,
          `remote:${record.editedAt}`,
          cfg.deviceId,
          cfg.userId
        );
      }
      return;
    }
  }
  const editedAt = new Date(record.editedAt).getTime();
  if (!Number.isFinite(editedAt)) throw new Error('Sync server returned an invalid timestamp.');
  if (
    acknowledged &&
    local &&
    !record.isDeleted &&
    noteOf(record.content || {}) !== (local.notes || '')
  ) {
    await conflictCopy(
      local,
      record.id,
      `local:${acknowledged.editedAt}`,
      cfg.deviceId,
      cfg.userId
    );
  }
  if (record.isDeleted) {
    if (local?.id)
      await db.tabs.update(local.id, {
        deletedAt: editedAt,
        updatedAt: editedAt,
        syncVersion: record.serverVersion,
      });
    return;
  }
  const source = record.content ?? {};
  const safeSource = withoutLocalFields(source, localResourceFields);
  const canonicalFireAt = source.fireAt ?? source.scheduledAt;
  const fields = typeof canonicalFireAt === 'number' ? localFields(canonicalFireAt) : {};
  const domain =
    typeof source.domain === 'string' ? source.domain : new URL(String(source.url)).hostname;
  let folderId = local?.folderId;
  if (!folderId) {
    const folder = await db.folders.where('domain').equals(domain).first();
    folderId =
      folder?.id ?? Number(await db.folders.add({ name: domain, domain, createdAt: Date.now() }));
  }
  const value = {
    ...local,
    ...safeSource,
    uuid: record.id,
    folderId,
    notes:
      typeof source.notes === 'string'
        ? source.notes
        : typeof source.note === 'string'
          ? source.note
          : '',
    fireAt: canonicalFireAt,
    scheduledAt: canonicalFireAt,
    ...fields,
    type: typeof source.type === 'string' ? source.type : 'tab',
    updatedAt: editedAt,
    deletedAt: undefined,
    syncVersion: record.serverVersion,
  } as SavedTab;
  delete (value as unknown as Record<string, unknown>).note;
  if (local?.id) await db.tabs.put({ ...value, id: local.id });
  else await db.tabs.add(value);
}

let activeSync: Promise<SyncResponse | undefined> | null = null;
let activeSocket: ReturnType<typeof io> | null = null;
let activeAbort: AbortController | null = null;
function stopActiveSync(): void {
  activeAbort?.abort();
  activeSocket?.disconnect();
}
let sessionGeneration = 0;
let changeTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let retryAttempt = 0;
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[settingsKey]) return;
    const oldValue = changes[settingsKey].oldValue as Partial<Session> | undefined;
    const newValue = changes[settingsKey].newValue as Partial<Session> | undefined;
    if (
      oldValue?.userId !== newValue?.userId ||
      oldValue?.refreshToken !== newValue?.refreshToken
    ) {
      sessionGeneration++;
      stopActiveSync();
      clearTimeout(retryTimer);
      if (!newValue?.refreshToken) setSyncStatus({ phase: 'local' });
    }
  });
}
const scheduleSync = () => {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    void syncNow().catch(() => {});
  }, 1500);
};
db.syncOutbox.hook('creating', scheduleSync);
db.syncOutbox.hook('updating', scheduleSync);

async function runSync(): Promise<SyncResponse | undefined> {
  const cfg = await settings();
  if (!cfg.serverUrl || (!cfg.accessToken && !cfg.refreshToken && !cfg.userId)) {
    setSyncStatus({ phase: 'local' });
    return undefined;
  }
  if (!cfg.userId || !cfg.refreshToken) {
    setSyncStatus({ phase: 'reauth' }, cfg);
    return undefined;
  }
  if (!navigator.onLine) {
    setSyncStatus({ phase: 'offline' }, cfg);
    return undefined;
  }
  setSyncStatus({ phase: 'syncing' }, cfg);
  const controller = new AbortController();
  activeAbort = controller;
  const socket = io(cfg.serverUrl, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000,
    auth: { accessToken: cfg.accessToken, refreshToken: cfg.refreshToken },
  });
  activeSocket = socket;
  const generation = sessionGeneration;
  socket.on('auth:access-token', (payload: { accessToken?: string }) => {
    if (generation === sessionGeneration && payload?.accessToken)
      cfg.accessToken = payload.accessToken;
  });
  let cursor = cfg.cursor;
  let skipHorizon = false;
  let lastResult: SyncResponse | undefined;
  try {
    await upgradeOutbox(cfg);
    const remaining = (await db.syncOutbox.toArray()).filter(
      (entry) => !entry.failed && (!entry.accountId || entry.accountId === cfg.userId)
    );
    if (generation !== sessionGeneration) return undefined;
    await connectSyncSocket(socket, controller.signal);
    if (generation !== sessionGeneration) return undefined;
    for (;;) {
      const batch = cfg.initialPullPending ? [] : await takeBatch(remaining);
      const result = (await sendSyncRequest(
        socket,
        { changes: batch, cursor, skipHorizon },
        controller.signal
      )) as SyncResponse;
      if (generation !== sessionGeneration) return undefined;
      if (!result?.ok) throw new Error(result?.error || 'Sync failed');
      if (
        !result.page ||
        !Array.isArray(result.page.records) ||
        typeof result.page.cursor !== 'string' ||
        !result.pushed ||
        !Array.isArray(result.pushed.authoritative) ||
        !Array.isArray(result.pushed.rejected)
      )
        throw new Error('Sync response is invalid');
      lastResult = result;

      const page = result.page;
      if (page.fullResync) skipHorizon = true;
      await db.transaction(
        'rw',
        [db.tabs, db.folders, db.collections, db.syncOutbox, db.meta],
        async () => {
          for (const row of result.pushed.authoritative) {
            const sent = batch.find((entry) => entry.id === row.id);
            await applyRecord(row, cfg, sent);
            const current = await db.syncOutbox.get(row.id);
            if (sameChange(current, sent)) await db.syncOutbox.delete(row.id);
          }
          for (const rejection of result.pushed.rejected) {
            const sent = batch.find((entry) => entry.id === rejection.id);
            const current = await db.syncOutbox.get(rejection.id);
            if (current && sameChange(current, sent))
              await db.syncOutbox.put({ ...current, failed: rejection.code || 'SYNC_REJECTED' });
            if (rejection.code === 'LIMIT_REACHED' && typeof window !== 'undefined')
              window.dispatchEvent(
                new CustomEvent('tab-revo:limit-reached', { detail: rejection })
              );
          }
          for (const row of page.records) await applyRecord(row, cfg);
          await reconcileCollectionMembers();
          if (generation !== sessionGeneration) throw new Error('Sync session changed.');
          cfg.cursor = page.cursor;
          if (cfg.initialPullPending && !page.hasMore) cfg.initialPullPending = false;
          await db.meta.put({ key: `${settingsKey}.cursor`, value: cfg });
        }
      );
      if (generation !== sessionGeneration) return undefined;
      cursor = cfg.cursor;
      setSyncStatus({ phase: 'syncing' }, cfg);
      if (!remaining.length && !page.hasMore && !cfg.initialPullPending) break;
    }
    cfg.lastSyncAt = Date.now();
    if (generation !== sessionGeneration) return undefined;
    await db.meta.put({ key: `${settingsKey}.cursor`, value: cfg });
    retryAttempt = 0;
    const failed = await db.syncOutbox
      .filter((entry) => !!entry.failed && (!entry.accountId || entry.accountId === cfg.userId))
      .count();
    setSyncStatus({ phase: failed ? 'error' : 'synced' }, cfg);
    if (
      await db.syncOutbox
        .filter((entry) => !entry.failed && (!entry.accountId || entry.accountId === cfg.userId))
        .count()
    )
      scheduleSync();
    return lastResult;
  } catch (error) {
    if (generation !== sessionGeneration) return undefined;
    const message = error instanceof Error ? error.message : 'Sync failed';
    const reauth = /AUTH_REQUIRED|Invalid refresh token/i.test(message);
    setSyncStatus(
      { phase: reauth ? 'reauth' : !navigator.onLine ? 'offline' : 'error', error: message },
      cfg
    );
    if (!reauth) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(
        () => {
          void syncNow().catch(() => {});
        },
        Math.random() * Math.min(300_000, 1000 * 2 ** Math.min(retryAttempt++, 8))
      );
    }
    throw error;
  } finally {
    socket.close();
    if (activeSocket === socket) activeSocket = null;
    if (activeAbort === controller) activeAbort = null;
  }
}

export function syncNow(): Promise<SyncResponse | undefined> {
  if (!activeSync)
    activeSync = withSyncLock(runSync).finally(() => {
      activeSync = null;
    });
  return activeSync;
}

export async function retryFailedChanges(): Promise<SyncResponse | undefined> {
  const cfg = await settings();
  if (!cfg.serverUrl || !cfg.userId || !cfg.refreshToken) return undefined;
  if (!navigator.onLine) {
    setSyncStatus({ phase: 'offline' }, cfg);
    return undefined;
  }
  await db.syncOutbox
    .filter((entry) => !!entry.failed && (!entry.accountId || entry.accountId === cfg.userId))
    .modify({ failed: undefined });
  return syncNow();
}
