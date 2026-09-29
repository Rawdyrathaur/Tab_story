import { useEffect, useState } from 'react';
import { db, type SavedTab } from '../db';
import { captureLink } from '../../reminders/capture';
import { getPresets, normalizeTaskUrl, downloadCalendar, type Recurrence } from '../../reminders/model';
import { scheduleTabReminder, archiveReminder, requestReminderPermission } from '../../reminders/service';
import { ScheduleEditor } from './ScheduleEditor';
import { updateTab } from '../../sync/client';

export function CapturePanel() {
  const [shown, setShown] = useState(location.hash === '#capture');
  const [url, setUrl] = useState(''); const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState<Recurrence['freq'] | ''>('');
  const [ics, setIcs] = useState(false); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [duplicate, setDuplicate] = useState<SavedTab | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [editing, setEditing] = useState<SavedTab | null>(null);
  async function load() {
    const stored = await chrome.storage.local.get('tabStory.capture');
    const capture = stored['tabStory.capture'] as { url: string; title: string } | undefined;
    if (capture) { setUrl(capture.url); setTitle(capture.title); await chrome.storage.local.remove('tabStory.capture'); return; }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /^https?:/.test(tab.url)) { setUrl(tab.url); setTitle(tab.title || ''); }
  }
  useEffect(() => { if (shown) void Promise.resolve().then(load).catch(() => {}); }, [shown]);
  async function save(at: number, choice?: 'move' | 'both') {
    setBusy(true); setMessage('');
    try {
      await requestReminderPermission();
      const match = (await db.tabs.toArray()).find(t => !t.deletedAt && !t.completedAt && t.status === 'pending' && normalizeTaskUrl(t.url) === normalizeTaskUrl(url));
      if (match && !choice) { setDuplicate(match); setPending(at); return; }
      const id = choice === 'move' && match ? match.id! : await captureLink(url, title, '', choice === 'both');
      await updateTab(id, { title: title.trim() || new URL(url).hostname });
      await scheduleTabReminder(id, at, repeat ? { freq: repeat, interval: 1, until: null } : null);
      if (ics) downloadCalendar((await db.tabs.get(id))!);
      setSaved(choice === 'move' ? null : id); setDuplicate(null);
      setMessage(`Saved for ${new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`);
      void navigator.storage?.persist?.().catch(() => {});
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save reminder'); }
    finally { setBusy(false); }
  }
  return <section className="calendar-card capture-panel"><button onClick={() => setShown(!shown)}>Schedule current tab +</button>{shown && <>
    <label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Page title" /></label>
    <label>Link<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /></label>
    <details><summary>Repeat: {repeat || 'None'}</summary><select aria-label="Repeat" value={repeat} onChange={e => setRepeat(e.target.value as typeof repeat)}><option value="">None</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></details>
    <label className="checkbox-row"><input type="checkbox" checked={ics} onChange={e => setIcs(e.target.checked)} />Also add to phone calendar</label>
    <div className="preset-grid">{getPresets().map(p => <button key={p.id} disabled={busy || !url} onClick={() => void save(p.when)}>{p.label}<small>{new Date(p.when).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</small></button>)}</div>
    <button disabled={busy || !url} onClick={() => { setBusy(true); void captureLink(url,title).then(id => db.tabs.get(id)).then(t => setEditing(t || null)).catch(e => setMessage(String(e))).finally(() => setBusy(false)); }}>Pick date & time…</button>
    {duplicate && <div role="status">Already scheduled for {new Date(duplicate.fireAt || duplicate.scheduledAt!).toLocaleString()}.<div className="action-row"><button disabled={busy} onClick={() => void save(pending!, 'move')}>Move it here</button><button disabled={busy} onClick={() => void save(pending!, 'both')}>Keep both</button></div></div>}
    {message && <p role="status">{message}{saved && <><button onClick={() => void archiveReminder(saved).then(() => { setSaved(null); setMessage('Save undone. Available in Recently let go.'); }).catch(e => setMessage(String(e)))}>Undo</button><button onClick={() => void db.tabs.get(saved).then(t => setEditing(t || null))}>Change</button></>}</p>}
    {editing && <ScheduleEditor tab={editing} onClose={() => setEditing(null)} />}
  </>}</section>;
}
