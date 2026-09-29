import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { db } from '../db';
import {
  AccountSwitchRequiredError, getSyncSettings, getSyncStatus, retryFailedChanges,
  signInWithGoogle, signOut, subscribeSyncStatus, syncNow, type SyncSettings as Settings, type SyncStatus,
  subscribeSyncSettings,
} from '../../sync/client';
import { belongsToAccount, formatLastSync, latestSyncStatus, syncPresentation, syncProblem, type SyncOperation } from '../../sync/presentation';

export function SyncSettings() {
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [switchAccount, setSwitchAccount] = useState('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);
  const [operation, setOperation] = useState<SyncOperation>(null);
  const [notice, setNotice] = useState('');
  const [, tick] = useState(0);
  const working = useRef(false);
  const accountId = settings?.userId || settings?.linkedAccountId;
  const counts = useLiveQuery(async () => {
    const changes = await db.syncOutbox.filter(entry => belongsToAccount(entry, accountId)).toArray();
    return { pending: changes.filter(entry => !entry.failed).length, failed: changes.filter(entry => !!entry.failed).length };
  }, [accountId], { pending: 0, failed: 0 });
  const sharedStatus = useLiveQuery(async () => (await db.meta.get('tabStorySync.status'))?.value as SyncStatus | undefined);
  const checkpoint = useLiveQuery(() => db.meta.get('tabStorySync.cursor'));
  const engineStatus = latestSyncStatus(status, sharedStatus, settings);
  const view = syncPresentation(settings, engineStatus, counts.pending, counts.failed, online, operation, loading);
  const busy = operation !== null;

  const refresh = useCallback(async () => {
    try { setSettings(await getSyncSettings()); }
    catch { setNotice('Device storage is unavailable. Your account state could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh, checkpoint]);

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(next => { setStatus(next); void refresh(); });
    const unsubscribeSettings = subscribeSyncSettings(() => void refresh());
    const onConnectivity = () => { setOnline(navigator.onLine); void refresh(); };
    const interval = window.setInterval(() => { tick(value => value + 1); void refresh(); }, 15000);
    window.addEventListener('online', onConnectivity);
    window.addEventListener('offline', onConnectivity);
    window.addEventListener('focus', onConnectivity);
    return () => {
      unsubscribe(); unsubscribeSettings();
      window.clearInterval(interval);
      window.removeEventListener('online', onConnectivity);
      window.removeEventListener('offline', onConnectivity);
      window.removeEventListener('focus', onConnectivity);
    };
  }, [refresh]);

  const retry = async () => {
    if (working.current || !online) return;
    working.current = true; setOperation('sync'); setNotice('');
    try { await retryFailedChanges(); await refresh(); }
    catch (error) { setNotice(syncProblem(error)); }
    finally { working.current = false; setOperation(null); }
  };

  const disconnect = async () => {
    if (working.current) return;
    working.current = true; setOperation('signout'); setNotice('');
    try {
      if (navigator.onLine) await Promise.race([syncNow().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 5000))]);
      const signedOut = await signOut();
      await refresh();
      const remaining = await db.syncOutbox.filter(entry => belongsToAccount(entry, signedOut.linkedAccountId)).count();
      setNotice(remaining ? `Signed out. ${remaining} change${remaining === 1 ? '' : 's'} remain here for your next sign-in.`
        : 'Signed out. Your saved data is still on this device.');
    } catch (error) { setNotice(syncProblem(error)); }
    finally { working.current = false; setOperation(null); }
  };

  const connect = async (mode?: 'upload') => {
    if (working.current || !online) return;
    working.current = true; setOperation('connect'); setNotice('');
    try {
      await signInWithGoogle(mode);
      setConfirmUpload(false); setSwitchAccount('');
      await refresh();
      try { await syncNow(); } catch { /* The engine reports failures and keeps local changes queued. */ }
      await refresh();
    } catch (error) {
      if (error instanceof AccountSwitchRequiredError) { setConfirmUpload(true); setSwitchAccount(error.email || ''); }
      else setNotice(syncProblem(error));
    } finally { working.current = false; setOperation(null); }
  };

  return <section className="sync-spiral-card" aria-label="Sync settings" aria-busy={busy || view.tone === 'syncing'}>
    <div className="sync-spiral-header">
      <span className={`sync-spiral-badge ${view.tone}`} aria-hidden="true">
        <ArrowPathIcon className="sync-spiral-icon" />
      </span>
      <div className="sync-spiral-meta">
        <strong className="sync-spiral-title">Cloud sync</strong>
        <span className="sync-spiral-email" title={settings?.email}>{settings?.email || 'Saved on this device'}</span>
      </div>
      <span className={`sync-status-pill ${view.tone}`} role="status">{view.label}</span>
    </div>
    <div className="sync-info-grid">
      <span className="sync-info-item">{settings?.userId ? `${counts.pending} waiting` : 'Local storage'}</span>
      {counts.failed > 0 && settings?.userId && <span className="sync-info-item sync-failed">{counts.failed} need attention</span>}
      <span className="sync-info-item sync-last" title={settings?.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString() : undefined}>
        Last sync: {formatLastSync(settings?.lastSyncAt)}
      </span>
    </div>
    <p className="sync-note" role="status">{notice || view.detail}</p>
    <div className="sync-actions-row">
      {view.connected && <button type="button" className="sync-btn-primary"
        disabled={busy || !online || view.tone === 'syncing'} onClick={() => void retry()}>
        {operation === 'sync' ? 'Syncing…' : counts.failed || engineStatus.phase === 'error' ? 'Retry sync' : 'Sync now'}
      </button>}
      {!view.connected && settings?.serverUrl && !confirmUpload && <button type="button" className="sync-btn-primary"
        disabled={loading || busy || !online} onClick={() => void connect()}>
        {operation === 'connect' ? 'Connecting…' : 'Continue with Google'}
      </button>}
      {settings?.refreshToken && <button type="button" className="sync-btn-secondary" disabled={busy} onClick={() => void disconnect()}>
        {operation === 'signout' ? 'Signing out…' : 'Sign out'}
      </button>}
    </div>
    {confirmUpload && <div className="sync-account-prompt" role="alert">
      <p>Upload this device’s tabs, notes and collections to {switchAccount || 'the other Google account'}?</p>
      <div className="sync-actions-row">
        <button type="button" className="sync-btn-secondary" autoFocus disabled={busy}
          onClick={() => { setConfirmUpload(false); setSwitchAccount(''); setNotice(''); }}>Cancel</button>
        <button type="button" className="sync-btn-secondary" disabled={busy}
          onClick={() => { setConfirmUpload(false); setSwitchAccount(''); void disconnect(); }}>Keep separate</button>
        <button type="button" className="sync-btn-primary" disabled={busy || !online}
          onClick={() => void connect('upload')}>Upload to this account</button>
      </div>
    </div>}
  </section>;
}
