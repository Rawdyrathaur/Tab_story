import { db } from './sidepanel/db';

// Migration markers belong to this installation, not a restored account backup.
const backupTables = () => db.tables.filter(table => table.name !== 'migrationState' && table.name !== 'meta');

const KEY = 'tabStory.backup';
export const BACKUP_ALARM = 'tab-story:daily-backup';
const PREFS = ['tabStory.locale', 'tab-story-theme', 'tabStory.aiModel'];
const FILE = 'tab-story-account-backup-v1.json';
type State = { connected?: boolean; daily?: boolean; lastBackup?: number; error?: string };
async function state(): Promise<State> { return (await chrome.storage.local.get(KEY))[KEY] || {}; }
async function update(change: State) { await chrome.storage.local.set({ [KEY]: { ...await state(), ...change } }); }
async function token(interactive = false): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive, scopes: ['https://www.googleapis.com/auth/drive.appdata'] });
  const value = typeof result === 'string' ? result : result?.token;
  if (!value) throw new Error('Connect your Google account again to continue.');
  return value;
}
async function request(path: string, access: string, init: RequestInit = {}) {
  const response = await fetch('https://www.googleapis.com/' + path, {
    ...init, headers: { ...init.headers, Authorization: 'Bearer ' + access },
    signal: AbortSignal.timeout(25000),
  });
  if (response.status === 401) {
    await chrome.identity.removeCachedAuthToken({ token: access });
    throw new Error('Google sign-in expired. Reconnect your account.');
  }
  if (!response.ok) throw new Error('Google Drive request failed (' + response.status + '). Check your account connection and Drive API access.');
  return response;
}
async function files(access: string) {
  const query = new URLSearchParams({ spaces: 'appDataFolder', q: "name = '" + FILE + "' and trashed = false", orderBy: 'createdTime desc', pageSize: '20', fields: 'files(id,createdTime)' });
  return (await (await request('drive/v3/files?' + query, access)).json()).files as { id: string; createdTime: string }[];
}
async function backup() {
  const access = await token();
  const tables: Record<string, unknown[]> = {};
  await db.transaction('r', backupTables(), async () => {
    for (const table of backupTables()) tables[table.name] = await table.toArray();
  });
  const payload = { version: 1, createdAt: Date.now(), tables, preferences: await chrome.storage.local.get(PREFS) };
  const content = JSON.stringify(payload);
  if (content.length > 20000000) throw new Error('Backup exceeds the 20 MB limit.');
  const boundary = 'tabstory_' + crypto.randomUUID();
  const metadata = JSON.stringify({ name: FILE, parents: ['appDataFolder'] });
  const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + metadata +
    '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + content + '\r\n--' + boundary + '--';
  await request('upload/drive/v3/files?uploadType=multipart', access, {
    method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body,
  });
  await update({ lastBackup: payload.createdAt, error: '' });
}
async function restore(id: string) {
  const access = await token();
  if (!(await files(access)).some(file => file.id === id)) throw new Error('Backup not found in this account.');
  const response = await request('drive/v3/files/' + encodeURIComponent(id) + '?alt=media', access);
  const raw = await response.text();
  if (raw.length > 20000000) throw new Error('Backup exceeds the size limit.');
  const data = JSON.parse(raw);
  if (data.version !== 1 || !data.tables || !data.preferences) throw new Error('Unsupported backup format.');
  if (data.tables.collections === undefined) data.tables.collections = [];
  if (!Array.isArray(data.tables.collections)) throw new Error('Invalid collections.');
  for (const collection of data.tables.collections) {
    if (!collection || typeof collection.name !== 'string' || typeof collection.category !== 'string' || !Array.isArray(collection.tabIds) || !collection.tabIds.every((id: unknown) => Number.isSafeInteger(id) && Number(id) > 0)) throw new Error('Invalid collection.');
  }
  for (const table of backupTables()) {
    const rows = data.tables[table.name];
    if (!Array.isArray(rows) || rows.length > 100000 || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid backup table: ' + table.name);
    const ids = new Set<unknown>();
    for (const row of rows) {
      if (table.name === 'reminderState') continue;
      if (!Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id)) throw new Error('Invalid or duplicate record ID: ' + table.name);
      ids.add(row.id);
      for (const field of ['createdAt', 'updatedAt', 'scheduledAt', 'notifiedScheduledAt', 'completedAt', 'completedScheduledAt', 'deletedAt']) {
        if (row[field] !== undefined && (!Number.isSafeInteger(row[field]) || row[field] < 0 || row[field] > 8640000000000000)) throw new Error('Invalid backup timestamp.');
      }
    }
  }
  for (const tab of data.tables.tabs) {
    if (typeof tab.url !== 'string' || !/^https?:\/\//i.test(tab.url) || typeof tab.title !== 'string' || !Array.isArray(tab.tags) || !tab.tags.every((tag: unknown) => typeof tag === 'string')) throw new Error('Invalid saved tab in backup.');
    const url = new URL(tab.url);
    if (!['http:', 'https:'].includes(url.protocol) || typeof tab.notes !== 'string' || typeof tab.pinned !== 'boolean') throw new Error('Invalid saved tab fields.');
    tab.domain = url.hostname.replace(/^www\./, '');
    tab.notifiedScheduledAt = undefined;
  }
  for (const folder of data.tables.folders) if (typeof folder.name !== 'string' || typeof folder.domain !== 'string') throw new Error('Invalid folder.');
  for (const folder of data.tables.studyFolders) if (typeof folder.name !== 'string' || typeof folder.emoji !== 'string' || typeof folder.autoNote !== 'string') throw new Error('Invalid study folder.');
  for (const topic of data.tables.studyTopics) if (typeof topic.name !== 'string' || typeof topic.autoNote !== 'string' || !Number.isSafeInteger(topic.studyFolderId)) throw new Error('Invalid study topic.');
  // Notification handles belong to this installation, not the backup's machine.
  data.tables.reminderState = [];
  const preferences: Record<string, string> = {};
  for (const key of PREFS) if (typeof data.preferences[key] === 'string') preferences[key] = data.preferences[key];
  // Preserve the current state locally before an explicitly confirmed replacement.
  const previous: Record<string, unknown[]> = {};
  await db.transaction('r', backupTables(), async () => { for (const table of backupTables()) previous[table.name] = await table.toArray(); });
  await chrome.storage.local.set({ 'tabStory.beforeRestore': { tables: previous, preferences: await chrome.storage.local.get(PREFS) } });
  await db.transaction('rw', backupTables(), async () => {
    for (const table of backupTables()) { await table.clear(); await table.bulkPut(data.tables[table.name]); }
  });
  await chrome.storage.local.set(preferences);
}
export async function ensureBackupAlarm() {
  const current = await state();
  if (current.connected && current.daily) {
    if (!await chrome.alarms.get(BACKUP_ALARM)) await chrome.alarms.create(BACKUP_ALARM, { when: Math.max(Date.now() + 60000, (current.lastBackup || Date.now()) + 86400000), periodInMinutes: 1440 });
  } else await chrome.alarms.clear(BACKUP_ALARM);
}
let running = false;
export async function handleBackup(operation: string, id?: string) {
  if (operation === 'status') return await state();
  if (running) throw new Error('An account operation is already running.');
  running = true;
  try {
    if (operation === 'connect') {
      await token(true);
      await update({ connected: true, error: '' });
    } else if (operation === 'disconnect') {
      await update({ connected: false, daily: false, error: '' });
    } else {
      if (!(await state()).connected) throw new Error('Connect Google first.');
      if (operation === 'list') return { files: await files(await token()) };
      if (operation === 'backup') await backup();
      else if (operation === 'restore') {
        if (typeof id !== 'string' || !id) throw new Error('Select a backup to restore.');
        await restore(id);
      }
      else if (operation === 'enable') { await backup(); await update({ daily: true }); }
      else if (operation === 'disable') await update({ daily: false });
      else if (!['backup', 'restore'].includes(operation)) throw new Error('Unknown backup action.');
    }
    await ensureBackupAlarm();
    return await state();
  } catch (cause) {
    await update({ error: cause instanceof Error ? cause.message : 'Account backup failed.' });
    throw cause;
  } finally { running = false; }
}
