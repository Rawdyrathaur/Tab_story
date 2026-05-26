# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extension.spec.ts >> extension loads correctly
- Location: tests/extension.spec.ts:4:5

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not ""
```

# Test source

```ts
  1  | import { test, expect, chromium } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | test('extension loads correctly', async () => {
  5  |   const pathToExtension = path.join(__dirname, '../dist');
  6  | 
  7  |   const context = await chromium.launchPersistentContext('', {
  8  |     headless: false,
  9  |     args: [
  10 |       '--disable-extensions-except=' + pathToExtension,
  11 |       '--load-extension=' + pathToExtension,
  12 |     ],
  13 |   });
  14 | 
  15 |   await new Promise(r => setTimeout(r, 3000));
  16 | 
  17 |   // Get extension ID from service worker
  18 |   const workers = context.serviceWorkers();
  19 |   console.log('Workers:', workers.map(w => w.url()));
  20 | 
  21 |   let extId = '';
  22 |   for (const worker of workers) {
  23 |     const url = worker.url();
  24 |     if (url.startsWith('chrome-extension://')) {
  25 |       extId = url.split('/')[2];
  26 |       break;
  27 |     }
  28 |   }
  29 | 
  30 |   console.log('Extension ID:', extId);
> 31 |   expect(extId).not.toBe('');
     |                     ^ Error: expect(received).not.toBe(expected) // Object.is equality
  32 | 
  33 |   const sidepanel = await context.newPage();
  34 |   await sidepanel.goto('chrome-extension://' + extId + '/sidepanel.html');
  35 |   await expect(sidepanel.locator('body')).toBeVisible();
  36 | 
  37 |   await context.close();
  38 | });
```