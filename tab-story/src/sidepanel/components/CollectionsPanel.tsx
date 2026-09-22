import { useState } from 'react';
import newCollectionIcon from '../assets/new-collection.png?inline';
import { useLiveQuery } from 'dexie-react-hooks';
import { PencilSquareIcon, TrashIcon, RectangleStackIcon, PlusIcon, EllipsisHorizontalIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { db, type SavedTab } from '../db';
import { addToCollection, createCollection } from '../collections';
import { TabRowList } from './TabList';
import { TabMenu } from './TabMenu';
import { useI18n } from '../../i18n/useI18n';

export function CollectionsPanel({ onDiscussAI }: { onDiscussAI: (tab: SavedTab) => void }) {
  const { t } = useI18n();
  const collections = useLiveQuery(() => db.collections.toArray());
  const tabs = useLiveQuery(() => db.tabs.toArray());
  const [active, setActive] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [menuView, setMenuView] = useState<'menu' | 'schedule'>('menu');
  const [menuTab, setMenuTab] = useState<SavedTab | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);
  const [notice, setNotice] = useState('');
  const collection = collections?.find(item => item.id === active);
  const members = (tabs || []).filter(tab => !tab.deletedAt && collection?.tabIds.includes(tab.id!));
  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  async function saveCurrent() {
    if (!collection) return;
    const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!current?.url || !/^https?:\/\//i.test(current.url)) throw new Error('Open a webpage to save it.');
    const existing = await db.tabs.where('url').equals(current.url).first();
    const latest = await db.collections.get(collection.id!);
    if (!latest) throw new Error('This collection no longer exists.');
    if (existing && !existing.deletedAt && latest.tabIds.includes(existing.id!)) { setNotice('Already saved'); return; }
    await addToCollection(collection.id!, [{ url: current.url, title: current.title || current.url, favicon: current.favIconUrl }]);
    setNotice('Saved');
    setMenuView('schedule'); setMenuTab(await db.tabs.where('url').equals(current.url).first() || null);
  }
  const reset = () => { setActive(null); setEditing(false); setMenu(false); setError(''); setNotice(''); setVisibleCount(40); };
  return <section className="collections-panel" aria-label="Collections">
    {error && <p role="alert">{error}</p>}
    {notice && <small role="status">{notice}</small>}
    {!collections || !tabs ? <p>{t('app.loading')}</p> : <>
      <div className="collection-toolbar">
        {collection ? <><button aria-label="All collections" onClick={reset}><ChevronLeftIcon /></button><strong>{collection.name}</strong><button aria-label="Save current tab to collection" title="Save current tab" disabled={busy} onClick={() => run(saveCurrent)}><PlusIcon style={{ color: '#ef4444' }} /></button><button aria-label="Collection options" aria-expanded={menu} onClick={() => setMenu(!menu)}><EllipsisHorizontalIcon /></button></>
          : <button className="collection-add" onClick={() => { setName(''); setEditing(true); }}><img src={newCollectionIcon} loading="eager" alt="" width={84} height={84} style={{ objectFit: 'contain', flexShrink: 0 }} /><span>New collection</span></button>}
      </div>
      {menu && collection && <div className="action-row collection-actions"><button onClick={() => { setName(collection.name); setEditing(true); setMenu(false); }}><PencilSquareIcon aria-hidden="true" />Edit name</button><button disabled={busy} onClick={() => {
        if (window.confirm('Delete this collection? Saved tabs and reminders will remain.')) void run(async () => { await db.collections.delete(collection.id!); reset(); });
      }}><TrashIcon aria-hidden="true" />Delete collection</button></div>}
      {editing && <form className="collection-name" onSubmit={event => { event.preventDefault(); void run(async () => {
        if (!name.trim()) return;
        if (collection) await db.collections.update(collection.id!, { name: name.trim() });
        else { setActive(await createCollection(name, '')); setVisibleCount(40); }
        setEditing(false);
      }); }}><input aria-label="Collection name" autoFocus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Collection name" /><button disabled={busy} type="submit">Save</button><button type="button" onClick={() => setEditing(false)}>Cancel</button></form>}
      {!collection && !editing && <>
        {!collections.length && <p className="collection-empty">Keep related tabs together.</p>}
        {collections.map(item => <button key={item.id} className="collection-item" onClick={() => setActive(item.id!)}><RectangleStackIcon /><span>{item.name}</span><small>{tabs.filter(tab => !tab.deletedAt && item.tabIds.includes(tab.id!)).length}</small></button>)}
      </>}
      {collection && !editing && <>
        {!members.length && <p className="collection-empty">Save the current tab here.</p>}
        <div className="collection-tabs">{[...members].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt).slice(0, visibleCount).map(tab => <TabRowList key={tab.id} tab={tab} onMenu={tab => { setMenuView('menu'); setMenuTab(tab); }} />)}</div>
        {members.length > visibleCount && <button onClick={() => setVisibleCount(count => count + 40)}>Show more</button>}
      </>}
    </>}
    {menuTab && collection && <TabMenu initialView={menuView} tab={menuTab} onClose={() => setMenuTab(null)} onDiscussAI={onDiscussAI} firstScheduleSetup onRemoveFromCollection={async () => {
      await db.transaction('rw', db.collections, async () => { const latest = await db.collections.get(collection.id!); if (latest) await db.collections.update(collection.id!, { tabIds: latest.tabIds.filter(id => id !== menuTab.id) }); });
    }} />}
  </section>;
}
