export const providers = {
  gemini: { name: 'Google Gemini', badge: 'Free tier', keyUrl: 'https://aistudio.google.com/apikey', description: 'Free tier on eligible models; quotas apply.' },
  groq: { name: 'Groq', badge: 'Free plan', keyUrl: 'https://console.groq.com/keys', description: 'Free plan with rate limits.', endpoint: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openrouter: { name: 'OpenRouter', badge: 'Free models', keyUrl: 'https://openrouter.ai/settings/keys', description: 'Uses the free model router; availability and limits vary.', endpoint: 'https://openrouter.ai/api/v1', model: 'openrouter/free' },
  mistral: { name: 'Mistral', badge: 'Free mode', keyUrl: 'https://console.mistral.ai/api-keys', description: 'Enable Free mode in Mistral Studio; quotas apply.', endpoint: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
} as const;
export type ProviderId = keyof typeof providers;
export function isProvider(value: string): value is ProviderId { return Object.hasOwn(providers, value); }
export async function callCompatible(provider: Exclude<ProviderId, 'gemini'>, key: string, prompt: string, signal: AbortSignal, verify = false) {
  const config = providers[provider];
  const response = await fetch(config.endpoint + '/chat/completions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: prompt }], max_tokens: verify ? 8 : 1024, stream: false }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error(`${config.name}: check your API key and account access.`);
    if (response.status === 429) throw new Error(`${config.name}: quota or rate limit reached. Retry later.`);
    throw new Error(`${config.name} request failed (HTTP ${response.status}).`);
  }
  const data = await response.json();
  const choice = data.choices?.[0];
  if (typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) throw new Error(`${config.name} returned no text. Try again.`);
  return { text: choice.message.content as string, incomplete: choice.finish_reason === 'length' };
}
