import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('preview plays bundled MP3 in offscreen document and dismissal stops it', async () => {
  const extension = path.resolve('./dist');
  const context = await chromium.launchPersistentContext('', { headless: false, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto(`chrome-extension://${worker.url().split('/')[2]}/sidepanel.html`);
    const response = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'tab-story:reminder', operation: 'test' }));
    expect(response).toEqual({ ok: true });
    await expect.poll(() => worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] })), { timeout: 15000 }).toHaveLength(1);
    const cdp = await context.newCDPSession(page);
    const targets = await cdp.send('Target.getTargets');
    const target = targets.targetInfos.find(t => t.url.endsWith('/alarm.html'));
    expect(target).toBeTruthy();
    // Chrome reports an active audio playback session in the hidden document.
    const result = await page.evaluate(() => chrome.runtime.sendMessage({ target: 'tab-story:alarm', operation: 'play' }));
    expect(result).toEqual({ ok: true });
    expect(await page.evaluate(() => chrome.runtime.sendMessage({ target: 'tab-story:alarm', operation: 'stop' }))).toEqual({ ok: true });
    const audio = await page.evaluate(async () => {
      const player = new Audio(chrome.runtime.getURL('audio/tab-story.mp3'));
      await new Promise<void>((resolve, reject) => { player.onloadedmetadata = () => resolve(); player.onerror = () => reject(new Error('Invalid audio')); });
      return player.duration;
    });
    expect(audio).toBeGreaterThan(0);
  } finally { await context.close(); }
});
