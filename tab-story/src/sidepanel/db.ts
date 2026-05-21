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

class TabStoryDB extends Dexie {
  tabs!: Table<SavedTab>;
  folders!: Table<Folder>;
  stickyNotes!: Table<StickyNote>;

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
  }
}

export const db = new TabStoryDB();