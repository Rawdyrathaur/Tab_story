import Dexie, { type Table } from 'dexie';
import { migrateTask, type TaskStatus, type Recurrence } from '../reminders/model';
import { migrateLegacyStorage } from './legacyMigration';

export interface SavedTab {
  id?: number;
  uuid?: string;
  articleStatus?: 'queued' | 'saving' | 'saved' | 'failed' | 'skipped' | null;
  articleId?: string | null;
  readingMinutes?: number | null;
  articleError?: string | null;
  fireAt?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  status?: TaskStatus;
  type?: 'tab' | 'note';
  source?: 'extension' | 'pwa';
  urlKey?: string;
  tz?: string;
  recurrence?: Recurrence | null;
  seriesId?: string;
  occurrenceKey?: string;
  snoozeCount?: number;
  reviewCount?: number;
  reviewAfter?: number;
  firedAt?: number;
  missedAt?: number;
  openedAt?: number;
  archivedAt?: number;
  updatedAt?: number;
  deliveryClaimAt?: number;
  archivePrevious?: { status?: TaskStatus; notifiedScheduledAt?: number; completedAt?: number };
  url: string;
  title: string;
  favicon: string;
  domain: string;
  folderId?: number;
  tags: string[];
  createdAt: number;
  notes: string;
  pinned: boolean;
  scheduledAt?: number;
  /** The schedule generation already delivered (or included in a missed summary). */
  notifiedScheduledAt?: number;
  completedAt?: number;
  completedScheduledAt?: number;
  deletedAt?: number;
}

export interface Collection {
  id?: number;
  uuid?: string;
  name: string;
  category: string;
  tabIds: number[];
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export type SyncRecordType = 'collection' | 'resource' | 'note' | 'reminder';
export interface SyncOutboxEntry { id: string; type: SyncRecordType; content: Record<string, unknown>; collectionId?: string | null; isDeleted: boolean; editedAt: string; editedBy: string; }

export interface ReminderSummary {
  id: 'missed';
  entries: { tabId: number; scheduledAt: number }[];
}
export interface OfflineArticle {
  id: string; tabUuid: string; url: string; title: string; byline?: string | null; siteName?: string | null;
  lang?: string | null; dir?: 'ltr' | 'rtl' | null; excerpt?: string | null; contentHtml: string; text: string;
  wordCount: number; readingMinutes: number; contentHash: string; sizeBytes: number;
  savedAt: number; updatedAt: number; readProgress: number; lastReadAt?: number | null;
}

export interface Folder {
  id?: number;
  name: string;
  domain: string;
  createdAt: number;
}

export interface StickyNote {
  id?: number;
  title: string;
  body: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudyFolder {
  id?: number;
  name: string;
  emoji: string;
  autoNote: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudyTopic {
  id?: number;
  studyFolderId: number;
  name: string;
  autoNote: string;
  createdAt: number;
  updatedAt: number;
}

export function generateAutoNote(names: string[]): string {
  return names.length > 0 ? `Topics: ${names.join(', ')}` : '';
}

class TabStoryDB extends Dexie {
  tabs!: Table<SavedTab>;
  meta!: Table<{ key: string; value: unknown }, string>;
  collections!: Table<Collection>;
  folders!: Table<Folder>;
  stickyNotes!: Table<StickyNote>;
  studyFolders!: Table<StudyFolder>;
  studyTopics!: Table<StudyTopic>;
  reminderState!: Table<ReminderSummary, string>;
  migrationState!: Table<{ id: string }, string>;
  articles!: Table<OfflineArticle, string>;
  tombstones!: Table<{ uuid: string; deletedAt: number }, string>;
  syncOutbox!: Table<SyncOutboxEntry, string>;

  constructor() {
    super('TabStoryDB');
    this.version(2).stores({
      tabs: '++id, url, domain, folderId, createdAt',
      folders: '++id, name, domain',
      stickyNotes: '++id, createdAt',
    });
    this.version(3).stores({
      tabs: '++id, url, domain, folderId, createdAt',
      folders: '++id, name, domain',
      stickyNotes: '++id, createdAt, updatedAt',
    });
    this.version(4).stores({
      tabs: '++id, url, domain, folderId, createdAt',
      folders: '++id, name, domain',
      stickyNotes: null,
    });
    this.version(5).stores({
      tabs: '++id, url, domain, folderId, createdAt',
      folders: '++id, name, domain',
      studyFolders: '++id, createdAt',
      studyTopics: '++id, studyFolderId',
    });
    this.version(6).stores({
      tabs: '++id, url, domain, folderId, createdAt, scheduledAt',
      folders: '++id, name, domain',
      studyFolders: '++id, createdAt',
      studyTopics: '++id, studyFolderId',
    });
    this.version(7).stores({
      tabs: '++id, url, domain, folderId, createdAt, scheduledAt, deletedAt',
      folders: '++id, name, domain',
      studyFolders: '++id, createdAt',
      studyTopics: '++id, studyFolderId',
    });
    // Optional fields preserve all pre-existing schedules. Only the durable
    // aggregate notification mapping needs an additional object store.
    this.version(8).stores({
      tabs: '++id, url, domain, folderId, createdAt, scheduledAt, deletedAt',
      folders: '++id, name, domain',
      studyFolders: '++id, createdAt',
      studyTopics: '++id, studyFolderId',
      reminderState: 'id',
    });
    this.version(9).stores({ migrationState: 'id' });
    this.version(10).stores({ collections: '++id, name, category, createdAt' });
    this.version(11).stores({
      tabs: '++id, url, domain, folderId, createdAt, scheduledAt, deletedAt, fireAt, status, [status+fireAt], urlKey, archivedAt, updatedAt, &occurrenceKey',
      meta: 'key',
    }).upgrade(async tx => {
      const rows = await tx.table('tabs').toArray();
      // Transactional pre-upgrade copy: a failed migration leaves the old DB intact.
      await tx.table('meta').put({ key: 'beforeSchedulerMigration', value: rows });
      await tx.table('tabs').toCollection().modify(t => Object.assign(t, migrateTask(t)));
    });
    this.version(12).stores({
      tabs: '++id, &uuid, url, domain, folderId, createdAt, scheduledAt, deletedAt, fireAt, status, [status+fireAt], urlKey, archivedAt, updatedAt, &occurrenceKey, articleStatus, articleId',
      articles: '&id, tabUuid, savedAt, updatedAt, lastReadAt', tombstones: '&uuid, deletedAt',
    }).upgrade(tx => tx.table('tabs').toCollection().modify(row => {
      row.uuid ??= crypto.randomUUID(); row.articleStatus ??= null; row.articleId ??= null; row.readingMinutes ??= null;
    }));
    this.version(13).stores({
      collections: '++id, &uuid, name, category, createdAt, updatedAt, deletedAt',
      syncOutbox: '&id, type, editedAt',
    }).upgrade(tx => tx.table('collections').toCollection().modify(row => { row.uuid ??= crypto.randomUUID(); row.updatedAt ??= row.createdAt; }));
    this.tabs.hook('creating', (_key, row) => { Object.assign(row, migrateTask(row)); row.uuid ??= crypto.randomUUID(); });
    this.collections.hook('creating', (_key, row) => { row.uuid ??= crypto.randomUUID(); row.updatedAt ??= Date.now(); });
    this.on('versionchange', () => {
      this.close();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('tab-story:database-updated'));
    });
    this.on('ready', () => migrateLegacyStorage(this.vip as TabStoryDB), true);
  }
}

export const db = new TabStoryDB();
