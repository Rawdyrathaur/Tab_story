import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getSyncSettings, signInWithGoogle, signOut, syncNow, type SyncSettings as Settings } from '../../sync/client';

const buttonStyle={padding:'7px 10px',borderRadius:7,border:'1px solid var(--border-color)',background:'var(--input-bg)',color:'var(--text-color)',cursor:'pointer',fontSize:11} as const;

export function SyncSettings(){
  const [settings,setSettings]=useState<Settings|null>(null);
  const [status,setStatus]=useState('Checking…'); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const pending=useLiveQuery(()=>db.syncOutbox.count(),[],0);
  const refresh=async()=>{try{const value=await getSyncSettings();setSettings(value);setStatus(value.accessToken?'Connected':value.serverUrl?'Ready':'Unavailable');}catch{setStatus('Unavailable');}};
  useEffect(()=>{const initial=window.setTimeout(()=>void refresh(),0);const handler=()=>void refresh();window.addEventListener('online',handler);return()=>{window.clearTimeout(initial);window.removeEventListener('online',handler);};},[]);
  const connect=async()=>{setBusy(true);setMessage('');setStatus('Connecting…');try{await signInWithGoogle();await syncNow();await refresh();setStatus('Connected');setMessage('Account connected and synced.');}catch(error){setStatus(settings?.serverUrl?'Ready':'Unavailable');setMessage(error instanceof Error?error.message:'Could not connect your Google account.');}finally{setBusy(false);}};
  const run=async()=>{setBusy(true);setMessage('');setStatus('Syncing…');try{await syncNow();await refresh();setStatus('Connected');setMessage('Sync completed just now.');}catch(error){setStatus(navigator.onLine?'Connection failed':'Offline');setMessage(error instanceof Error?error.message:'Sync could not be completed.');}finally{setBusy(false);}};
  const disconnect=async()=>{setBusy(true);setMessage('');try{await signOut();await refresh();setMessage('Account disconnected on this device.');}catch(error){setMessage(error instanceof Error?error.message:'Could not disconnect.');}finally{setBusy(false);}};
  const statusColor=status==='Connected'?'#22c55e':status==='Syncing…'?'#7c5cff':'var(--placeholder-color)';
  return <section className="sync-settings" aria-label="Sync settings" style={{display:'grid',gap:9,padding:'10px 0 12px',borderBottom:'1px solid var(--border-color)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <div style={{display:'grid',gap:2}}><strong style={{fontSize:13}}>Sync</strong><small style={{color:'var(--placeholder-color)'}}>{settings?.email || 'Use your Google account on every device'}</small></div>
      <span style={{display:'inline-flex',alignItems:'center',gap:6,color:statusColor,fontSize:11,fontWeight:700}}><span aria-hidden="true" style={{width:7,height:7,borderRadius:'50%',background:'currentColor'}} />{status}</span>
    </div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap',fontSize:11}}>
      <span><strong>{pending ?? 0}</strong> pending</span>
      <span style={{color:'var(--placeholder-color)'}}>Last sync: {settings?.lastSyncAt?new Date(settings.lastSyncAt).toLocaleString():'Never'}</span>
      {settings?.accessToken ? <button type="button" style={buttonStyle} disabled={busy || !navigator.onLine} onClick={()=>void run()}>{busy?'Syncing…':'Sync now'}</button> : <button type="button" style={buttonStyle} disabled={busy || !navigator.onLine || !settings?.serverUrl} onClick={()=>void connect()}>{busy?'Connecting…':'Continue with Google'}</button>}
    </div>
    {settings?.accessToken && <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}><small style={{color:'var(--placeholder-color)'}}>This device is linked to your account.</small><button type="button" style={{...buttonStyle,border:'0',background:'transparent'}} disabled={busy} onClick={()=>void disconnect()}>Sign out</button></div>}
    {message&&<p role="status" style={{margin:0,lineHeight:1.5}}>{message}</p>}
  </section>;
}
