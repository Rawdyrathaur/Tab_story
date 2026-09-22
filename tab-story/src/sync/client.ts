import { io } from 'socket.io-client';
import { db, type SavedTab, type SyncOutboxEntry } from '../sidepanel/db';

export type SyncSettings={serverUrl:string;bootstrapSecret:string;userId?:string;deviceId:string;accessToken?:string;refreshToken?:string;cursor:string;tier?:'free'|'premium';lastSyncAt?:number};
type Session=SyncSettings;
type SyncRecord={id:string;type:string;isDeleted:boolean;editedAt:string;content?:Record<string,unknown>};
type SyncRejection={id:string;code?:string;[key:string]:unknown};
type SyncPage={records:SyncRecord[];cursor:string;hasMore:boolean;fullResync:boolean;purgeHorizon:string};
type SyncResponse={ok:boolean;error?:string;pushed:{authoritative:SyncRecord[];rejected:SyncRejection[]};page:SyncPage};
const settingsKey='tabStorySync';
const makeId=()=>crypto.randomUUID();
const localFields=(ms:number)=>{const d=new Date(ms);return {scheduledDate:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,scheduledTime:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};};
async function settings():Promise<Session>{const stored=(await chrome.storage.local.get(settingsKey))[settingsKey] as Partial<Session>|undefined;const env=(import.meta as ImportMeta&{env?:Record<string,string>}).env||{};const value:Session={serverUrl:stored?.serverUrl||env.VITE_SYNC_SERVER_URL||'http://localhost:8787',bootstrapSecret:stored?.bootstrapSecret||env.VITE_SYNC_BOOTSTRAP_SECRET||'',userId:stored?.userId,deviceId:stored?.deviceId||makeId(),accessToken:stored?.accessToken,refreshToken:stored?.refreshToken,cursor:stored?.cursor||'0',tier:stored?.tier};await chrome.storage.local.set({[settingsKey]:value});return value;}
async function saveSettings(value:Session){await chrome.storage.local.set({[settingsKey]:value});}
export async function getSyncSettings(){return settings();}
export async function updateSyncSettings(changes:Partial<SyncSettings>){const value=await settings();Object.assign(value,changes);await saveSettings(value);return value;}
const content=(tab:SavedTab)=>{const {notes,scheduledAt,fireAt,...value}=tab;const canonicalFireAt=fireAt??scheduledAt;const fields=canonicalFireAt?localFields(canonicalFireAt):{};return {...value,note:notes,fireAt:canonicalFireAt,...fields} as unknown as Record<string,unknown>};
export async function writeTab(tab:SavedTab):Promise<number>{const cfg=await settings();const now=Date.now();tab.uuid??=makeId();tab.updatedAt=now;const entry:SyncOutboxEntry={id:tab.uuid,type:'resource',content:content(tab),collectionId:null,isDeleted:!!tab.deletedAt,editedAt:new Date(now).toISOString(),editedBy:cfg.deviceId};return db.transaction('rw',db.tabs,db.syncOutbox,async()=>{const id=Number(await db.tabs.put(tab));await db.syncOutbox.put(entry);return id;});}
export async function updateTab(id:number,changes:Partial<SavedTab>){const current=await db.tabs.get(id);if(!current)return 0;return writeTab({...current,...changes,id});}
async function ensureSession(cfg:Session){if(cfg.accessToken&&cfg.refreshToken&&cfg.tier)return cfg;if(!cfg.bootstrapSecret)throw new Error('Sync bootstrap secret is not configured');const response=await fetch(`${cfg.serverUrl}/auth/device`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:cfg.deviceId,userId:cfg.userId,bootstrapSecret:cfg.bootstrapSecret})});if(!response.ok)throw new Error('Could not authenticate sync device');Object.assign(cfg,await response.json());await saveSettings(cfg);return cfg;}
async function emitSync(socket:ReturnType<typeof io>,payload:unknown){return await new Promise<unknown>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Sync request timed out')),30_000);socket.emit('sync',payload,(result:unknown)=>{clearTimeout(timer);resolve(result);});});}
async function applyRecord(record:SyncRecord){if(record.type!=='resource')return;const local=await db.tabs.where('uuid').equals(record.id).first();if(record.isDeleted){if(local?.id)await db.tabs.update(local.id,{deletedAt:new Date(record.editedAt).getTime(),updatedAt:new Date(record.editedAt).getTime()});return;}const source=record.content??{};const canonicalFireAt=source.fireAt??source.scheduledAt;const fields=typeof canonicalFireAt==='number'?localFields(canonicalFireAt):{};const value={...source,uuid:record.id,notes:typeof source.notes==='string'?source.notes:typeof source.note==='string'?source.note:'',fireAt:canonicalFireAt,scheduledAt:canonicalFireAt,...fields,type:typeof source.type==='string'?source.type:'tab',updatedAt:new Date(record.editedAt).getTime()} as SavedTab;delete (value as unknown as Record<string,unknown>).note;if(local?.id)await db.tabs.put({...value,id:local.id});else await db.tabs.add(value);}
export async function syncNow(){
 const cfg=await ensureSession(await settings()); const changes=await db.syncOutbox.toArray(); const socket=io(cfg.serverUrl,{transports:['websocket'],auth:{accessToken:cfg.accessToken,refreshToken:cfg.refreshToken}});
 socket.on('auth:access-token',({accessToken})=>{cfg.accessToken=accessToken;void saveSettings(cfg)});
 let cursor=cfg.cursor; let skipHorizon=false; let first=true; let hasMore=true; let lastResult:SyncResponse|undefined;
 try{
  await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject)});
  while(hasMore){
   const result=await emitSync(socket,{changes:first?changes:[],cursor,skipHorizon}) as SyncResponse; if(!result.ok)throw new Error(result.error||'Sync failed'); lastResult=result;
   if(first){for(const row of result.pushed.authoritative){await applyRecord(row);await db.syncOutbox.delete(row.id);}for(const rejection of result.pushed.rejected){await db.syncOutbox.delete(rejection.id);if(rejection.code==='LIMIT_REACHED')window.dispatchEvent(new CustomEvent('tab-story:limit-reached',{detail:rejection}));}}
   const page=result.page; if(!page)throw new Error('Sync response missing page'); if(page.fullResync&&!skipHorizon){await db.tabs.clear();cursor='0';skipHorizon=true;}
   for(const row of page.records)await applyRecord(row); cursor=page.cursor; cfg.cursor=cursor; first=false;
   hasMore=page.hasMore;
  }
  cfg.lastSyncAt=Date.now(); await saveSettings(cfg); return lastResult;
 }finally{socket.close();}
}
