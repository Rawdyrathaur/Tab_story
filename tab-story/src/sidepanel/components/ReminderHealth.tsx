import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { DAY } from '../../reminders/model';

export function NotificationWarning() {
  const [blocked, setBlocked] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  useEffect(() => {
    const refresh = () => void chrome.permissions.contains({ permissions: ['notifications'] }).then(async enabled => {
      setBlocked(enabled && await chrome.notifications.getPermissionLevel() !== 'granted');
    }).catch(() => setBlocked(false));
    const version = () => setUpgraded(true);
    refresh(); window.addEventListener('focus', refresh); window.addEventListener('tab-story:database-updated',version);
    const permissionChanged = chrome.notifications?.onPermissionLevelChanged;
    permissionChanged?.addListener(refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('tab-story:database-updated',version); permissionChanged?.removeListener(refresh); };
  }, []);
  return <>{upgraded && <p role="alert">Tab Story was updated in another window. <button onClick={() => location.reload()}>Reload to continue</button></p>}{blocked && <div role="alert" className="notification-warning">Notifications are blocked. Enable Tab Story in Chrome’s extension settings, then allow Chrome notifications in macOS System Settings or Windows Settings → System → Notifications. Check Do Not Disturb too. <button onClick={() => window.dispatchEvent(new Event('tab-story:reminder-setup'))}>Fix alerts</button></div>}</>;
}
export function ReminderHealth() {
  const [now, setNow] = useState(Date.now);
  const tick = useLiveQuery(() => db.meta.get('lastTickAt'));
  const rows = useLiveQuery(() => db.tabs.toArray()) || [];
  const age = tick ? Math.max(0, Math.floor((now - Number(tick.value)) / 1000)) : null;
  const missed30 = rows.filter(tab => tab.missedAt && tab.missedAt >= now - 30 * DAY).length;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const chart = Array.from({ length: 7 }, (_, index) => {
    const start = startOfToday.getTime() - (6 - index) * DAY;
    const end = start + DAY;
    return {
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(start),
      value: rows.filter(tab => tab.missedAt && tab.missedAt >= start && tab.missedAt < end).length,
    };
  });
  const max = Math.max(...chart.map(point => point.value), 1);
  const healthy = age !== null && age <= 300;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return <section aria-label="Reminder health" style={{ display: 'grid', gap: 10, padding: '10px 0 12px', borderBottom: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'grid', gap: 2 }}>
        <strong style={{ fontSize: 13 }}>Reminder health</strong>
        <small style={{ color: 'var(--placeholder-color)' }}>Missed reminders · last 7 days</small>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: healthy ? '#22c55e' : '#f59e0b', fontSize: 11, fontWeight: 700 }}>
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
        {age === null ? 'Waiting' : healthy ? 'Healthy' : 'Delayed'}
      </span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'grid', gap: 2, minWidth: 66 }}>
        <strong style={{ fontSize: 25, lineHeight: 1 }}>{missed30}</strong>
        <small style={{ color: 'var(--placeholder-color)', lineHeight: 1.25 }}>missed<br />in 30 days</small>
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox="0 0 280 64" role="img" aria-label="Missed reminders for the last seven days" style={{ display: 'block', width: '100%', height: 64, color: '#7c5cff' }}>
          <line x1="0" y1="63" x2="280" y2="63" stroke="currentColor" strokeOpacity=".18" />
          {chart.map((point, index) => {
            const height = point.value ? Math.max(8, (point.value / max) * 48) : 4;
            return <rect key={`${point.label}-${index}`} x={index * 40 + 8} y={63 - height} width="22" height={height} rx="6" fill="currentColor" opacity={point.value ? 0.9 : 0.18} />;
          })}
        </svg>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', color: 'var(--placeholder-color)', fontSize: 9, textAlign: 'center' }}>
          {chart.map((point, index) => <span key={`${point.label}-label-${index}`}>{point.label}</span>)}
        </div>
      </div>
    </div>
    <small role={age === null || age > 300 ? 'alert' : undefined} style={{ color: age === null || age > 300 ? '#f59e0b' : 'var(--placeholder-color)' }}>
      {age === null ? 'Waiting for the reminder service to check in.' : age > 300 ? 'The reminder service is delayed. Reload the extension.' : `Heartbeat checked ${age} seconds ago.`}
    </small>
  </section>;
}
