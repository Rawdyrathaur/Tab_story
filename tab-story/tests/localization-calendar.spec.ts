import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';

async function launch(profile = '') {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext(profile, {
    headless: false, viewport: { width: 380, height: 800 }, reducedMotion: 'reduce',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const url = `chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`;
  const page = await context.newPage(); await page.goto(url);
  await expect(page.getByRole('button', { name: 'Collections', exact: true })).toBeVisible();
  return { context, page, url };
}
async function seed(page: Page) {
  return page.evaluate(async () => {
    const folderId = Number(await window.db.folders.add({ name: 'Study resources', domain: 'example.com', createdAt: Date.now() }));
    return Number(await window.db.tabs.add({ title: 'Learning reference for localization and reminder integration', url: 'https://example.com/study', domain: 'example.com', favicon: '', folderId, tags: ['study'], notes: 'Study notes', pinned: false, createdAt: Date.now() }));
  });
}
async function message(page: Page, operation: string, tabId?: number, scheduledAt?: number) {
  return page.evaluate(async data => chrome.runtime.sendMessage({ type: 'tab-story:reminder', ...data }), { operation, tabId, scheduledAt });
}

test('stored language persists, every panel localizes and Arabic fits a narrow viewport', async ({ browserName }, info) => {
  expect(browserName).toBe('chromium');
  const { context, page } = await launch();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await seed(page);
    await page.evaluate(() => chrome.storage.local.set({ 'tabStory.locale': 'de-DE' }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Kalender', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Kalender', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Vorheriger Monat' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('german-calendar.png'), animations: 'disabled' });
    await page.evaluate(() => chrome.storage.local.set({ 'tabStory.locale': 'ar' }));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'التقويم', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', { name: 'الشهر السابق' })).toBeVisible();
    for (const name of ['الوسوم', 'السجل', 'الإعدادات', 'حول', 'التقويم']) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath('arabic-calendar.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('calendar and TabMenu schedule, reschedule, complete and clear real alarms', async () => {
  const { context, page } = await launch();
  try {
    const id = await seed(page);
    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await page.locator('#calendar-tab').selectOption(String(id));
    await page.getByLabel('Date', { exact: true }).fill('2030-10-10');
    await page.getByLabel('Time', { exact: true }).fill('14:30');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.schedule-editor').getByRole('status')).toContainText('Saved');
    await page.locator('.schedule-editor').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('.schedule-editor')).toHaveCount(0);
    const first = await page.evaluate(async id => ({ tab: await window.db.tabs.get(id), alarm: await chrome.alarms.get('tab_story_reminder_' + id) }), id);
    expect(first.tab?.scheduledAt).toBe(first.alarm?.scheduledTime);
    expect(first.tab?.scheduledAt).toBeGreaterThan(Date.now());
    await page.getByRole('button', { name: 'Tab Manager', exact: true }).click();
    await page.getByTitle('More options', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await page.getByLabel('Time', { exact: true }).fill('15:30');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.schedule-editor').getByRole('status')).toContainText('Saved');
    await page.locator('.schedule-editor').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const second = await page.evaluate(async id => chrome.alarms.get('tab_story_reminder_' + id), id);
    expect(second?.scheduledTime).toBe(first.alarm!.scheduledTime + 3600000);
    expect(await message(page, 'complete', id)).toEqual({ ok: true });
    expect(await page.evaluate(async id => chrome.alarms.get('tab_story_reminder_' + id), id)).toBeUndefined();
    expect(await page.evaluate(async id => (await window.db.tabs.get(id))?.completedAt, id)).toBeTruthy();
    expect(await message(page, 'cancel', id)).toEqual({ ok: true });
    expect(await page.evaluate(async id => (await window.db.tabs.get(id))?.completedAt, id)).toBeUndefined();
  } finally { await context.close(); }
});

test('browser restart retains language and schedules and rebuilds a missing alarm', async ({ browserName }, info) => {
  expect(browserName).toBe('chromium');
  const profile = info.outputPath('browser-profile');
  let context: BrowserContext | undefined;
  try {
    const initial = await launch(profile); context = initial.context;
    const id = await seed(initial.page); const at = Date.now() + 3600000;
    expect(await message(initial.page, 'schedule', id, at)).toEqual({ ok: true });
    await initial.page.evaluate(async id => {
      await chrome.storage.local.set({ 'tabStory.locale': 'hi-IN' });
      await chrome.alarms.clear('tab_story_reminder_' + id);
    }, id);
    await context.close(); context = undefined;
    const extension = path.resolve('./dist');
    context = await chromium.launchPersistentContext(profile, { headless: false, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    const page = await context.newPage(); await page.goto(initial.url);
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
    await expect(page.getByRole('button', { name: 'कैलेंडर', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(async id => (await chrome.alarms.get('tab_story_reminder_' + id))?.scheduledTime, id)).toBe(at);
    await page.evaluate(async id => { await chrome.alarms.clear('tab_story_reminder_' + id); }, id);
    const cdp = await context.newCDPSession(page); await cdp.send('ServiceWorker.enable'); await cdp.send('ServiceWorker.stopAllWorkers');
    expect(await message(page, 'reconcile')).toEqual({ ok: true });
    expect(await page.evaluate(async id => (await chrome.alarms.get('tab_story_reminder_' + id))?.scheduledTime, id)).toBe(at);
  } finally { await context?.close(); }
});

test('real Chrome alarm fires with localized notification and does not auto-open a tab', async () => {
  const { context, page } = await launch();
  try {
    const id = await seed(page);
    await page.evaluate(() => chrome.storage.local.set({ 'tabStory.locale': 'es-ES' }));
    const at = Date.now() + 2500;
    const count = context.pages().length;
    expect(await message(page, 'schedule', id, at)).toEqual({ ok: true });
    await expect.poll(() => page.evaluate(async id => (await window.db.tabs.get(id))?.notifiedScheduledAt, id), { timeout: 20000 }).toBe(at);
    const notifications = await page.evaluate(() => chrome.notifications.getAll());
    expect(Object.keys(notifications)).toContain(`tab_story_reminder_${id}_${at}`);
    expect(context.pages().length).toBe(count);
    expect(await message(page, 'cancel', id)).toEqual({ ok: true });
    expect(Object.keys(await page.evaluate(() => chrome.notifications.getAll()))).not.toContain(`tab_story_reminder_${id}_${at}`);
  } finally { await context.close(); }
});
