import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SavedTab } from '../db';
import { DAY, getPresets, reviewQueue } from '../../reminders/model';
import { archiveReminder, restoreReminder, keepReminder, openReminder } from '../../reminders/service';

export function UndoNotice({ id, onClose }: { id: number; onClose: () => void }) {
  const [error, setError] = useState('');
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => { const timer = setTimeout(() => close.current(), 6000); return () => clearTimeout(timer); }, [id]);
  return <div role="status" className="undo-notice">Let go · <button onClick={() => void restoreReminder(id).then(onClose).catch(() => setError('Restore failed. Try Recently let go in Settings.'))}>Undo</button>{error}</div>;
}
export function ReviewPanel() {
  const [now] = useState(Date.now);
  const queue = useLiveQuery(async () => reviewQueue(await db.tabs.toArray()));
  const [session, setSession] = useState<SavedTab[] | null>(null);
  const [index, setIndex] = useState(0);
  const [released, setReleased] = useState(0);
  const [keeping, setKeeping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startX = useRef(0);
  const card = session?.[index];
  const run = async (kind: 'open' | 'archive' | 'keep', when?: number) => {
    if (!card || busy) return;
    setBusy(true); setError('');
    try {
      if (kind === 'keep') await keepReminder(card.id!, when!);
      else if (kind === 'open') await openReminder(card.id!);
      else { await archiveReminder(card.id!); setReleased(n => n+1); }
      setIndex(n => n+1); setKeeping(false);
    } catch { setError('Could not save your decision. Please try again.'); }
    finally { setBusy(false); }
  };
  // A frozen session avoids skipping cards when live query results change.
  const keyboard = useRef<(event: KeyboardEvent) => void>(() => {});
  useEffect(() => { keyboard.current = event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement).tagName) || !card || busy) return;
    if (['k','l','r'].includes(event.key.toLowerCase())) event.preventDefault();
    if (event.key.toLowerCase() === 'k') setKeeping(true);
    if (event.key.toLowerCase() === 'l') void run('archive');
    if (event.key.toLowerCase() === 'r') void run('open');
  }; });
  useEffect(() => { const listener = (e: KeyboardEvent) => keyboard.current(e); window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener); }, []);
  if (!session && !queue?.length) return null;
  return <section className="calendar-card review-panel" aria-label="Keep or let go">
    {!session ? <button onClick={() => { setSession(queue || []); setIndex(0); }}>Review {queue?.length} old links →</button> : card ? <div onTouchStart={e => { startX.current = e.touches[0].clientX; }} onTouchEnd={e => { const delta = e.changedTouches[0].clientX - startX.current; if (!busy && Math.abs(delta) > 90) { if (delta > 0) setKeeping(true); else void run('archive'); } }}>
      <small aria-live="polite">{index+1} of {session.length}</small>
      <h3 className="task-title">{card.title}</h3><p>{card.domain}</p>
      <p>Saved {Math.max(0, Math.floor((now-card.createdAt)/DAY))} days ago · snoozed {card.snoozeCount || 0} times</p>
      {(card.reviewCount || 0) >= 2 && <p>You’ve kept this {card.reviewCount} times. Still real?</p>}
      <div className="action-row"><button disabled={busy} onClick={() => void run('open')}>Read now (R)</button><button disabled={busy} onClick={() => setKeeping(!keeping)}>Keep (K)</button><button className={(card.reviewCount || 0) >= 2 ? 'primary-action' : ''} disabled={busy} onClick={() => void run('archive')}>Let go (L)</button></div>
      {keeping && <div className="preset-grid">{getPresets().map(p => <button disabled={busy} key={p.id} onClick={() => void run('keep', p.when)}>{p.label}<small>{new Date(p.when).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</small></button>)}</div>}
    </div> : <><p>All clear. You let go of {released} links this session.</p><button onClick={() => { setSession(null); setReleased(0); }}>Done</button></>}
    {error && <p role="alert">{error}</p>}
  </section>;
}


export function UndoCenter() {
  const [items, setItems] = useState<{ key: number; id: number }[]>([]);
  useEffect(() => {
    let key = 0;
    const listener = (event: Event) => setItems(rows => [...rows, { key: ++key, id: (event as CustomEvent<number>).detail }]);
    window.addEventListener('tab-story:archived', listener);
    return () => window.removeEventListener('tab-story:archived', listener);
  }, []);
  return <div className="undo-center">{items.map(item => <UndoNotice key={item.key} id={item.id} onClose={() => setItems(rows => rows.filter(row => row.key !== item.key))} />)}</div>;
}
