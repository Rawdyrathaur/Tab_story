import DOMPurify from 'dompurify';
import { aiRequest, parseArticle } from '../ai/service';
import { db, type OfflineArticle } from '../sidepanel/db';

const sanitize = (html: string) => DOMPurify.sanitize(html, {
  FORBID_TAGS: ['style','script','iframe','frame','object','embed','form','input','button','select','textarea','link','meta','base','video','audio','source','canvas'],
  FORBID_ATTR: ['style','srcdoc','srcset','onerror','onclick'],
});
const blocked = (host: string) => /(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|web\.whatsapp\.com|web\.telegram\.org)$/.test(host) || /(bank|netbanking|payment)/i.test(host) || /^(localhost|127\.|10\.|192\.168\.)/.test(host);
async function premium() { return (await chrome.storage.local.get('tabStory.proActive'))['tabStory.proActive'] === true; }
async function digest(value: string) { const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(data)].map(byte => byte.toString(16).padStart(2,'0')).join(''); }

export async function requestOfflineReaderAccess(url: string) {
  if (!await premium()) return false;
  const parsed = new URL(url);
  if (blocked(parsed.hostname)) return false;
  return chrome.permissions.request({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
}

export async function saveOfflineArticle(tabId: number) {
  const tab = await db.tabs.get(tabId);
  if (!tab?.uuid || !await premium()) return;
  const url = new URL(tab.url);
  if (blocked(url.hostname) || !/^https?:$/.test(url.protocol)) { await db.tabs.update(tabId, { articleStatus: 'skipped' }); return; }
  await db.tabs.update(tabId, { articleStatus: 'saving', articleError: null });
  try {
    const target = await aiRequest('target', { url: tab.url });
    const sourceResult = await aiRequest('sources', { tabId: target.tabId, url: tab.url });
    const source = parseArticle(sourceResult.snapshot);
    if (source.text.length < 400) { await db.tabs.update(tabId, { articleStatus: 'skipped' }); return; }
    const document = new DOMParser().parseFromString(sourceResult.snapshot.html, 'text/html');
    const contentHtml = sanitize(document.querySelector('article')?.innerHTML || document.querySelector('main')?.innerHTML || `<p>${source.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n\n/g,'</p><p>')}</p>`);
    const words = source.text.split(/\s+/).filter(Boolean).length;
    const articleId = tab.articleId || crypto.randomUUID(); const now = Date.now();
    const article: OfflineArticle = { id: articleId, tabUuid: tab.uuid, url: tab.url, title: source.title || tab.title, siteName: source.domain,
      contentHtml, text: source.text, wordCount: words, readingMinutes: Math.max(1, Math.round(words/230)), contentHash: await digest(contentHtml),
      sizeBytes: new Blob([contentHtml,source.text]).size, savedAt: now, updatedAt: now, readProgress: 0, lastReadAt: null };
    await db.transaction('rw', db.articles, db.tabs, async () => { await db.articles.put(article); await db.tabs.update(tabId, { articleStatus: 'saved', articleId, readingMinutes: article.readingMinutes, updatedAt: now }); });
  } catch (error) { await db.tabs.update(tabId, { articleStatus: 'failed', articleError: error instanceof Error ? error.message : 'Article capture failed' }); }
}

export async function getOfflineArticle(id: string) { const row = await db.articles.get(id); return row ? { ...row, contentHtml: sanitize(row.contentHtml) } : undefined; }
export async function saveReaderProgress(id: string, progress: number) { await db.articles.update(id, { readProgress: Math.max(0,Math.min(1,progress)), lastReadAt: Date.now(), updatedAt: Date.now() }); }
