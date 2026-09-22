import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

async function setup() {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, viewport: { width: 320, height: 850 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const page = await context.newPage();
  await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html#calendar`);
  await expect(page.getByRole('button', { name: 'Schedule current tab +' })).toBeVisible();
  return { context, page, worker };
}

test('weekly review supports Keep, Let go, queued Undo and restoring the original alarm', async () => {
  const { context, page } = await setup();
  try {
    const ids = await page.evaluate(async () => {
      const ids: number[] = [];
      for (let n = 0; n < 3; n++) ids.push(Number(await window.db.tabs.add({ url: `https://example.com/review/${n}`, title: `Review link ${n}`, domain: 'example.com', favicon: '', tags: [], notes: '', pinned: false, createdAt: Date.now()-10*86400000, scheduledAt: Date.now()-8*86400000, status: 'missed', notifiedScheduledAt: Date.now()-8*86400000 })));
      return ids;
    });
    await page.getByRole('button', { name: 'Review 3 old links' }).click();
    const review = page.getByRole('region', { name: 'Keep or let go', exact: true });
    await review.getByRole('button', { name: 'Keep (K)' }).click();
    await review.getByRole('button', { name: /Tomorrow morning/ }).click();
    await expect(review.getByText('2 of 3')).toBeVisible();
    await review.getByRole('button', { name: 'Let go (L)' }).click();
    await review.getByRole('button', { name: 'Let go (L)' }).click();
    await expect(page.locator('.undo-center button')).toHaveCount(2);
    await page.locator('.undo-center button').first().click();
    const rows = await page.evaluate(() => window.db.tabs.toArray());
    expect(rows.find(t => t.id === ids[0])?.reviewCount).toBe(1);
    expect(rows.find(t => t.id === ids[0])?.status).toBe('pending');
    expect(rows.filter(t => t.status === 'archived')).toHaveLength(1);
    expect(rows.filter(t => t.status === 'missed')).toHaveLength(1);
    await expect.poll(() => page.evaluate(id => chrome.alarms.get(`tab_story_reminder_${id}`), ids[0])).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('review-320.png') });
  } finally { await context.close(); }
});

test('competing reconciliation requests claim one batch, preserve missed inbox, and never duplicate recurrence', async () => {
  const { context, page, worker } = await setup();
  try {
    await worker.evaluate(() => {
      (globalThis as unknown as { deliveries: string[] }).deliveries = [];
      chrome.notifications.create = (async (id: string) => { (globalThis as unknown as { deliveries: string[] }).deliveries.push(id); return id; }) as typeof chrome.notifications.create;
      chrome.notifications.getPermissionLevel = async () => 'granted';
    });
    await page.evaluate(async () => {
      for (let n = 0; n < 10; n++) await window.db.tabs.add({ url: `https://example.com/batch/${n}`, title: `Batch ${n}`, domain: 'example.com', favicon: '', tags: [], notes: '', pinned: false, createdAt: Date.now(), scheduledAt: Date.now()-30*60000, recurrence: n === 0 ? { freq: 'daily', interval: 1, until: null } : null });
      await Promise.all(Array.from({ length: 3 }, () => chrome.runtime.sendMessage({ type: 'tab-story:reminder', operation: 'reconcile' })));
    });
    const rows = await page.evaluate(() => window.db.tabs.toArray());
    expect(rows.filter(t => t.status === 'missed')).toHaveLength(10);
    expect(rows.filter(t => t.status === 'pending')).toHaveLength(1);
    expect(await worker.evaluate(() => (globalThis as unknown as { deliveries: string[] }).deliveries)).toEqual(['tab_story_missed']);
    expect(await page.evaluate(() => chrome.action.getBadgeText({}))).toBe('10');
  } finally { await context.close(); }
});

test('schedule import validates atomically and merges by normalized URL plus fireAt', async () => {
  const { context, page } = await setup();
  try {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const at = Date.now()+3600000;
    const row = { url: 'https://example.com/Case?utm_source=x', title: 'Imported', domain: 'example.com', tags: [], notes: '', pinned: false, favicon: '', createdAt: Date.now(), fireAt: at, status: 'pending' };
    const upload = async (tasks: unknown[]) => page.getByLabel('Import schedule JSON').setInputFiles({ name: 'schedule.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 11, tasks })) });
    await upload([row, { ...row, url: 'javascript:alert(1)' }]);
    await expect(page.getByRole('status')).toContainText('Invalid saved link');
    expect(await page.evaluate(() => window.db.tabs.count())).toBe(0);
    await upload([row, { ...row, url: 'https://example.com/Case#fragment' }]);
    await expect(page.getByRole('status')).toContainText('Imported 1 items');
    expect(await page.evaluate(() => window.db.tabs.count())).toBe(1);
    await upload([row, { ...row, fireAt: at+3600000 }]);
    await expect(page.getByRole('status')).toContainText('Imported 1 items');
    await expect.poll(() => page.evaluate(() => window.db.tabs.count())).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('settings-320.png') });
  } finally { await context.close(); }
});
