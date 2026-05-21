export interface Tab {
  id: string;
  title: string;
  url: string;
  domain: string;
  favicon: string;
  tags: string[];
  pinned: boolean;
  savedAt: string;
  notes: string;
}

export interface Folder {
  id: string;
  name: string;
  domain: string;
  tabs: Tab[];
}