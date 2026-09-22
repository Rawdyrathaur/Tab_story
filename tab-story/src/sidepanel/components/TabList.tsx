import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ClockIcon, DocumentTextIcon, MapPinIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import { useI18n } from '../../i18n/useI18n';
import { fireTime } from '../../reminders/model';
import { db, type SavedTab } from '../db';
import type { ViewMode } from '../App';
import { getFaviconForDomain } from '../utils/url';
import { saveOfflineArticle } from '../../reminders/offlineReader';
import { updateTab } from '../../sync/client';

function formatTabTitle(title: string): string {
  if (!title) return '';
  const words = title.trim().split(/\s+/);
  const twoWords = words.slice(0, 2).join(' ');
  if (twoWords.length > 10) return `${twoWords.slice(0, 10)}...`;
  return words.length > 2 ? `${twoWords}...` : twoWords;
}

function TabFavicon({ tab, size = 20 }: { tab: SavedTab; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? chrome.runtime.getURL('icons/icon-16.png') : getFaviconForDomain(tab.domain);
  return <img src={src} width={size} height={size} alt="" className="saved-tab-favicon" onError={() => setFailed(true)} />;
}

/** Compact row retained for collection membership lists. */
export function TabRowList({ tab, onMenu }: { tab: SavedTab; onMenu?: (tab: SavedTab) => void; mode?: 'default' | 'notes' }) {
  const { t, formatDate } = useI18n();
  return <div className="collection-tab-row">
    <TabFavicon tab={tab} size={16} />
    <button className="collection-tab-open" title={tab.url} onClick={() => chrome.tabs.create({ url: tab.url })}>{formatTabTitle(tab.title)}</button>
    {tab.pinned && <MapPinIcon className="collection-tab-pin" aria-label={t('tabs.pinned')} />}
    {tab.notes && <DocumentTextIcon className="collection-tab-note" aria-label={t('common.note')} />}
    <time>{formatDate(tab.createdAt)}</time>
    <button className="collection-tab-menu" onClick={() => onMenu?.(tab)} title={t('common.moreOptions')} aria-label={t('common.moreOptions')}><EllipsisVerticalIcon /></button>
  </div>;
}

export function TabList({ searchQuery = '', onMenu, mode = 'default', sortOrder = 'desc', onDiscussAI, onRead }: {
  searchQuery?: string;
  viewMode?: ViewMode;
  onMenu?: (tab: SavedTab) => void;
  mode?: 'default' | 'notes';
  sortOrder?: 'desc' | 'asc';
  onDiscussAI?: (tab: SavedTab, groupTabs?: SavedTab[]) => void;
  onRead?: (articleId: string) => void;
}) {
  const { t } = useI18n();
  const tabs = useLiveQuery(() => db.tabs.toArray());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);
  if (!tabs) return null;

  const query = searchQuery.trim().toLocaleLowerCase();
  const visibleTabs = tabs
    .filter(tab => !tab.deletedAt && tab.status !== 'archived')
    .filter(tab => mode !== 'notes' || Boolean(tab.notes))
    .filter(tab => !query || [tab.title, tab.url, tab.domain, tab.notes, ...(tab.tags || [])].some(value => value?.toLocaleLowerCase().includes(query)))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
    });

  if (!visibleTabs.length) return <div className="saved-tab-empty">
    <span aria-hidden="true">📭</span><strong>{t('tabs.empty')}</strong><small>{t('tabs.saveHint')}</small>
  </div>;

  return <div className="saved-tab-card-list">
    {visibleTabs.map(tab => {
      const scheduledAt = fireTime(tab);
      const completed = Boolean(tab.completedAt) || tab.status === 'completed';
      const missed = Boolean(scheduledAt && scheduledAt < now && !completed);
      const upcoming = Boolean(scheduledAt && scheduledAt >= now && !completed);
      const scheduledLabel = tab.scheduledDate ? `${tab.scheduledDate} ${tab.scheduledTime || ''}`.trim() : undefined;
      const reminderText = completed ? 'Completed' : missed ? 'Past due' : upcoming ? scheduledLabel || 'Scheduled' : 'No reminder';
      const statusText = completed ? 'Done' : missed ? 'Missed' : upcoming ? 'Reminder set' : 'Not set';

      return <article key={tab.id} className={`saved-tab-card${missed ? ' is-missed' : ''}`} onClick={() => tab.articleStatus === 'saved' && tab.articleId ? onRead?.(tab.articleId) : onMenu?.(tab)}>
        <div className="saved-tab-card-header">
          <div className="saved-tab-identity">
            <TabFavicon tab={tab} size={28} />
            <div className="saved-tab-copy"><strong title={tab.title}>{tab.domain || tab.title}</strong><span title={tab.url}>{tab.url}</span></div>
          </div>
          <div className="saved-tab-actions">
            <button onClick={event => { event.stopPropagation(); onDiscussAI?.(tab); }} title={t('tabs.discuss')} aria-label={t('tabs.discuss')}><SparklesIcon className="saved-tab-ai-icon" /></button>
            <button onClick={event => { event.stopPropagation(); onMenu?.(tab); }} title={tab.notes ? t('tabs.editNote') : t('tabs.addNote')} aria-label={tab.notes ? t('tabs.editNote') : t('tabs.addNote')}><DocumentTextIcon className={`saved-tab-note-icon${tab.notes ? ' active' : ''}`} /></button>
            <button onClick={event => { event.stopPropagation(); onMenu?.(tab); }} title={t('common.moreOptions')} aria-label={t('common.moreOptions')}><EllipsisVerticalIcon /></button>
            <button onClick={event => { event.stopPropagation(); void updateTab(tab.id!, { pinned: !tab.pinned }); }} title={tab.pinned ? t('tabs.unpin') : t('tabs.pin')} aria-label={tab.pinned ? t('tabs.unpin') : t('tabs.pin')}><MapPinIcon className={`saved-tab-pin-icon${tab.pinned ? ' active' : ''}`} /></button>
            {missed && <span className="saved-tab-missed-plus" title="Missed reminder"><PlusIcon /></span>}
          </div>
        </div>
        {tab.notes && <button className="saved-tab-note-preview" onClick={event => { event.stopPropagation(); onMenu?.(tab); }}><DocumentTextIcon /><span>{tab.notes}</span></button>}
        {tab.articleStatus && tab.articleStatus !== 'skipped' && <button className={`extension-reader-chip ${tab.articleStatus}`} onClick={event => { event.stopPropagation(); if (tab.articleId) onRead?.(tab.articleId); else if (tab.articleStatus === 'failed') void saveOfflineArticle(tab.id!); }}>{tab.articleStatus === 'saved' ? `📖 ${tab.readingMinutes || 1} min · Read offline` : tab.articleStatus === 'failed' ? `Couldn't save · Retry` : 'Saving article…'}</button>}
        <div className="saved-tab-divider" />
        <div className="saved-tab-status-row">
          <div className={`saved-tab-time${missed ? ' is-missed' : ''}`}><ClockIcon /><span>{reminderText}</span></div>
          <span className={`saved-tab-status ${completed ? 'done' : missed ? 'missed' : upcoming ? 'upcoming' : 'unset'}`}>{statusText}</span>
        </div>
      </article>;
    })}
  </div>;
}
