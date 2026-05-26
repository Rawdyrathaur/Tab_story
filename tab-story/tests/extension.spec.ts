import { test, expect, chromium } from '@playwright/test';
import path from 'path';

async function loadExtension() {
  const pathToExtension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--disable-extensions-except=' + pathToExtension,
      '--load-extension=' + pathToExtension,
    ],
  });
  const worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
  const extId = worker.url().split('/')[2];
  const page = await context.newPage();
  await page.goto('chrome-extension://' + extId + '/sidepanel.html');
  return { context, page };
}

test('sidepanel loads and shows UI', async () => {
  const { context, page } = await loadExtension();
  await expect(page.locator('body')).toBeVisible();
  await context.close();
});

test('search bar is visible', async () => {
  const { context, page } = await loadExtension();
  await expect(page.locator('input')).toBeVisible();
  await context.close();
});

test('empty state shows when no tabs saved', async () => {
  const { context, page } = await loadExtension();
  await expect(page.locator('text=No saved tabs yet')).toBeVisible();
  await context.close();
});