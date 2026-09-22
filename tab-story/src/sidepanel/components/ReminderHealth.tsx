import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { DAY } from '../../reminders/model';
import { getReviewPrefs, defaultReviewPrefs } from '../../reminders/lifecycle';
import { testReminderNotification, restoreReminder, requestReminderReconciliation } from '../../reminders/service';
import { exportScheduler, importScheduler, restoreSnapshot, validatePrefs } from '../../reminders/dataSafety';

export function NotificationWarning() {
  const [blocked, setBlocked] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  useEffect(() => {
    const refresh = () => void chrome.permissions.contains({ permissions: ['notifications'] }).then(async enabled => {
      setBlocked(enabled && await chrome.notifications.getPermissionLevel() !== 'granted');
    }).catch(() => setBlocked(false));
    const version = () => setUpgraded(true);
    refresh(); window.addEventListener('focus', refresh); window.addEventListener('tab-story:database-updated',version);
    chrome.notifications.onPermissionLevelChanged.addListener(refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('tab-story:database-updated',version); chrome.notifications.onPermissionLevelChanged.removeListener(refresh); };
  }, []);
  return <>{upgraded && <p role="alert">Tab Story was updated in another window. <button onClick={() => location.reload()}>Reload to continue</button></p>}{blocked && <div role="alert" className="notification-warning">Notifications are blocked. Enable Tab Story in Chrome’s extension settings, then allow Chrome notifications in macOS System Settings or Windows Settings → System → Notifications. Check Do Not Disturb too. <button onClick={() => window.dispatchEvent(new Event('tab-story:reminder-setup'))}>Fix alerts</button></div>}</>;
}
export function ReminderHealth() {
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(defaultReviewPrefs);
  const tick = useLiveQuery(() => db.meta.get('lastTickAt'));
  const rows = useLiveQuery(() => db.tabs.toArray()) || [];
  const stats = useLiveQuery(() => db.meta.get('stats:' + new Date().toISOString().slice(0,7)));
  const counts = (stats?.value || {}) as Record<string,number>;
  useEffect(() => { void getReviewPrefs().then(setPrefs); const timer = setInterval(() => setNow(Date.now()),10000); return () => clearInterval(timer); }, []);
  const age = tick ? Math.max(0, Math.floor((now-Number(tick.value))/1000)) : null;
  async function run(fn: () => Promise<string | void>) { setBusy(true); setMessage(''); try { setMessage(await fn() || 'Saved'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Operation failed'); } finally { setBusy(false); } }
  return <section className="calendar-card reminder-health" aria-label="Reminder health and recovery">
    <h3>Reminder health</h3><p role={age === null || age > 300 ? 'alert' : undefined}>Last heartbeat: {age === null ? 'waiting for first check' : `checked ${age} seconds ago`}{age !== null && age > 300 && ' · Delayed. Reload the extension in Chrome.'}</p>
    <p>{rows.filter(t => t.missedAt && t.missedAt >= now-30*DAY).length} reminders missed in the last 30 days</p>
    <button disabled={busy} onClick={() => void run(async () => { await testReminderNotification(); return 'Test reminder scheduled for 5 seconds from now.'; })}>Send test reminder</button>
    <h3>Weekly Keep or Let go</h3>
    <label className="checkbox-row"><input type="checkbox" checked={prefs.enabled} onChange={e => setPrefs({ ...prefs, enabled: e.target.checked })} />Weekly review</label>
    <label>Day<select value={prefs.day} onChange={e => setPrefs({ ...prefs, day: +e.target.value })}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,i) => <option key={day} value={i}>{day}</option>)}</select></label>
    <label>Time<input type="time" value={prefs.time} onChange={e => setPrefs({ ...prefs, time: e.target.value })} /></label>
    <button disabled={busy} onClick={() => void run(async () => { await db.meta.put({ key: 'reviewPrefs', value: validatePrefs(prefs) }); await requestReminderReconciliation(); })}>Save review preferences</button>
    <p>This month: {counts.opened || 0} opened, {counts.letGo || 0} let go.</p>
    <h3>Data safety</h3><p>A daily local recovery copy keeps your last 100 items.</p>
    <button disabled={busy} onClick={() => void run(exportScheduler)}>Export schedule JSON</button>
    <label>Import schedule JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { if (file.size > 20000000) throw new Error('File exceeds 20 MB'); const n = await importScheduler(JSON.parse(await file.text())); return `Imported ${n} items. Existing items preserved.`; }); e.target.value = ''; }} /></label>
    <button disabled={busy} onClick={() => void run(async () => `Recovered ${await restoreSnapshot()} items.`)}>Restore daily recovery copy</button>
    <details><summary>Recently let go · {rows.filter(t => t.status === 'archived').length}</summary><p>Restore within 30 days.</p>{rows.filter(t => t.status === 'archived').map(t => <div className="archive-row" key={t.id}><span className="task-title">{t.title}</span><button disabled={busy} onClick={() => void run(() => restoreReminder(t.id!))}>Restore</button></div>)}</details>
    {message && <p role="status">{message}</p>}
  </section>;
}
