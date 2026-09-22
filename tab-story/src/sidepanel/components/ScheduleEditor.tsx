import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import type { SavedTab } from '../db';
import { db } from '../db';
import { parseLocalSchedule, toLocalDateInput, toLocalTimeInput } from '../../reminders/dates';
import { requestReminderPermission, scheduleTabReminder } from '../../reminders/service';
import { getFaviconForDomain } from '../utils/url';
import { useI18n } from '../../i18n/useI18n';
import { requestOfflineReaderAccess, saveOfflineArticle } from '../../reminders/offlineReader';

type Preset = 'today_evening' | 'tomorrow_morning' | 'in_1_hour';

export function ScheduleEditor({ tab, initialDate, onClose }: { tab: SavedTab; initialDate?: Date; onClose: () => void }) {
  const { t } = useI18n();
  const tabs = useLiveQuery(() => db.tabs.filter(item => !item.deletedAt && item.status !== 'archived').toArray());
  const [targetId, setTargetId] = useState(tab.id!);
  const [initial] = useState(() => tab.scheduledAt || initialDate?.getTime() || Math.ceil((Date.now() + 3600000) / 60000) * 60000);
  const [date, setDate] = useState(toLocalDateInput(initial));
  const [time, setTime] = useState(toLocalTimeInput(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const target = tabs?.find(item => item.id === targetId) || tab;

  function applyPreset(preset: Preset) {
    const next = new Date();
    if (preset === 'today_evening') next.setHours(18, 0, 0, 0);
    if (preset === 'tomorrow_morning') { next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0); }
    if (preset === 'in_1_hour') next.setHours(next.getHours() + 1);
    setDate(toLocalDateInput(next.getTime()));
    setTime(toLocalTimeInput(next.getTime()));
  }

  async function confirm(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await requestReminderPermission();
      const offlineAccess = await requestOfflineReaderAccess(target.url).catch(() => false);
      await scheduleTabReminder(targetId, parseLocalSchedule(date, time));
      if (offlineAccess) void saveOfflineArticle(targetId);
      void navigator.storage?.persist?.().catch(() => {});
      onClose();
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith('errors.') ? cause.message : 'Could not schedule this tab.');
      setBusy(false);
    }
  }

  return <form className="schedule-editor pwa-schedule-editor" onSubmit={confirm}>
    <div className="pwa-schedule-title"><CalendarDaysIcon /><h3>Schedule Tab</h3></div>

    <label className="pwa-schedule-target">
      <img src={getFaviconForDomain(target.domain)} alt="" />
      <select aria-label="Tab to schedule" value={targetId} onChange={event => setTargetId(Number(event.target.value))} disabled={busy}>
        {(tabs || [tab]).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>

    <div className="pwa-schedule-presets">
      <button type="button" className="today" onClick={() => applyPreset('today_evening')} disabled={busy}>Today 6 PM</button>
      <button type="button" className="tomorrow" onClick={() => applyPreset('tomorrow_morning')} disabled={busy}>Tomorrow 9 AM</button>
      <button type="button" onClick={() => applyPreset('in_1_hour')} disabled={busy}>+1 Hour</button>
    </div>

    <div className="pwa-schedule-fields">
      <label>Date<input type="date" required value={date} onChange={event => setDate(event.target.value)} disabled={busy} /></label>
      <label>Time<input type="time" required value={time} onChange={event => setTime(event.target.value)} disabled={busy} /></label>
    </div>

    {error && <p role="alert">{error.startsWith('errors.') ? t(error) : error}</p>}
    <button className="pwa-schedule-confirm" type="submit" disabled={busy}>{busy ? 'Scheduling…' : 'Confirm Schedule'}</button>
  </form>;
}
