import { providers, isProvider, callCompatible, verifyCompatibleKey } from './providers';
import type { AIProgress, ChatMessage, Source } from './service';
import { runTool, structuredPreview, type RelatedTopic, type TopicReference, type ToolId } from './summary';
import { answerKey, answersEnabled, clearAnswers, recentAnswers, saveAnswer, setAnswersEnabled } from './answers';
import { readEventStream, type TextDelta } from './stream';
const jobs = new Map<string, AbortController>();
const reads = new Map<string, AbortController>();

class AIError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
  }
}

function timeoutSignal(milliseconds: number, parent?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(milliseconds);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

function topicWords(value: string): string[] {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').match(/[\p{L}\p{N}]{3,}/gu)?.filter(word => !['the', 'and', 'for', 'with', 'from', 'about'].includes(word)).map(word => word.replace(/s$/, '')) || [];
}

function matchingTopicTitle(expected: string, candidate: string): boolean {
  const words = topicWords(expected);
  const candidateWords = topicWords(candidate);
  return words.length > 0 && words.length === candidateWords.length && words.every((word, index) => word === candidateWords[index]);
}

function referenceUrl(value: unknown): string {
  try {
    if (typeof value !== 'string') return '';
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || !url.hostname.includes('.') || /^(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\.(?:local|internal)$/.test(url.hostname) || /\/(?:search|results|query|special:search)(?:\/|$)/i.test(url.pathname)) return '';
    return url.href;
  } catch { return ''; }
}

async function findTopicReference(topic: RelatedTopic, sources: Source[], signal: AbortSignal): Promise<RelatedTopic> {
  const references: TopicReference[] = [];
  const add = (reference: TopicReference) => {
    const url = referenceUrl(reference.url);
    if (url && !references.some(existing => existing.url === url || new URL(existing.url).hostname === new URL(url).hostname)) {
      references.push({ ...reference, url });
    }
  };
  for (const link of sources.flatMap(source => source.links || [])) {
    if (matchingTopicTitle(topic.title, link.title)) add({ title: link.title, url: link.url, kind: 'page-link' });
  }
  // Search public encyclopedia titles only. Never send page text or private URLs.
  if (!topicWords(topic.title).length || /@|https?:|\d{5,}/i.test(topic.title)) {
    return { ...topic, references, url: references[0]?.url, referenceStatus: references.length ? 'found' : 'unavailable' };
  }
  try {
    const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: topic.title,
      gsrnamespace: '0', gsrlimit: '5', prop: 'info|pageprops', inprop: 'url',
      ppprop: 'wikibase_item', format: 'json', origin: '*' });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      signal: timeoutSignal(3000, signal), credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
    });
    if (response.ok) {
      const data = await response.json() as { query?: { pages?: Record<string, { title?: string; fullurl?: string; pageprops?: { wikibase_item?: string } }> } };
      const page = Object.values(data.query?.pages || {}).find(candidate =>
        typeof candidate.title === 'string' && matchingTopicTitle(topic.title, candidate.title));
      const pageUrl = referenceUrl(page?.fullurl);
      if (pageUrl && new URL(pageUrl).hostname === 'en.wikipedia.org' && new URL(pageUrl).pathname.startsWith('/wiki/')) {
        add({ title: page?.title || topic.title, url: pageUrl, kind: 'wikipedia' });
        const item = page?.pageprops?.wikibase_item;
        if (item && /^Q[1-9]\d{0,11}$/.test(item)) {
          add({ title: `${page?.title || topic.title} · Wikidata`, url: `https://www.wikidata.org/wiki/${item}`, kind: 'wikidata' });
        }
      }
    }
  } catch {
    signal.throwIfAborted();
  }
  return { ...topic, references: references.slice(0, 3), url: references[0]?.url,
    referenceTitle: references[0]?.title, referenceStatus: references.length ? 'found' : 'unavailable' };
}

function geminiError(status: number, _detail: string, action = 'request'): Error {
  if (status === 429) {
    return new AIError('Your free Gemini API quota has been reached.', 'AI_QUOTA');
  }
  if ([408, 500, 502, 503, 504].includes(status)) {
    return new AIError('Gemini is temporarily unavailable. Try again shortly.', 'AI_UNAVAILABLE');
  }
  if ([400, 401, 403].includes(status)) {
    return new AIError(`Gemini ${action} failed. Check the API key, project permissions, billing, and region availability.`, 'AI_AUTH');
  }
  if (status === 404) return new AIError('Gemini model unavailable. Reconnect your key to choose a current model.', 'AI_MODEL');
  return new AIError(`Gemini ${action} failed (${status}). Please retry later.`, 'AI_PROVIDER');
}

async function responseError(response: Response): Promise<string> {
  try {
    const payload = await response.clone().json();
    return payload?.error?.message || payload?.message || '';
  } catch {
    return response.text().catch(() => '');
  }
}

function chooseGeminiModel(models: string[]): string {
  const stable = models.filter(name => /^gemini-\d+(?:\.\d+)?-flash(?:-lite)?$/.test(name));
  const version = (name: string) => {
    const match = name.match(/^gemini-(\d+)(?:\.(\d+))?-/);
    return match ? Number(match[1]) * 1000 + Number(match[2] || 0) : 0;
  };
  const newest = (options: string[]) => options.sort((a, b) => version(b) - version(a))[0] || '';
  return newest(stable.filter(name => name.endsWith('-flash-lite'))) ||
    newest(stable.filter(name => name.endsWith('-flash'))) ||
    (models.includes('gemini-flash-lite-latest') ? 'gemini-flash-lite-latest' : '') ||
    (models.includes('gemini-flash-latest') ? 'gemini-flash-latest' : '');
}

function waitForRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal?.reason || new DOMException('Request cancelled.', 'AbortError'));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason || new DOMException('Request cancelled.', 'AbortError'));
    };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function listGeminiTextModels(key: string, action = 'key validation'): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      method: 'GET',
      headers: { 'x-goog-api-key': key },
      signal: timeoutSignal(15000),
      credentials: 'omit',
      redirect: 'error',
    });
  } catch (cause) {
    if (cause instanceof Error && ['AbortError', 'TimeoutError'].includes(cause.name)) throw cause;
    throw new Error('Could not reach Gemini. Check your internet connection and try again.', { cause });
  }

  if (!response.ok) throw geminiError(response.status, await responseError(response), action);
  const data = await response.json();
  return [...new Set<string>((data.models || [])
    .filter((item: { supportedGenerationMethods?: string[] }) =>
      item.supportedGenerationMethods?.includes('generateContent'))
    .map((item: { name?: string }) => (item.name || '').replace(/^models\//, ''))
    .filter((name: string) =>
      name.startsWith('gemini-') &&
      !/(preview|exp|image|audio|live|tts|transcribe|embedding|aqa)/i.test(name)))];
}

async function protectStorage() {
  try {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch {
    // Session storage access level not supported in some contexts
  }
}

async function extract(tabId: number, expectedUrl: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const tab = await chrome.tabs.get(tabId);
  if (tab.url !== expectedUrl) throw new Error('The selected tab navigated to a different page. Select its updated saved URL and retry.');
  if (!tab?.id || !tab.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error('Open a webpage in the active browser tab before summarizing.');
  }
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [expectedUrl],
      func: async (expected: string) => {
        if (location.href !== expected) throw new Error('Target page changed.');
        // Document load can finish before a client-rendered conversation appears.
        let previous = '';
        let stable = 0;
        const content = () => (document.querySelector('main, article, [role="main"], [data-message-author-role]') as HTMLElement | null)?.innerText || document.body?.innerText || '';
        const conversation = /(^|\.)(chatgpt\.com|claude\.ai|gemini\.google\.com)$/.test(location.hostname);
        const deadline = Date.now() + 5000;
        while ((conversation || content().trim().length < 200) && Date.now() < deadline) {
          const current = content();
          stable = current === previous ? stable + 1 : 0;
          previous = current;
          if (current.trim().length >= 200 && stable >= 1) break;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (location.href !== expected) throw new Error('Target page changed.');
        const clone = document.cloneNode(true) as Document;
        const originals = Array.from(document.querySelectorAll('*'));
        const copies = Array.from(clone.querySelectorAll('*'));
        originals.forEach((node, index) => {
          if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') {
            copies[index]?.remove();
            return;
          }
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') copies[index]?.remove();
        });
        clone.querySelectorAll('script,style,noscript,iframe,template,input,textarea,select').forEach(node => node.remove());
        return { html: clone.documentElement.outerHTML, url: location.href, fetchedAt: Date.now() };
      },
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : '';
    if (/permission|cannot access|extensions gallery/i.test(detail)) {
      throw new Error('Page access is not available. Click Summarize again and allow this site in Chrome’s permission prompt. If no prompt appears, reload the updated extension in chrome://extensions.', { cause });
    }
    throw new Error('The active page could not be read. Reload the page and try again.', { cause });
  }
  const snapshot = results[0]?.result;
  signal?.throwIfAborted();
  if (snapshot?.url !== expectedUrl) throw new Error('The selected page changed while reading it. Retry from its saved tab.');
  if (!snapshot?.html) throw new Error('This page could not be read. Reload it and try again.');
  if (snapshot.html.length > 8000000) throw new Error('This page is too large to process. Open its article or reader view first.');
  return snapshot;
}

const GEMINI_SESSION_KEY = 'tabStory.sessionKey_gemini';
const CONSENT_KEY = 'tabStory.aiConsent.v1';
const CONSENT_VERSION = 2;
type ConsentRecord = { version: number; at: number };

async function hasConsent(providerId: string): Promise<boolean> {
  const record = (await chrome.storage.local.get(CONSENT_KEY))[CONSENT_KEY] as Record<string, ConsentRecord> | undefined;
  return record?.[providerId]?.version === CONSENT_VERSION;
}

async function saveConsent(providerId: string): Promise<void> {
  const record = ((await chrome.storage.local.get(CONSENT_KEY))[CONSENT_KEY] || {}) as Record<string, ConsentRecord>;
  await chrome.storage.local.set({ [CONSENT_KEY]: { ...record, [providerId]: { version: CONSENT_VERSION, at: Date.now() } } });
}

async function resolveTarget(url: string, signal?: AbortSignal): Promise<{ tabId: number; opened: boolean; finalUrl: string }> {
  signal?.throwIfAborted();
  const targetUrl = new URL(url);
  if (!/^https?:$/.test(targetUrl.protocol)) throw new Error('Select a normal webpage to summarize.');
  const origin = `${targetUrl.protocol}//${targetUrl.hostname}/*`;
  if (!await chrome.permissions.contains({ origins: [origin] })) {
    throw new Error('Allow access to the selected website before summarizing.');
  }
  signal?.throwIfAborted();
  const openTabs = await chrome.tabs.query({});
  signal?.throwIfAborted();
  const matches = openTabs.filter(tab => tab.url === targetUrl.href);
  let tab: chrome.tabs.Tab | undefined = matches.find(tab => tab.active) || matches[0];
  const opened = !tab;
  if (!tab) tab = await chrome.tabs.create({ url: targetUrl.href, active: false });
  if (!tab.id) throw new Error('The selected tab could not be opened.');
  const tabId = tab.id;
  try {
    await new Promise<void>((resolve, reject) => {
    let settled = false;
    let probing = false;
    let reloadRequested = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      chrome.tabs.onUpdated.removeListener(updated);
      chrome.tabs.onRemoved.removeListener(removed);
      signal?.removeEventListener('abort', cancelled);
      if (error) reject(error); else resolve();
    };
    const cancelled = () => finish(new DOMException('Request cancelled.', 'AbortError'));
    const checkReady = async () => {
      if (settled || probing) return;
      probing = true;
      try {
        const current = await chrome.tabs.get(tabId);
        if (current.discarded) {
          if (!reloadRequested) {
            reloadRequested = true;
            await chrome.tabs.reload(tabId);
          }
        } else if (current.status === 'complete') {
          finish();
        } else {
          // The document can be read at DOMContentLoaded; images and other
          // subresources need not finish before the AI starts reading text.
          const ready = await chrome.scripting.executeScript({
            target: { tabId },
            args: [targetUrl.href],
            func: expected => location.href === expected && document.readyState !== 'loading' && Boolean(document.body),
          });
          if (ready[0]?.result) finish();
        }
      } catch {
        // An early probe can run before the new document is scriptable.
        // Keep waiting for the next tab update or poll.
      } finally {
        probing = false;
      }
    };
    const updated = (id: number) => { if (id === tabId) void checkReady(); };
    const removed = (id: number) => {
      if (id === tabId) finish(new Error('The selected tab was closed before it could be read.'));
    };
    const timer = setTimeout(() => finish(new Error('The selected page is still loading. Open it and retry once its text appears.')), 10000);
    const poll = setInterval(() => { void checkReady(); }, 300);
    chrome.tabs.onUpdated.addListener(updated);
    chrome.tabs.onRemoved.addListener(removed);
    signal?.addEventListener('abort', cancelled, { once: true });
    if (signal?.aborted) cancelled();
    void checkReady();
    });
    signal?.throwIfAborted();
    const loaded = await chrome.tabs.get(tabId);
    signal?.throwIfAborted();
    if (!loaded.url || new URL(loaded.url).origin !== targetUrl.origin) {
      throw new Error('The selected page redirected to another site. Open and save the final page, then summarize that tab.');
    }
    return { tabId, opened, finalUrl: loaded.url };
  } catch (cause) {
    if (opened) await chrome.tabs.remove(tabId).catch(() => {});
    throw cause;
  }
}

async function saveApiKey(plainKey: string) {
  await chrome.storage.session.set({ [GEMINI_SESSION_KEY]: plainKey });
}

async function getApiKey(provider = 'gemini'): Promise<string> {
  const storageKey = provider === 'gemini' ? GEMINI_SESSION_KEY : 'tabStory.aiKey.' + provider;
  try {
    const sessionVal = (await chrome.storage.session.get(storageKey))[storageKey];
    if (typeof sessionVal === 'string' && sessionVal) return sessionVal;
  } catch {
    return '';
  }
  return '';
}

async function clearAllKeys() {
  await chrome.storage.session.remove([GEMINI_SESSION_KEY, 'tabStory.geminiKey', 'tabStory.aiKey.groq', 'tabStory.aiKey.cerebras', 'tabStory.aiKey.openrouter', 'tabStory.aiKey.mistral']);
  await chrome.storage.local.remove([
    'tabStory.vaultKey_gemini', 'tabStory.vaultKey_groq',
    'tabStory.vaultKey_openrouter', 'tabStory.vaultKey_openai',
    'tabStory.activeAIProvider', 'tabStory.activeAIProviderId', 'tabStory.aiModel', CONSENT_KEY,
    'tabStory.aiModel.gemini', 'tabStory.aiModel.groq', 'tabStory.aiModel.cerebras', 'tabStory.aiModel.mistral', 'tabStory.aiModel.openrouter',
  ]);
}

async function availableProviders(): Promise<string[]> {
  const available: string[] = [];
  for (const id of Object.keys(providers)) {
    if (await getApiKey(id) && await hasConsent(id)) available.push(id);
  }
  return available;
}

// --- CALLERS FOR PROVIDERS ---

async function callGemini(
  key: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
  retriesRemaining = 1,
  allowModelFallback = true,
  onDelta?: TextDelta,
  onConnected?: () => void,
) {
  if (!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model)) {
    throw new Error('No compatible Gemini text model is selected. Reconnect your API key.');
  }
  const cleanModel = model;
  // Google Gemini API authenticates via secure x-goog-api-key header
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:${onDelta ? 'streamGenerateContent?alt=sse' : 'generateContent'}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      ...(!/^gemini-[3-9](?:\.|-)/.test(cleanModel) ? { temperature: 0.2 } : {}),
      maxOutputTokens: providers.gemini.maxOutputTokens,
      ...(/^gemini-2\.5-flash(?:-lite)?$/.test(cleanModel) ? { thinkingConfig: { thinkingBudget: 0 } }
        : /^gemini-3(?:\.(?:1|5|6))?-flash(?:-lite)?(?:-preview)?$/.test(cleanModel) ? { thinkingConfig: { thinkingLevel: 'MINIMAL' } }
          : /^gemini-[3-9](?:\.\d+)?-flash(?:-lite)?$/.test(cleanModel) ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {}),
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(payload),
      signal: timeoutSignal(45000, signal),
      credentials: 'omit',
      redirect: 'error',
    });
  } catch {
    if (signal?.aborted) throw signal.reason || new DOMException('Request cancelled.', 'AbortError');
    throw new AIError('Gemini could not be reached or timed out. Try again.', 'AI_UNAVAILABLE');
  }

  if (!response.ok) {
    const detail = await responseError(response);
    const transient = [408, 500, 502, 503, 504].includes(response.status);
    if (transient && retriesRemaining > 0) {
      await waitForRetry(700, signal);
      return callGemini(key, cleanModel, prompt, signal, retriesRemaining - 1, allowModelFallback, onDelta, onConnected);
    }

    if (response.status === 404 && allowModelFallback) {
      const recommended = response.status === 404
        ? detail.match(/models\/(gemini-[a-zA-Z0-9._-]*flash[a-zA-Z0-9._-]*)/i)?.[1]
        : undefined;
      if (recommended && recommended !== cleanModel && /^gemini-[a-zA-Z0-9._-]{1,100}$/.test(recommended)) {
        await chrome.storage.local.set({ 'tabStory.aiModel': recommended, 'tabStory.aiModel.gemini': recommended });
        return callGemini(key, recommended, prompt, signal, 0, false, onDelta, onConnected);
      }
      const alternatives = (await listGeminiTextModels(key, 'model refresh'))
        .filter((available) => available !== cleanModel);
      const replacement = chooseGeminiModel(alternatives);
      if (replacement && replacement !== cleanModel) {
        await chrome.storage.local.set({ 'tabStory.aiModel': replacement, 'tabStory.aiModel.gemini': replacement });
        return callGemini(key, replacement, prompt, signal, 0, false, onDelta, onConnected);
      }
    }
    throw geminiError(response.status, detail);
  }

  onConnected?.();

  if (onDelta) {
    let text = '';
    let incomplete = false;
    let ended = false;
    await readEventStream(response, data => {
      const candidate = data.candidates?.[0];
      const delta = candidate?.content?.parts?.filter(part => typeof part.text === 'string' && !part.thought).map(part => part.text || '').join('') || '';
      if (delta) {
        text += delta;
        if (text.length > 64000) throw new Error('The provider response is too large.');
        onDelta(delta);
      }
      if (candidate?.finishReason) { ended = true; incomplete ||= candidate.finishReason !== 'STOP'; }
    }, signal);
    if (!text.trim()) throw new Error('Gemini returned no answer. Try again.');
    return { text, incomplete: incomplete || !ended };
  }
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts
    ?.filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('\n');

  if (!text) {
    throw new Error('Gemini could not generate an answer. Please try again.');
  }

  return { text, incomplete: candidate.finishReason !== 'STOP' };
}

// --- MAIN AI HANDLER ---

export async function handleAI(request: Record<string, unknown>, onDelta?: TextDelta, callerSignal?: AbortSignal, onProgress?: (progress: AIProgress) => void) {
  callerSignal?.throwIfAborted();
  await protectStorage();
  const operation = request.operation;

  // 1. STATUS CHECK
  if (operation === 'status') {
    let activeData: Record<string, unknown> = {};
    try {
      if (chrome.storage?.local?.get) {
        activeData = (await chrome.storage.local.get([
          'tabStory.activeAIProvider',
          'tabStory.activeAIProviderId',
          'tabStory.aiModel',
        ])) || {};
      }
    } catch {
      // ignore
    }

    let activeId = typeof activeData['tabStory.activeAIProviderId'] === 'string'
      ? activeData['tabStory.activeAIProviderId']
      : '';
    const activeName = typeof activeData['tabStory.activeAIProvider'] === 'string'
      ? activeData['tabStory.activeAIProvider']
      : '';

    if (!activeId) {
      if (await getApiKey()) activeId = 'gemini';
    }

    const key = isProvider(activeId) ? await getApiKey(activeId) : '';
    if (!key || !isProvider(activeId)) {
      return {
        configured: false, saveAnswers: await answersEnabled(), keyNeededAgain: isProvider(activeId),
        availableProviders: await availableProviders(),
        providerId: isProvider(activeId) ? activeId : '',
        provider: isProvider(activeId) ? providers[activeId].name : '',
      };
    }

    return {
      configured: true,
      consented: await hasConsent(activeId),
      availableProviders: await availableProviders(),
      provider: activeName || (activeId === 'gemini' ? 'Google Gemini' : activeId),
      providerId: activeId,
      model: (activeData['tabStory.aiModel'] as string) || '',
      saveAnswers: await answersEnabled(),
    };
  }

  if (operation === 'recent') return { entries: await recentAnswers() };
  if (operation === 'clearAnswers') { await clearAnswers(); return { ok: true }; }
  if (operation === 'saveAnswers') {
    if (typeof request.enabled !== 'boolean') throw new Error('Invalid answer preference.');
    await setAnswersEnabled(request.enabled);
    return { ok: true };
  }

  // 2. FORGET / DISCONNECT
  if (operation === 'forget') {
    await clearAllKeys();
    for (const job of jobs.values()) job.abort();
    for (const read of reads.values()) read.abort();
    return { ok: true };
  }

  if (operation === 'consent') {
    const active = (await chrome.storage.local.get('tabStory.activeAIProviderId'))['tabStory.activeAIProviderId'];
    if (typeof active !== 'string' || !isProvider(active) || !await getApiKey(active) || request.accepted !== true) {
      throw new Error('Connect a provider and confirm consent first.');
    }
    await saveConsent(active);
    return { ok: true };
  }

  if (operation === 'switch') {
    const providerId = String(request.provider || '');
    if (!isProvider(providerId) || !await getApiKey(providerId) || !await hasConsent(providerId)) {
      throw new Error('Connect and consent to this provider before switching.');
    }
    const storedModel = (await chrome.storage.local.get(`tabStory.aiModel.${providerId}`))[`tabStory.aiModel.${providerId}`];
    const model = typeof storedModel === 'string' && storedModel ? storedModel
      : providerId === 'gemini' ? chooseGeminiModel(await listGeminiTextModels(await getApiKey('gemini'), 'model refresh'))
        : providers[providerId].model;
    if (!model) throw new Error('No compatible model is available for this provider. Reconnect its key.');
    await chrome.storage.local.set({
      'tabStory.activeAIProviderId': providerId,
      'tabStory.activeAIProvider': providers[providerId].name,
      'tabStory.aiModel': model,
      [`tabStory.aiModel.${providerId}`]: model,
    });
    return { providerId, provider: providers[providerId].name, model };
  }

  // 3. CANCEL JOB
  if (operation === 'cancel') {
    jobs.get(String(request.id))?.abort();
    reads.get(String(request.id))?.abort();
    return { ok: true };
  }

  // 4. EXTRACT SOURCES
  if (operation === 'read') {
    if (typeof request.url !== 'string' || request.url.length > 10000) throw new Error('Invalid target page.');
    const id = String(request.id || '');
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id) || reads.has(id)) throw new Error('Invalid AI read request.');
    const controller = new AbortController();
    reads.set(id, controller);
    try {
      const target = await resolveTarget(request.url, controller.signal);
      const closeOwnedTab = () => { if (target.opened) void chrome.tabs.remove(target.tabId).catch(() => {}); };
      controller.signal.addEventListener('abort', closeOwnedTab, { once: true });
      try {
        return { snapshot: await extract(target.tabId, target.finalUrl, controller.signal) };
      } finally {
        controller.signal.removeEventListener('abort', closeOwnedTab);
        if (target.opened) await chrome.tabs.remove(target.tabId).catch(() => {});
      }
    } finally {
      reads.delete(id);
    }
  }

  // 5. CONNECT & VERIFY KEY
  if (operation === 'connect') {
    const providerId = String(request.provider || 'gemini').toLowerCase();
    const key = typeof request.key === 'string' ? request.key.trim().replace(/^["']|["']$/g, '') : '';

    if (key.length < 8) {
      throw new Error('Please enter a valid API key.');
    }
    if (request.accepted !== true) throw new Error('Please confirm how the provider handles page content.');

    let defaultModel: string;
    const availableModels: string[] = [];

    // --- Validate Google Gemini Key ---
    if (providerId === 'gemini') {
      availableModels.push(...await listGeminiTextModels(key));

      defaultModel = chooseGeminiModel(availableModels);
      if (!defaultModel) {
        throw new Error('This Gemini key has no text-generation model available. Check the project in Google AI Studio.');
      }

      await saveApiKey(key);
      await saveConsent('gemini');
      try {
        if (chrome.storage?.local?.set) {
          await chrome.storage.local.set({
            'tabStory.activeAIProvider': 'Google Gemini',
            'tabStory.activeAIProviderId': 'gemini',
            'tabStory.aiModel': defaultModel,
            'tabStory.aiModel.gemini': defaultModel,
          });
        }
      } catch {
        // ignore
      }

      return { models: availableModels, selectedModel: defaultModel, provider: 'Google Gemini', providerId: 'gemini' };
    }

    if (isProvider(providerId) && providerId !== 'gemini') {
      await verifyCompatibleKey(providerId, key);
      await chrome.storage.session.set({ ['tabStory.aiKey.' + providerId]: key });
      await saveConsent(providerId);
      const config = providers[providerId];
      await chrome.storage.local.set({ 'tabStory.activeAIProvider': config.name, 'tabStory.activeAIProviderId': providerId, 'tabStory.aiModel': config.model, [`tabStory.aiModel.${providerId}`]: config.model });
      return { models: [config.model], selectedModel: config.model, provider: config.name, providerId };
    }
    throw new Error('Unsupported AI provider.');
  }

  // 6. GENERATE ANSWER / SUMMARY
  if (operation === 'generate') {
    let stored: Record<string, unknown> = {};
    try {
      if (chrome.storage?.local?.get) {
        stored = (await chrome.storage.local.get(['tabStory.activeAIProviderId', 'tabStory.aiModel'])) || {};
      }
    } catch {
      // ignore
    }

    const providerId = String(stored['tabStory.activeAIProviderId'] || 'gemini').toLowerCase();
    if (!isProvider(providerId)) throw new Error('Choose a supported AI provider.');
    const key = await getApiKey(providerId);
    if (!key) {
      throw new Error(`Connect your AI provider API key first. Keys are safely kept in your browser session.`);
    }
    if (!await hasConsent(providerId)) throw new AIError('Confirm provider data handling before sending page content.', 'AI_CONSENT_REQUIRED');

    const sources = request.sources as Source[];
    if (!Array.isArray(sources) || !sources.length || sources.length > 5 || sources.some((s) => !s || typeof s.text !== 'string' || s.text.length < 80 || s.text.length > 240000 || typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url))) {
      throw new Error('Provide readable tab content before asking AI.');
    }

    const query = String(request.query || '').slice(0, 2000);
    const language = String(request.language || 'en').slice(0, 40);
    const tool = String(request.tool || 'summarize') as ToolId;
    if (!['summarize', 'keypoints', 'simple', 'ask', 'extract', 'translate', 'related'].includes(tool)) {
      throw new Error('Choose a supported AI tool.');
    }
    const model = String(stored['tabStory.aiModel'] || request.model || '');
    const id = String(request.id || '');

    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new Error('Invalid AI request identifier.');
    if (jobs.has(id) || jobs.size >= 1) throw new Error('Another AI request is running. Wait or cancel it.');
    const controller = new AbortController();
    const cancelFromCaller = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener('abort', cancelFromCaller, { once: true });
    if (callerSignal?.aborted) cancelFromCaller();
    jobs.set(id, controller);

    try {
      const history = (Array.isArray(request.history) ? request.history : []) as ChatMessage[];
      if (history.length > 80 || history.some(turn => !turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string' || turn.content.length > 64000)) throw new Error('This conversation is too long. Start a new chat.');
      const cacheKey = await answerKey({
        sources: sources.map(source => ({ text: source.text, title: source.title, url: source.url })),
        tool, question: query, language, provider: providerId, model,
        history: tool === 'ask' ? history : [],
      });
      controller.signal.throwIfAborted();
      if (request.refresh !== true && await answersEnabled()) {
        const cached = (await recentAnswers()).find(entry => entry.key === cacheKey);
        if (cached) return { ...cached.result, cachedAt: cached.at };
      }
      controller.signal.throwIfAborted();
      const references = new Map<string, Promise<RelatedTopic>>();
      const resolved = new Map<string, RelatedTopic>();
      let partialText = '', receiving = false;
      let pendingTopics: RelatedTopic[] = [];
      const referenceProgress = () => onProgress?.({ stage: 'references', completed: resolved.size, total: pendingTopics.length,
        topics: pendingTopics.map(topic => resolved.get(topic.title) || { ...topic, referenceStatus: 'looking-up' }) });
      const lookup = (topic: RelatedTopic) => {
        if (references.has(topic.title)) return;
        references.set(topic.title, findTopicReference(topic, sources, controller.signal).then(reference => {
          resolved.set(topic.title, reference);
          if (!controller.signal.aborted) referenceProgress();
          return reference;
        }));
      };
      onProgress?.({ stage: 'waiting' });
      const result = await runTool({ sources, tool, language, question: query, providerId, history: tool === 'ask' ? history : [] }, async (prompt) => {
        controller.signal.throwIfAborted();
        onProgress?.({ stage: 'sending' });
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
        const connected = () => onProgress?.({ stage: 'processing' });
        const stream = onDelta ? (delta: string) => {
          if (!receiving) { receiving = true; onProgress?.({ stage: 'receiving' }); }
          onDelta(delta);
          if (tool === 'related') {
            partialText += delta;
            pendingTopics = structuredPreview('related', partialText).topics || [];
            pendingTopics.forEach(lookup);
          }
        } : undefined;
        return providerId === 'gemini' ? callGemini(key, model, prompt, signal, 1, true, stream, connected) : callCompatible(providerId, key, model, prompt, signal, stream, connected);
      }, controller.signal);
      if (result.topics?.length) {
        pendingTopics = result.topics;
        pendingTopics.forEach(lookup);
        referenceProgress();
        result.topics = await Promise.all(pendingTopics.map(topic => references.get(topic.title)!));
        controller.signal.throwIfAborted();
      }
      await saveAnswer({
        key: cacheKey, at: Date.now(), tool, provider: providers[providerId].name,
        title: sources.length === 1 ? sources[0].title : `${sources.length} pages`, result,
      }).catch(() => {});
      return result;

    } finally {
      callerSignal?.removeEventListener('abort', cancelFromCaller);
      jobs.delete(id);
    }
  }

  throw new Error('Unsupported AI action.');
}
