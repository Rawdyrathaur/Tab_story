import { db } from '../sidepanel/db';

const owner = crypto.randomUUID();
const key = 'tabStorySync.lease';
type Lease = { owner: string; expiresAt: number };

export async function withSyncLock<T>(work: () => Promise<T>): Promise<T | undefined> {
  if (navigator.locks?.request) {
    return navigator.locks.request('tab-story-sync', { ifAvailable: true }, lock => lock ? work() : undefined);
  }
  const acquired = await db.transaction('rw', db.meta, async () => {
    const lease = (await db.meta.get(key))?.value as Lease | undefined;
    if (lease && lease.owner !== owner && lease.expiresAt > Date.now()) return false;
    await db.meta.put({ key, value: { owner, expiresAt: Date.now() + 45_000 } });
    return true;
  });
  if (!acquired) return undefined;
  const renew = setInterval(() => {
    void db.transaction('rw', db.meta, async () => {
      const lease = (await db.meta.get(key))?.value as Lease | undefined;
      if (lease?.owner === owner) await db.meta.put({ key, value: { owner, expiresAt: Date.now() + 45_000 } });
    }).catch(() => {});
  }, 15_000);
  try { return await work(); }
  finally {
    clearInterval(renew);
    await db.transaction('rw', db.meta, async () => {
      const lease = (await db.meta.get(key))?.value as Lease | undefined;
      if (lease?.owner === owner) await db.meta.delete(key);
    }).catch(() => {});
  }
}
