import { providers, isProvider, callCompatible } from './providers';
import type { Source } from './service';
import { summarizeArticle } from './summary';
const jobs = new Map<string, AbortController>();

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

function geminiError(status: number, detail: string, action = 'request'): Error {
  if (status === 429) {
    return new AIError('Your free Gemini API quota has been reached.', 'AI_QUOTA');
  }
  if ([408, 500, 502, 503, 504].includes(status)) {
    return new AIError(
      detail || 'Gemini is temporarily unavailable after several attempts.',
      'AI_UNAVAILABLE'
    );
  }
  if ([400, 401, 403].includes(status)) {
    return new Error(`Gemini ${action} failed: ${detail || 'Check the API key, project permissions, billing, and region availability.'}`);
  }
  return new Error(`Gemini ${action} failed (${status}): ${detail || 'Please retry later.'}`);
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
  const preferred = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
  ];
  const flashModels = models.filter((name) => /(?:^|-)flash(?:-|$)/i.test(name));
  return preferred.find((name) => flashModels.includes(name)) ||
    flashModels
      .filter((name) => !/(preview|exp|lite|latest)/i.test(name))
      .sort((a, b) => {
        const version = (name: string) => {
          const match = name.match(/^gemini-(\d+)(?:\.(\d+))?-flash$/i);
          return match ? Number(match[1]) * 1000 + Number(match[2] || 0) : 0;
        };
        return version(b) - version(a);
      })[0] ||
    flashModels.find((name) => !/lite/i.test(name)) ||
    flashModels[0] || '';
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
      !/(image|audio|live|tts|transcribe|embedding|aqa)/i.test(name)))];
}

async function protectStorage() {
  try {
    await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch {
    // Session storage access level not supported in some contexts
  }
}

async function extract(tabId: number, expectedUrl: string) {
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
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {
          const current = (document.querySelector('main, [role="main"]') as HTMLElement | null)?.innerText || '';
          stable = current === previous ? stable + 1 : 0;
          previous = current;
          if (current.trim().length >= 80 && stable >= 3) break;
          await new Promise(resolve => setTimeout(resolve, 350));
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
  if (snapshot?.url !== expectedUrl) throw new Error('The selected page changed while reading it. Retry from its saved tab.');
  if (!snapshot?.html) throw new Error('This page could not be read. Reload it and try again.');
  if (snapshot.html.length > 8000000) throw new Error('This page is too large to process. Open its article or reader view first.');
  return snapshot;
}

const GEMINI_SESSION_KEY = 'tabStory.sessionKey_gemini';

async function resolveTarget(url: string): Promise<number> {
  const targetUrl = new URL(url);
  if (!/^https?:$/.test(targetUrl.protocol)) throw new Error('Select a normal webpage to summarize.');
  const origin = `${targetUrl.protocol}//${targetUrl.hostname}/*`;
  if (!await chrome.permissions.contains({ origins: [origin] })) {
    throw new Error('Allow access to the selected website before summarizing.');
  }
  const openTabs = await chrome.tabs.query({});
  const matches = openTabs.filter(tab => tab.url === targetUrl.href);
  let tab: chrome.tabs.Tab | undefined = matches.find(tab => tab.active) || matches[0];
  if (!tab) tab = await chrome.tabs.create({ url: targetUrl.href, active: false });
  if (!tab.id) throw new Error('The selected tab could not be opened.');
  const tabId = tab.id;
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(updated);
      chrome.tabs.onRemoved.removeListener(removed);
      if (error) reject(error); else resolve();
    };
    const updated = (id: number, change: { status?: string }) => {
      if (id === tabId && change.status === 'complete') finish();
    };
    const removed = (id: number) => {
      if (id === tabId) finish(new Error('The selected tab was closed before it could be read.'));
    };
    const timer = setTimeout(() => finish(new Error('The selected page is still loading. Wait for it to finish and retry.')), 25000);
    chrome.tabs.onUpdated.addListener(updated);
    chrome.tabs.onRemoved.addListener(removed);
    void chrome.tabs.get(tabId).then(current => {
      if (current.status === 'complete' && !current.discarded) finish();
      else if (current.discarded) void chrome.tabs.reload(tabId).catch(cause => finish(new Error('The selected tab could not be loaded.', { cause })));
    }, cause => finish(new Error('The selected tab is no longer available.', { cause })));
  });
  const loaded = await chrome.tabs.get(tabId);
  if (!loaded.url || new URL(loaded.url).origin !== targetUrl.origin) {
    throw new Error('The selected page redirected to another site. Open and save the final page, then summarize that tab.');
  }
  return tabId;
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
  await chrome.storage.session.remove([GEMINI_SESSION_KEY, 'tabStory.geminiKey', 'tabStory.aiKey.groq', 'tabStory.aiKey.openrouter', 'tabStory.aiKey.mistral']);
  await chrome.storage.local.remove([
    'tabStory.vaultKey_gemini', 'tabStory.vaultKey_groq',
    'tabStory.vaultKey_openrouter', 'tabStory.vaultKey_openai',
    'tabStory.activeAIProvider', 'tabStory.activeAIProviderId', 'tabStory.aiModel',
  ]);
}

// --- CALLERS FOR PROVIDERS ---

async function callGemini(
  key: string,
  model: string,
  prompt: string,
  signal?: AbortSignal,
  retriesRemaining = 2,
  allowModelFallback = true
) {
  if (!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model)) {
    throw new Error('No compatible Gemini text model is selected. Reconnect your API key.');
  }
  const cleanModel = model;
  // Google Gemini API authenticates via secure x-goog-api-key header
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(endpoint, {
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

  if (!response.ok) {
    const detail = await responseError(response);
    const transient = [408, 500, 502, 503, 504].includes(response.status);
    if (transient && retriesRemaining > 0) {
      const delay = retriesRemaining === 2 ? 700 : 1500;
      await waitForRetry(delay, signal);
      return callGemini(key, cleanModel, prompt, signal, retriesRemaining - 1, allowModelFallback);
    }

    if ((response.status === 404 || transient) && allowModelFallback) {
      const recommended = response.status === 404
        ? detail.match(/models\/(gemini-[a-zA-Z0-9._-]*flash[a-zA-Z0-9._-]*)/i)?.[1]
        : undefined;
      if (recommended && recommended !== cleanModel && /^gemini-[a-zA-Z0-9._-]{1,100}$/.test(recommended)) {
        await chrome.storage.local.set({ 'tabStory.aiModel': recommended });
        return callGemini(key, recommended, prompt, signal, 1, false);
      }
      const alternatives = (await listGeminiTextModels(key, 'model refresh'))
        .filter((available) => available !== cleanModel);
      const replacement = chooseGeminiModel(alternatives);
      if (replacement && replacement !== cleanModel) {
        await chrome.storage.local.set({ 'tabStory.aiModel': replacement });
        return callGemini(key, replacement, prompt, signal, 1, false);
      }
    }
    throw geminiError(response.status, detail);
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

  return { text, incomplete: candidate.finishReason === 'MAX_TOKENS' };
}

// --- MAIN AI HANDLER ---

export async function handleAI(request: Record<string, unknown>) {
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
      return { configured: false };
    }

    return {
      configured: true,
      provider: activeName || (activeId === 'gemini' ? 'Google Gemini' : activeId),
      providerId: activeId,
      model: (activeData['tabStory.aiModel'] as string) || '',
    };
  }

  // 2. FORGET / DISCONNECT
  if (operation === 'forget') {
    await clearAllKeys();
    for (const job of jobs.values()) job.abort();
    return { ok: true };
  }

  // 3. CANCEL JOB
  if (operation === 'cancel') {
    jobs.get(String(request.id))?.abort();
    return { ok: true };
  }

  // 4. EXTRACT SOURCES
  if (operation === 'sources') {
    const tabId = request.tabId;
    if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0 || typeof request.url !== 'string') {
      throw new Error('Invalid browser tab. Open the page and try again.');
    }
    return { snapshot: await extract(tabId, request.url) };
  }

  if (operation === 'target') {
    if (typeof request.url !== 'string' || request.url.length > 10000) throw new Error('Invalid target page.');
    return { tabId: await resolveTarget(request.url) };
  }

  // 5. CONNECT & VERIFY KEY
  if (operation === 'connect') {
    const providerId = String(request.provider || 'gemini').toLowerCase();
    const key = typeof request.key === 'string' ? request.key.trim().replace(/^["']|["']$/g, '') : '';

    if (key.length < 8) {
      throw new Error('Please enter a valid API key.');
    }

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
      try {
        if (chrome.storage?.local?.set) {
          await chrome.storage.local.set({
            'tabStory.activeAIProvider': 'Google Gemini',
            'tabStory.activeAIProviderId': 'gemini',
            'tabStory.aiModel': defaultModel,
          });
        }
      } catch {
        // ignore
      }

      return { models: availableModels, selectedModel: defaultModel, provider: 'Google Gemini', providerId: 'gemini' };
    }

    if (isProvider(providerId) && providerId !== 'gemini') {
      await callCompatible(providerId, key, 'Reply with OK.', new AbortController().signal, true);
      await chrome.storage.session.set({ ['tabStory.aiKey.' + providerId]: key });
      const config = providers[providerId];
      await chrome.storage.local.set({ 'tabStory.activeAIProvider': config.name, 'tabStory.activeAIProviderId': providerId, 'tabStory.aiModel': config.model });
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

    const sources = request.sources as Source[];
    if (!Array.isArray(sources) || !sources.length || sources.length > 5 || sources.some((s) => !s || typeof s.text !== 'string' || s.text.length < 80 || s.text.length > 240000 || typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url))) {
      throw new Error('Provide readable tab content before asking AI.');
    }

    const query = String(request.query || '').slice(0, 600);
    const language = String(request.language || 'en').slice(0, 40);
    const model = String(stored['tabStory.aiModel'] || request.model || '');
    const id = String(request.id || '');

    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new Error('Invalid AI request identifier.');
    if (jobs.has(id) || jobs.size >= 1) throw new Error('Another AI request is running. Wait or cancel it.');

    const controller = new AbortController();
    jobs.set(id, controller);

    try {
      const text = sources.map(source => source.text).join('\n\n');
      return await summarizeArticle(text, language, query, async (prompt) => {
        controller.signal.throwIfAborted();
        return providerId === 'gemini' ? callGemini(key, model, prompt, controller.signal) : callCompatible(providerId, key, prompt, controller.signal);
      }, controller.signal);

    } finally {
      jobs.delete(id);
    }
  }

  throw new Error('Unsupported AI action.');
}
