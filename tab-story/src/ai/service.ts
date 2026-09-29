import { Readability } from '@mozilla/readability';
import type { RelatedTopic, runTool } from './summary';
type GeneratedAnswer = Awaited<ReturnType<typeof runTool>> & { cachedAt?: number };
export interface Source {
  title: string;
  url: string;
  text: string;
  truncated: boolean;
  image?: string;
  images?: string[];
  domain?: string;
  method?: string;
  fetchedAt?: number;
  links?: { title: string; url: string }[];
  headings?: { offset: number; title: string }[];
}
export type AIProgress = { stage: 'waiting' | 'sending' | 'processing' | 'receiving' | 'references'; completed?: number; total?: number; topics?: RelatedTopic[] };
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export class AIRequestError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AIRequestError';
    this.code = code;
  }
}
export async function aiRequest(operation: string, data: Record<string, unknown> = {}) {
  const result = await chrome.runtime.sendMessage({ type: 'tab-story:ai', operation, ...data });
  if (!result?.ok) throw new AIRequestError(result?.error || 'AI service unavailable. Reload the extension.', result?.code);
  return result;
}

// A real provider stream, not a typing animation over an already finished answer.
export function aiGenerate(data: Record<string, unknown>, onDelta: (text: string) => void, signal: AbortSignal, onProgress?: (progress: AIProgress) => void): Promise<GeneratedAnswer> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const port = chrome.runtime.connect({ name: 'tab-story:ai-stream' });
    let settled = false;
    const finish = (error?: Error, result?: GeneratedAnswer) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      signal.removeEventListener('abort', cancel);
      port.onMessage.removeListener(receive);
      port.onDisconnect.removeListener(disconnected);
      port.disconnect();
      if (error) reject(error); else if (result) resolve(result); else reject(new Error('The provider returned no answer.'));
    };
    const cancel = () => finish(new DOMException('Request cancelled.', 'AbortError'));
    const disconnected = () => finish(new AIRequestError(chrome.runtime.lastError?.message || 'AI connection interrupted. Please retry.'));
    const receive = (message: Record<string, unknown>) => {
      if (message.type === 'delta' && typeof message.text === 'string') onDelta(message.text);
      if (message.type === 'progress' && ['waiting', 'sending', 'processing', 'receiving', 'references'].includes(String(message.stage))) onProgress?.(message as AIProgress);
      if (message.type === 'result' && message.result && typeof message.result === 'object' && 'text' in message.result) finish(undefined, message.result as GeneratedAnswer);
      if (message.type === 'error') finish(new AIRequestError(typeof message.error === 'string' ? message.error : 'AI request failed.', typeof message.code === 'string' ? message.code : undefined));
    };
    const deadline = setTimeout(() => finish(new AIRequestError('AI took too long. Reload the extension and retry.', 'AI_UNAVAILABLE')), 90000);
    port.onMessage.addListener(receive);
    port.onDisconnect.addListener(disconnected);
    signal.addEventListener('abort', cancel, { once: true });
    try { port.postMessage({ ...data, operation: 'generate' }); } catch (error) { finish(error instanceof Error ? error : new Error('Could not start AI.')); }
  });
}


export function parseArticle(snapshot: { html: string; url: string; fetchedAt: number }): Source {
  const doc = new DOMParser().parseFromString(snapshot.html, 'text/html');
  const base = doc.createElement('base');
  base.href = snapshot.url;
  doc.head.prepend(base);
  const imageUrl = (value: string | null) => {
    try {
      const url = new URL(value || '', snapshot.url);
      return value && /^https?:$/.test(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const og = imageUrl(doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || null);
  const article = new Readability(doc.cloneNode(true) as Document).parse();
  // Conversation apps are not articles; preserve their actual message bodies.
  const messages = Array.from(doc.querySelectorAll('[data-message-author-role]'));
  const main = doc.querySelector('main, [role="main"]')?.cloneNode(true) as HTMLElement | undefined;
  main?.querySelectorAll('nav,aside,footer,form,button,input,textarea,select,[role="navigation"]').forEach(node => node.remove());
  const messageText = messages.map(node => `${node.getAttribute('data-message-author-role')}:\n${node.textContent?.trim() || ''}`).join('\n\n');
  const fallbackText = main?.textContent?.trim() || '';
  const articleText = article?.textContent?.trim() || '';
  const extractedText = messageText || (articleText.length >= 80 ? articleText : fallbackText);
  const looksLikeAccessWall = !messageText && articleText.length < 200 && extractedText.length < 1200 &&
    /\b(?:sign in|log in|create an account|accept (?:all )?cookies|subscribe to (?:continue|read)|enable cookies)\b/i.test(extractedText);
  if (extractedText.length < 200 || looksLikeAccessWall) {
    throw new Error(`“${doc.title || 'Selected tab'}” has no readable content yet, or shows a login, paywall, or cookie screen. Open the saved page, finish loading or sign in, then retry.`);
  }
  const content = new DOMParser().parseFromString(article?.content || main?.outerHTML || '', 'text/html');
  const images = Array.from(content.images).map((img, index) => {
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
    const srcsetCandidates = srcset.split(',').map(candidate => {
      const [url, descriptor = '0w'] = candidate.trim().split(/\s+/);
      return { url, width: Number.parseInt(descriptor, 10) || 0 };
    }).filter(candidate => candidate.url).sort((a, b) => b.width - a.width);
    return {
      url: imageUrl(
        img.getAttribute('src') ||
        img.getAttribute('data-src') ||
        img.getAttribute('data-lazy-src') ||
        srcsetCandidates[0]?.url
      ),
      area: (Number(img.getAttribute('width')) || 0) * (Number(img.getAttribute('height')) || 0),
      index,
    };
  }).filter(img => img.url);
  images.sort((a, b) => b.area - a.area || a.index - b.index);
  content.querySelectorAll('p,li,h1,h2,h3,tr,pre').forEach(node => node.append('\n'));
  const seen = new Set<string>();
  const links = Array.from(content.querySelectorAll('a[href]')).flatMap(anchor => {
    const title = anchor.textContent?.trim().replace(/\s+/g, ' ').slice(0, 180) || '';
    try {
      const url = new URL(anchor.getAttribute('href') || '', snapshot.url);
      if (title.length < 4 || !/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.href === snapshot.url || seen.has(url.href)) return [];
      seen.add(url.href);
      return [{ title, url: url.href }];
    } catch { return []; }
  }).slice(0, 60);
  const text = messageText || (articleText.length >= 80 ? content.body.textContent?.trim() || articleText : fallbackText);
  let headingOffset = 0;
  const headings = Array.from(content.querySelectorAll('h1,h2,h3,h4')).flatMap(node => {
    const title = node.textContent?.trim().replace(/\s+/gu, ' ').slice(0, 120) || '';
    if (!title) return [];
    const offset = text.indexOf(title, headingOffset);
    if (offset < 0) return [];
    headingOffset = offset + title.length;
    return [{ offset, title }];
  });
  return {
    title: article?.title || doc.title, url: snapshot.url,
    text,
    image: og || images[0]?.url || '', images: images.map(img => img.url),
    domain: new URL(snapshot.url).hostname, truncated: false,
    method: messages.length ? 'Selected conversation' : 'Readability · selected tab', fetchedAt: snapshot.fetchedAt,
    links: messages.length ? [] : links,
    headings: messages.length ? [] : headings,
  };
}
