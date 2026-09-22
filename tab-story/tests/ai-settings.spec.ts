import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('AI settings offer four providers, clear switched keys and fit narrow panels', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, viewport: { width: 380, height: 800 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByText('AI assistant', { exact: true }).click();
    const provider = page.getByRole('combobox', { name: 'AI Provider' });
    await expect(provider.locator('option')).toHaveCount(4);
    await page.getByPlaceholder('Paste your Google Gemini API key...').fill('not-a-real-key');
    await provider.selectOption('groq');
    await expect(page.getByPlaceholder('Paste your Groq API key...')).toHaveValue('');
    await expect(page.getByRole('link', { name: 'Get API key' })).toHaveAttribute('href', 'https://console.groq.com/keys');
    await expect(page.getByText('Session only · Sent to Groq')).toBeVisible();
    await provider.selectOption('openrouter');
    await expect(page.getByRole('link', { name: 'Get API key' })).toHaveAttribute('href', 'https://openrouter.ai/settings/keys');
    await provider.selectOption('mistral');
    await expect(page.getByPlaceholder('Paste your Mistral API key...')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Dark Mode', exact: true }).click();
    await page.screenshot({ path: test.info().outputPath('ai-settings.png') });
  } finally { await context.close(); }
});
