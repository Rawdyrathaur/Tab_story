import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('save active tab opens scheduling, deduplicates and labels its collection in Calendar', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, viewport: { width: 380, height: 800 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  context.setDefaultTimeout(6000);
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Collections', exact: true }).click();
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByLabel('Collection name').fill('DaVinci Resolve');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByLabel('Find tabs')).toHaveCount(0);
    await page.evaluate(() => {
      chrome.tabs.query = async (query: chrome.tabs.QueryInfo) => {
        if (!query.active || !query.currentWindow) throw new Error('Must select only the active tab');
        return [{ id: 900, url: 'https://example.com/lesson', title: 'Resolve lesson' } as chrome.tabs.Tab];
      };
    });
    await page.getByRole('button', { name: 'Save current tab to collection' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Date', { exact: true }).fill('2030-10-10');
    await page.getByLabel('Time', { exact: true }).fill('14:30');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.schedule-editor').getByRole('status')).toContainText('Saved');
    await page.locator('.schedule-editor').getByRole('button', { name: 'Close', exact: true }).click();
    expect(await page.evaluate(() => window.db.tabs.count())).toBe(1);
    const saved = await page.evaluate(async () => { const tab = await window.db.tabs.toCollection().first(); return { at: tab!.scheduledAt, alarm: await chrome.alarms.get('tab_story_reminder_' + tab!.id) }; });
    expect(saved.at).toBeTruthy(); expect(saved.alarm?.scheduledTime).toBe(saved.at);
    await page.getByRole('button', { name: 'Save current tab to collection' }).click();
    await expect(page.getByText('Already saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('collections.png') });
    await page.getByRole('button', { name: 'Calendar', exact: true }).first().click();
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page.locator('#calendar-tab')).toContainText('DaVinci Resolve · Resolve lesson');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Collections', exact: true }).click();
    await page.getByRole('button', { name: 'DaVinci Resolve 1', exact: true }).click();
    await page.locator('.collection-tabs').getByTitle('More options', { exact: true }).click();
    await page.getByRole('button', { name: 'Remove from collection', exact: true }).click();
    expect(await page.evaluate(() => window.db.tabs.count())).toBe(1);
    await expect(page.locator('.collection-tabs').getByTitle('More options', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Collection options', exact: true }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete collection', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New collection' })).toBeVisible();
    expect(await page.evaluate(() => window.db.collections.count())).toBe(0);
  } finally { await context.close(); }
});

test('first schedule saves before opening highlighted reminder setup', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, viewport: { width: 380, height: 800 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  context.setDefaultTimeout(6000);
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Language', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Collections', exact: true }).click();
    await page.getByRole('button', { name: 'New collection' }).click();
    await page.getByLabel('Collection name').fill('DaVinci Resolve');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByLabel('Find tabs')).toHaveCount(0);
    await page.evaluate(() => {
      chrome.tabs.query = async (query: chrome.tabs.QueryInfo) => {
        if (!query.active || !query.currentWindow) throw new Error('Must select only the active tab');
        return [{ id: 900, url: 'https://example.com/lesson', title: 'Resolve lesson' } as chrome.tabs.Tab];
      };
    });
    await page.getByRole('button', { name: 'Save current tab to collection' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Date', { exact: true }).fill('2030-10-10');
    await page.getByLabel('Time', { exact: true }).fill('14:30');
    await page.getByRole('button', { name: 'Save & set up alerts', exact: true }).click();
    const card = page.getByRole('region', { name: 'Reminders', exact: true });
    await expect(card).toHaveClass(/reminder-spotlight/);
    await expect(card).toBeFocused();
    const os = await page.evaluate(async () => (await chrome.runtime.getPlatformInfo()).os);
    if (os === 'mac' || os === 'win') {
      await expect(card.getByRole('link', { name: os === 'mac' ? 'Open Chrome Helper alerts' : 'Open system notifications' })).toHaveAttribute('href', os === 'mac' ? 'x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.google.Chrome.framework.AlertNotificationService' : 'ms-settings:notifications');
    }
    if (await page.evaluate(() => chrome.notifications.getPermissionLevel()) !== 'granted') await expect(card.getByRole('button', { name: 'Open Chrome extension settings' })).toBeVisible();
    await expect(page.getByText('No alert?', { exact: true })).toHaveCount(0);
    const saved = await page.evaluate(async () => {
      const tab = await window.db.tabs.toCollection().first();
      return { at: tab!.scheduledAt, alarm: await chrome.alarms.get('tab_story_reminder_' + tab!.id), visited: (await chrome.storage.local.get('reminderSetupVisited')).reminderSetupVisited };
    });
    expect(saved.alarm?.scheduledTime).toBe(saved.at);
    expect(saved.visited).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Dark Mode', exact: true }).click();
    await page.screenshot({ path: test.info().outputPath('reminder-setup.png') });
    await page.evaluate(() => { chrome.permissions.request = async () => false; });
    await card.getByRole('button', { name: 'Enable website banners', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Try again');
    await page.evaluate(() => { chrome.permissions.request = async () => true; });
    await card.getByRole('button', { name: 'Enable website banners', exact: true }).click();
    await expect(card.getByRole('button', { name: '✓ Website banners enabled', exact: true })).toBeDisabled();
    await expect(card.getByRole('status')).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Collections', exact: true }).click();
    await page.getByRole('button', { name: 'DaVinci Resolve 1', exact: true }).click();
    await page.locator('.collection-tabs').getByTitle('More options', { exact: true }).click();
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await expect(page.locator('.schedule-editor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save & set up alerts', exact: true })).toHaveCount(0);

  } finally { await context.close(); }
});
