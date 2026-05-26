import Dexie, { type Table } from 'dexie';

export interface SavedTab {
  id?: number;
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
  folders!: Table<Folder>;
  stickyNotes!: Table<StickyNote>;
  studyFolders!: Table<StudyFolder>;
  studyTopics!: Table<StudyTopic>;

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
  }
}

export const db = new TabStoryDB();