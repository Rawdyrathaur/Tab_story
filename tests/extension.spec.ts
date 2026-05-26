import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('extension loads correctly', async () => {
  const pathToExtension = path.join(__dirname, '../dist');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      '--disable-extensions-except=' + pathToExtension,
      '--load-extension=' + pathToExtension,
    ],
  });

  const worker = await context.waitForEvent('serviceworker', { timeout: 10000 });
  const extId = worker.url().split('/')[2];
  console.log('Extension ID:', extId);

  const sidepanel = await context.newPage();
  await sidepanel.goto('chrome-extension://' + extId + '/sidepanel.html');
  await expect(sidepanel.locator('body')).toBeVisible();
  console.log('Sidepanel loaded successfully');

  await context.close();
});