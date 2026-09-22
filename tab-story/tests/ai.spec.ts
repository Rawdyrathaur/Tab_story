import { test, expect } from '@playwright/test';
import { handleAI } from '../src/ai/background';
import { resolveLocale, getDirection } from '../src/i18n/core';
import { summarizeArticle, splitArticle } from '../src/ai/summary';

test('Gemini connects, keeps key out of prompts, generates from sources and forgets the key', async () => {
  const sessionStore: Record<string, unknown> = {};
  const localStore: Record<string, unknown> = {};
  const calls: { url: string; body: string }[] = [];
  let generationAttempts = 0;
  const previousFetch = globalThis.fetch;
  const previousChrome = globalThis.chrome;
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime: { id: 'test-extension' }, storage: {
    session: {
      setAccessLevel: async () => {}, get: async () => sessionStore,
      set: async (value: object) => Object.assign(sessionStore, value), remove: async (keys: string | string[]) => { for (const key of [keys].flat()) delete sessionStore[key]; },
    },
    local: {
      get: async () => localStore,
      set: async (value: object) => Object.assign(localStore, value),
      remove: async (keys: string[]) => keys.forEach((key) => delete localStore[key]),
    },
  } } });
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: String(options?.body || '') });
    if (String(url).includes('generateContent')) {
      generationAttempts += 1;
      if (generationAttempts === 1) {
        return new Response(JSON.stringify({ error: { message: 'This model is currently experiencing high demand.' } }), { status: 503 });
      }
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'A concise summary of the article.' }] } }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ models: [{ name: 'models/gemini-test-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 });
  };
  try {
    const key = 'test-only-key-not-real-12345678';
    expect(await handleAI({ operation: 'connect', key })).toEqual({
      models: ['gemini-test-flash'],
      selectedModel: 'gemini-test-flash',
      provider: 'Google Gemini',
      providerId: 'gemini',
    });
    const result = await handleAI({ operation: 'generate', model: '', id: 'test-request', language: 'fr', query: 'Summarize', sources: [{ title: 'Source', text: 'Supported source evidence. '.repeat(10), url: 'https://example.com', truncated: false }] });
    expect(result.text).toContain('summary');
    expect(generationAttempts).toBe(2);
    expect(calls[1].body).toContain('article');
    expect(calls.every(call => !call.url.includes(key) && !call.body.includes(key))).toBe(true);
    await handleAI({ operation: 'forget' });
    expect(await handleAI({ operation: 'status' })).toEqual({ configured: false });
    await expect(handleAI({ operation: 'generate' })).rejects.toThrow('Connect your AI provider');
  } finally { globalThis.fetch = previousFetch; Object.defineProperty(globalThis, 'chrome', { configurable: true, value: previousChrome }); }
});

test('Gemini connection rejects an invalid key instead of saving a false connected state', async () => {
  const store: Record<string, unknown> = {};
  const previousFetch = globalThis.fetch;
  const previousChrome = globalThis.chrome;
  Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { session: {
    setAccessLevel: async () => {}, get: async () => store,
    set: async (value: object) => Object.assign(store, value), remove: async (key: string) => { delete store[key]; },
  } } } });
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { message: 'API key not valid. Please pass a valid API key.' },
  }), { status: 400 });
  try {
    await expect(handleAI({ operation: 'connect', key: 'invalid-key-value' })).rejects.toThrow('API key not valid');
    expect(Object.keys(store).some((key) => key.includes('Key'))).toBe(false);
  } finally {
    globalThis.fetch = previousFetch;
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: previousChrome });
  }
});

test('profile locales are preserved beyond the bundled languages', () => {
  expect(resolveLocale('ja-JP', ['en-US'])).toBe('ja-JP');
  expect(resolveLocale('fr-CA', ['hi-IN'])).toBe('fr-CA');
  expect(getDirection('ur-PK')).toBe('rtl');
});


test('long articles summarize every chunk then combine without sending URLs', async () => {
  const text = 'An article detail that belongs in the summary. '.repeat(800) + ' https://private.example/secret';
  const calls: string[] = [];
  const result = await summarizeArticle(text, 'en', '', async prompt => {
    calls.push(prompt);
    return { text: 'Condensed article notes.', incomplete: false };
  }, new AbortController().signal);
  expect(result.chunkCount).toBe(splitArticle(text).length);
  expect(calls.length).toBe(result.chunkCount + 1);
  expect(calls.every(prompt => !prompt.includes('https://private.example'))).toBe(true);
  expect(calls.at(-1)).toContain('Condensed article notes.');
});

for (const provider of ['groq', 'openrouter', 'mistral']) {
  test(`${provider} verifies, generates with its own key, and disconnects`, async () => {
    const session: Record<string, unknown> = {};
    const local: Record<string, unknown> = {};
    const previousFetch = globalThis.fetch;
    const previousChrome = globalThis.chrome;
    const calls: { url: string; auth: string; body: string }[] = [];
    const storage = (data: Record<string, unknown>) => ({
      get: async () => data, set: async (values: object) => Object.assign(data, values),
      remove: async (keys: string | string[]) => { for (const key of [keys].flat()) delete data[key]; }, setAccessLevel: async () => {},
    });
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { storage: { session: storage(session), local: storage(local) } } });
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), auth: new Headers(options?.headers).get('Authorization') || '', body: String(options?.body) });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'A useful summary.' }, finish_reason: 'stop' }] }), { status: 200 });
    };
    try {
      const key = 'test-key-for-' + provider;
      const connected = await handleAI({ operation: 'connect', provider, key });
      expect(connected.providerId).toBe(provider);
      expect((await handleAI({ operation: 'status' })).configured).toBe(true);
      const answer = await handleAI({ operation: 'generate', providerId: 'gemini', id: 'provider-test', language: 'en', sources: [{ url: 'https://example.com', text: 'Supported article information. '.repeat(10) }] });
      expect(answer.text).toContain('summary');
      const host = { groq: 'api.groq.com', openrouter: 'openrouter.ai', mistral: 'api.mistral.ai' }[provider];
      expect(calls).toHaveLength(2);
      expect(calls.every(call => new URL(call.url).host === host && call.auth === 'Bearer ' + key && !call.body.includes(key))).toBe(true);
      expect(JSON.stringify(local)).not.toContain(key);
      await handleAI({ operation: 'forget' });
      expect(await handleAI({ operation: 'status' })).toEqual({ configured: false });
      expect(Object.values(session)).not.toContain(key);
      globalThis.fetch = async () => new Response('{}', { status: 401 });
      await expect(handleAI({ operation: 'connect', provider, key })).rejects.toThrow('check your API key');
      expect(await handleAI({ operation: 'status' })).toEqual({ configured: false });
    } finally { globalThis.fetch = previousFetch; Object.defineProperty(globalThis, 'chrome', { configurable: true, value: previousChrome }); }
  });
}
