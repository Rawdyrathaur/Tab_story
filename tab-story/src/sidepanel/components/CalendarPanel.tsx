import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDaysIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { fireTime } from '../../reminders/model';
import { archiveReminder, completeTabReminder, snoozeTabReminder } from '../../reminders/service';
import { useI18n } from '../../i18n/useI18n';
import { getWeekInfo } from '../../i18n/core';
import { db, type SavedTab } from '../db';
import { getFaviconForDomain } from '../utils/url';
import { ScheduleEditor } from './ScheduleEditor';

export function CalendarPanel() {
  const { t, locale, dir, formatDate, formatNumber } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());
  const [choosing, setChoosing] = useState(false);
  const [editing, setEditing] = useState<SavedTab | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tabs = useLiveQuery(() => db.tabs.toArray());
  const collections = useLiveQuery(() => db.collections.toArray());
  const active = (tabs || []).filter(tab => !tab.deletedAt && tab.status !== 'archived');
  const collectionNames = new Map<number, string>();
  for (const collection of collections || []) {
    if (collection.deletedAt) continue;
    for (const tabId of collection.tabIds) collectionNames.set(tabId, collection.name);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const timestamp = (tab: SavedTab) => fireTime(tab) || 0;
  const scheduled = (tabs || [])
    .filter(tab => !tab.deletedAt && tab.status !== 'archived' && timestamp(tab) > 0)
    .sort((a, b) => timestamp(a) - timestamp(b));
  const selectedTasks = scheduled.filter(tab => new Date(timestamp(tab)).toDateString() === selected.toDateString());
  const firstDay = getWeekInfo(locale).firstDay % 7;
  const offset = (month.getDay() - firstDay + 7) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + dayCount) / 7) * 7 }, (_, index) => index >= offset && index < offset + dayCount ? index - offset + 1 : null);

  async function action(run: () => Promise<void>) {
    setBusy(true); setError('');
    try { await run(); }
    catch (cause) { console.error('[Tab Story] Calendar', cause); setError(cause instanceof Error && cause.message.startsWith('errors.') ? cause.message : 'app.operationFailed'); }
    finally { setBusy(false); }
  }

  function changeMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next); setSelected(next); setEditing(null);
  }

  function chooseToday() {
    const today = new Date(now);
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(today); setEditing(null);
  }

  return <section className="pwa-calendar">
    {error && <p role="alert">{t(error)}</p>}

    <div className="pwa-calendar-panel">
      <div className="pwa-calendar-heading">
        <strong aria-live="polite">{formatDate(month, { month: 'long', year: 'numeric' })}</strong>
        <div className="pwa-calendar-nav">
          <button aria-label={t('calendar.previous')} onClick={() => changeMonth(dir === 'rtl' ? 1 : -1)}><ChevronLeftIcon /></button>
          <button onClick={chooseToday}>{t('common.today')}</button>
          <button aria-label={t('calendar.next')} onClick={() => changeMonth(dir === 'rtl' ? -1 : 1)}><ChevronRightIcon /></button>
        </div>
      </div>

      <table className="pwa-calendar-grid" aria-label={formatDate(month, { month: 'long', year: 'numeric' })}>
        <thead><tr>{Array.from({ length: 7 }, (_, index) => {
          const weekday = new Date(2026, 5, 7 + (firstDay + index) % 7);
          return <th key={index} scope="col" title={formatDate(weekday, { weekday: 'long' })}>{formatDate(weekday, { weekday: 'short' }).slice(0, 2)}</th>;
        })}</tr></thead>
        <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((day, column) => {
          if (!day) return <td key={column} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const hasTasks = scheduled.some(tab => new Date(timestamp(tab)).toDateString() === date.toDateString());
          const isToday = date.toDateString() === new Date(now).toDateString();
          const isSelected = date.toDateString() === selected.toDateString();
          return <td key={column}><button
            aria-label={formatDate(date, { dateStyle: 'full' })}
            aria-current={isToday ? 'date' : undefined}
            aria-selected={isSelected}
            onClick={() => { setSelected(date); setEditing(null); }}
          >{formatNumber(day)}{(isToday || hasTasks) && <span className="pwa-calendar-dot" />}</button></td>;
        })}</tr>)}</tbody>
      </table>
    </div>

    <div className="pwa-calendar-panel pwa-calendar-tasks">
      <div className="pwa-calendar-task-heading">
        <h3>{formatDate(selected, { dateStyle: 'medium' })}</h3>
        <span>{selectedTasks.length} scheduled</span>
      </div>

      {selectedTasks.map(tab => {
        const overdue = !tab.completedAt && timestamp(tab) < now;
        return <article key={tab.id} className={`pwa-calendar-task${tab.completedAt ? ' completed' : ''}`}>
          <div className="pwa-calendar-task-copy">
            <div className="pwa-calendar-task-title">
              <img src={getFaviconForDomain(tab.domain)} alt="" />
              <strong className={overdue ? 'overdue' : ''} title={tab.title}>{tab.title || tab.domain}</strong>
              {overdue && <span>OVERDUE</span>}
            </div>
            <small>{tab.domain}<time className={overdue ? 'overdue' : ''}>{tab.scheduledTime || formatDate(timestamp(tab), { hour: '2-digit', minute: '2-digit' })}</time></small>
          </div>
          <div className="pwa-calendar-task-actions">
            <button disabled={busy || Boolean(tab.completedAt)} title={t('calendar.complete')} aria-label={t('calendar.complete')} onClick={() => action(() => completeTabReminder(tab.id!))}><CheckIcon className={tab.completedAt ? 'complete' : ''} /></button>
            <button disabled={busy} title={t('calendar.reschedule')} aria-label={t('calendar.reschedule')} onClick={() => setEditing(tab)}><CalendarDaysIcon /></button>
            <button disabled={busy || Boolean(tab.completedAt)} title="Snooze 10 min" aria-label="Snooze 10 min" onClick={() => action(() => snoozeTabReminder(tab.id!, 10))}><ClockIcon /></button>
            <button disabled={busy} title="Let go" aria-label="Let go" onClick={() => action(() => archiveReminder(tab.id!))}><TrashIcon /></button>
          </div>
        </article>;
      })}

      {!selectedTasks.length && <p className="pwa-calendar-empty">{t('calendar.empty')}</p>}
    </div>

    <div className="action-row">
      <button onClick={() => { setChoosing(value => !value); setEditing(null); }}>{active.length ? 'Schedule' : 'Schedule current tab +'}</button>
    </div>
    {choosing && <div className="calendar-card"><label htmlFor="calendar-tab">{t('calendar.selectTab')}</label><select id="calendar-tab" value="" onChange={event => { setEditing(active.find(tab => tab.id === Number(event.target.value)) || null); setChoosing(false); }}><option value="">{t('calendar.selectTab')}</option>{active.map(tab => <option key={tab.id} value={tab.id}>{collectionNames.get(tab.id!) ? `${collectionNames.get(tab.id!)} · ${tab.title}` : tab.title}</option>)}</select>{!active.length && <p>{t('calendar.noTabs')}</p>}</div>}

    {editing && <ScheduleEditor key={String(editing.id)} tab={editing} onClose={() => setEditing(null)} />}
  </section>;
}
