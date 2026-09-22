import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSyncSettings, syncNow, updateSyncSettings, type SyncSettings as Settings } from '../../sync/client';

const buttonStyle={padding:'9px 12px',borderRadius:8,border:'1px solid var(--border-color)',background:'var(--input-bg)',color:'var(--text-color)',cursor:'pointer'} as const;
const inputStyle={width:'100%',boxSizing:'border-box' as const,padding:'9px 10px',borderRadius:8,border:'1px solid var(--input-border)',background:'var(--input-bg)',color:'var(--text-color)'};

export function SyncSettings(){
  const [settings,setSettings]=useState<Settings|null>(null);
  const [serverUrl,setServerUrl]=useState(''); const [userId,setUserId]=useState(''); const [secret,setSecret]=useState('');
  const [status,setStatus]=useState('Checking…'); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const pending=useLiveQuery(()=>db.syncOutbox.count(),[],0);
  const refresh=()=>void getSyncSettings().then(value=>{setSettings(value);setServerUrl(value.serverUrl);setUserId(value.userId||'');setSecret(value.bootstrapSecret);setStatus(value.accessToken?'Connected':'Not connected');}).catch(()=>setStatus('Unavailable'));
  useEffect(()=>{refresh();const handler=()=>refresh();window.addEventListener('online',handler);return()=>window.removeEventListener('online',handler);},[]);
  const save=async()=>{setMessage('');const value=await updateSyncSettings({serverUrl:serverUrl.trim().replace(/\/$/,''),userId:userId.trim()||undefined,bootstrapSecret:secret.trim(),accessToken:undefined,refreshToken:undefined,tier:undefined});setSettings(value);setStatus('Not connected');setMessage('Sync settings saved.');};
  const run=async()=>{setBusy(true);setMessage('');setStatus('Syncing…');try{await syncNow();setStatus('Connected');setMessage('Sync completed just now.');refresh();}catch(error){setStatus(navigator.onLine?'Connection failed':'Offline');setMessage(error instanceof Error?error.message:'Sync could not be completed.');}finally{setBusy(false);}};
  return <section className="calendar-card sync-settings" aria-label="Sync settings" style={{display:'grid',gap:12,padding:14,border:'1px solid var(--border-color)',borderRadius:12}}>
    <h3 style={{margin:0}}>Sync</h3>
    <p style={{margin:0}}>Keep saved tabs, notes, tags, and schedules consistent between the extension and PWA.</p>
    <div style={{display:'flex',justifyContent:'space-between',gap:12}}><span>Status</span><strong>{status}</strong></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12}}><span>Waiting to upload</span><span>{pending ?? 0} changes</span></div>
    <div style={{display:'flex',justifyContent:'space-between',gap:12}}><span>Last sync</span><span>{settings?.lastSyncAt?new Date(settings.lastSyncAt).toLocaleString():'Never'}</span></div>
    <details>
      <summary style={{cursor:'pointer',fontWeight:700}}>Connection settings</summary>
      <div style={{display:'grid',gap:9,marginTop:12}}>
        <label>Sync server<input style={inputStyle} value={serverUrl} onChange={event=>setServerUrl(event.target.value)} placeholder="https://sync.example.com" /></label>
        <label>Account ID (optional)<input style={inputStyle} value={userId} onChange={event=>setUserId(event.target.value)} placeholder="Shared account UUID" /></label>
        <label>Setup secret<input style={inputStyle} type="password" value={secret} onChange={event=>setSecret(event.target.value)} placeholder="Server setup secret" /></label>
        <button style={buttonStyle} onClick={()=>void save()}>Save connection settings</button>
      </div>
    </details>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button style={buttonStyle} disabled={busy || !navigator.onLine} onClick={()=>void run()}>{busy?'Syncing…':'Sync now'}</button><small style={{alignSelf:'center',color:'var(--placeholder-color)'}}>Device: {settings?.deviceId?.slice(0,8)||'…'}</small></div>
    {message&&<p role="status" style={{margin:0,lineHeight:1.5}}>{message}</p>}
  </section>;
}
