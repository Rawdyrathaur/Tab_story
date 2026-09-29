import { readEventStream, visibleText, type TextDelta } from './stream';

export const providers = {
  groq: { name: 'Groq', badge: 'Free plan', keyUrl: 'https://console.groq.com/keys', description: 'Free plan with rate limits.', endpoint: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b', maxOutputTokens: 3072 },
  cerebras: { name: 'Cerebras', badge: 'Fast · larger context', keyUrl: 'https://cloud.cerebras.ai/', description: 'Fast streaming with a large context window; free-tier limits apply.', endpoint: 'https://api.cerebras.ai/v1', model: 'gpt-oss-120b', maxOutputTokens: 4096 },
  gemini: { name: 'Google Gemini', badge: 'Free-tier fallback', keyUrl: 'https://aistudio.google.com/apikey', description: 'Free tier on eligible models; quotas apply.', maxOutputTokens: 4096 },
} as const;
export type ProviderId = keyof typeof providers;
export function isProvider(value: string): value is ProviderId { return Object.hasOwn(providers, value); }
export class ProviderRequestError extends Error {
  readonly code: string;
  constructor(message: string, code: string) { super(message); this.name = 'ProviderRequestError'; this.code = code; }
}

export async function verifyCompatibleKey(provider: Exclude<ProviderId, 'gemini'>, key: string): Promise<void> {
  const config = providers[provider];
  const response = await fetch(config.endpoint + '/models', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(15000),
    credentials: 'omit',
    redirect: 'error',
  });
  if (response.status === 401 || response.status === 403) throw new ProviderRequestError(`${config.name}: check your API key and account access.`, 'AI_AUTH');
  if (response.status === 429) throw new ProviderRequestError(`${config.name}: rate limit reached during key verification. Retry later.`, 'AI_QUOTA');
  if (!response.ok) throw new ProviderRequestError(`${config.name}: could not verify this key (HTTP ${response.status}).`, 'AI_PROVIDER');
  if (provider === 'cerebras') {
    const models = await response.json() as { data?: { id?: string }[] };
    if (!models.data?.some(model => model.id === config.model)) throw new ProviderRequestError(`${config.name}: the selected model is not available to this account.`, 'AI_MODEL');
  }
}

export async function callCompatible(provider: Exclude<ProviderId, 'gemini'>, key: string, model: string, prompt: string, signal: AbortSignal, onDelta?: TextDelta, onConnected?: () => void) {
  const config = providers[provider];
  if (model !== config.model) {
    throw new ProviderRequestError('Reconnect this provider to select its supported model.', 'AI_MODEL');
  }
  let response: Response;
  try {
    response = await fetch(config.endpoint + '/chat/completions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: config.maxOutputTokens,
        stream: Boolean(onDelta),
        ...(provider === 'groq' ? { reasoning_effort: 'low', include_reasoning: false } : { reasoning_effort: 'low', reasoning_format: 'hidden' }),
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
      credentials: 'omit',
      redirect: 'error',
    });
  } catch {
    if (signal.aborted) throw signal.reason || new DOMException('Request cancelled.', 'AbortError');
    throw new ProviderRequestError(`${config.name} could not be reached or timed out. Try again.`, 'AI_UNAVAILABLE');
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new ProviderRequestError(`${config.name}: check your API key and account access.`, 'AI_AUTH');
    if (response.status === 402) throw new ProviderRequestError(`${config.name}: this account needs credits or billing. Try another provider.`, 'AI_CREDITS_REQUIRED');
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'));
      throw new ProviderRequestError(`${config.name}: quota or rate limit reached.${Number.isFinite(seconds) && seconds > 0 ? ` Retry in about ${Math.ceil(seconds)} seconds.` : ' Retry later.'}`, 'AI_QUOTA');
    }
    if (response.status === 404) throw new ProviderRequestError(`${config.name}: this model is no longer available. Choose another provider or reconnect.`, 'AI_MODEL');
    if ([408, 500, 502, 503, 504].includes(response.status)) throw new ProviderRequestError(`${config.name} is temporarily unavailable. Try again shortly.`, 'AI_UNAVAILABLE');
    throw new Error(`${config.name} request failed (HTTP ${response.status}).`);
  }
  onConnected?.();
  if (onDelta) {
    let text = '';
    let incomplete = false;
    let ended = false;
    await readEventStream(response, data => {
      const choice = data.choices?.[0];
      const delta = visibleText(choice?.delta?.content);
      if (delta) {
        text += delta;
        if (text.length > 64000) throw new Error('The provider response is too large.');
        onDelta(delta);
      }
      if (choice?.finish_reason) { ended = true; incomplete ||= choice.finish_reason !== 'stop'; }
    }, signal);
    if (!text.trim()) throw new Error(`${config.name} returned no text. Try again.`);
    return { text, incomplete: incomplete || !ended };
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  const text = visibleText(choice?.message?.content);
  if (!text.trim()) throw new Error(`${config.name} returned no text. Try again.`);
  return { text, incomplete: choice.finish_reason !== 'stop' };
}
