import { useEffect, useRef, useState } from 'react';
import { AISettingsCard } from './AISettingsCard';
import { BellIcon } from '@heroicons/react/24/outline';
import { areReminderNotificationsEnabled, requestReminderPermission, setReminderNotificationsEnabled } from '../../reminders/service';
import { ReminderHealth } from './ReminderHealth';

export function SettingsPanel({ highlightReminders = 0 }: { highlightReminders?: number }) {
  const reminderCard = useRef<HTMLElement>(null);
  useEffect(() => {
    void chrome.storage.local.set({ reminderSetupVisited: true });
  }, []);
  useEffect(() => {
    if (!highlightReminders) return;
    const timer = window.setTimeout(() => {
      reminderCard.current?.scrollIntoView({ block: 'nearest' });
      reminderCard.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [highlightReminders]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [websiteAlerts, setWebsiteAlerts] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState('Checking…');
  const [platform, setPlatform] = useState('');
  const [permissionBusy, setPermissionBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void areReminderNotificationsEnabled().then(value => { if (active) setNotificationEnabled(value); }).catch(() => {});
      void chrome.permissions.contains({ permissions: ['notifications'] })
        .then(async enabled => enabled ? chrome.notifications.getPermissionLevel() : null)
        .then(value => { if (active) setDesktopPermission(value === null ? 'Enabled when you schedule' : value === 'granted' ? 'Chrome allowed' : 'Blocked in Chrome'); })
        .catch(() => { if (active) setDesktopPermission('Unavailable'); });
      void chrome.permissions.contains({ origins: ['https://*/*', 'http://*/*'] })
        .then(value => { if (active) setWebsiteAlerts(value); }).catch(() => {});
    };
    refresh();
    window.addEventListener('focus', refresh);
    chrome.permissions.onAdded.addListener(refresh);
    chrome.permissions.onRemoved.addListener(refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      chrome.permissions.onAdded.removeListener(refresh);
      chrome.permissions.onRemoved.removeListener(refresh);
    };
  }, []);
  useEffect(() => { void chrome.runtime.getPlatformInfo().then(info => setPlatform(info.os)).catch(() => {}); }, []);
  const button = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)', cursor: 'pointer' };
  return <div className="account-settings" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', minWidth: 0, width: '100%', gap: 12, color: 'var(--text-color)', fontSize: 12 }}>
    <details style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>AI assistant</summary>
      <div style={{ marginTop: 12 }}><AISettingsCard compact /></div>
    </details>
    <section ref={reminderCard} tabIndex={-1} aria-label="Reminders" className={`reminder-settings-card${highlightReminders ? ' reminder-spotlight' : ''}`} style={{ display: 'grid', gap: 12, padding: 14, border: '1px solid var(--border-color)', borderRadius: 12 }}>
      <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BellIcon aria-hidden="true" style={{ width: 20, height: 20 }} />Reminders</strong>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'grid', gap: 3 }}><strong>Tab Story notifications</strong><small>Only reminders created by Tab Story.</small></div>
        <button type="button" role="switch" aria-checked={notificationEnabled} aria-label="Toggle Tab Story notifications" disabled={permissionBusy} onClick={() => {
          if (notificationEnabled) {
            setPermissionBusy(true);
            void setReminderNotificationsEnabled(false).then(() => { setNotificationEnabled(false); setNotificationMessage(''); }).catch(() => setNotificationMessage('Could not update reminders.')).finally(() => setPermissionBusy(false));
            return;
          }
          setPermissionBusy(true);
          void requestReminderPermission().then(() => { setNotificationEnabled(true); setNotificationMessage(''); }).catch(() => setNotificationMessage('Chrome notification access was not enabled.')).finally(() => setPermissionBusy(false));
        }} style={{ width: 44, height: 24, padding: 2, border: 0, borderRadius: 999, background: notificationEnabled ? '#22c55e' : 'var(--input-border)', cursor: permissionBusy ? 'wait' : 'pointer', opacity: permissionBusy ? 0.7 : 1 }}><span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: notificationEnabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 160ms ease' }} /></button>
      </div>
      {notificationMessage && <p role="status" style={{ margin: 0, lineHeight: 1.5 }}>{notificationMessage}</p>}
      {desktopPermission === 'Blocked in Chrome' && <button style={button} onClick={() => {
        void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
          .catch(() => setNotificationMessage('Couldn’t open Chrome settings. Try again.'));
      }}>Open Chrome extension settings ↗</button>}
      <button style={button} disabled={permissionBusy || websiteAlerts} onClick={() => {
        setPermissionBusy(true);
        void chrome.permissions.request({ origins: ['https://*/*', 'http://*/*'] })
          .then(granted => { setWebsiteAlerts(granted); setNotificationMessage(granted ? '' : 'Try again to enable website banners.'); })
          .catch(() => setNotificationMessage('Try again to enable website banners.'))
          .finally(() => setPermissionBusy(false));
      }}>{websiteAlerts ? '✓ Website banners enabled' : permissionBusy ? 'Enabling…' : 'Enable website banners'}</button>
      {platform === 'mac' && <a href="x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.google.Chrome.framework.AlertNotificationService" style={button}>Open Chrome Helper alerts</a>}
      {platform === 'win' && <a href="ms-settings:notifications" style={button}>Open system notifications</a>}
    </section>
    <ReminderHealth />
  </div>;
}
