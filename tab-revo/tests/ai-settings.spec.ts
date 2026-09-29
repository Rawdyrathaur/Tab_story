import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('AI settings offer supported providers, clear switched keys and fit narrow panels', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, viewport: { width: 380, height: 800 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText('AI assistant', { exact: true }).click();
    const providers = page.getByRole('group', { name: 'Choose AI provider' });
    await expect(providers.getByRole('button')).toHaveCount(3);
    await expect(providers.getByRole('button', { name: 'Groq' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByPlaceholder('Paste your key').fill('not-a-real-key');
    await providers.getByRole('button', { name: 'Cerebras' }).click();
    await expect(page.getByPlaceholder('Paste your key')).toHaveValue('');
    await expect(page.getByRole('link', { name: 'Get a Cerebras API key' })).toHaveAttribute('href', 'https://cloud.cerebras.ai/');
    await providers.getByRole('button', { name: 'Groq' }).click();
    await expect(page.getByRole('link', { name: 'Get a Groq API key' })).toHaveAttribute('href', 'https://console.groq.com/keys');
    await providers.getByRole('button', { name: 'Google Gemini' }).click();
    await expect(page.getByRole('link', { name: 'Get a Google Gemini API key' })).toHaveAttribute('href', 'https://aistudio.google.com/apikey');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Dark Mode', exact: true }).click();
    await page.screenshot({ path: test.info().outputPath('ai-settings.png') });
  } finally { await context.close(); }
});
