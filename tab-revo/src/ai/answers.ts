import { PROMPT_VERSION, type ToolId, type runTool } from './summary';
import type { ChatMessage } from './service';

type AnswerResult = Awaited<ReturnType<typeof runTool>>;
export type SavedAnswer = {
  key: string;
  version?: number;
  at: number;
  tool: ToolId;
  provider: string;
  title: string;
  result: AnswerResult;
};

const STORAGE_KEY = 'tabStory.aiAnswers.v1';
const SAVE_KEY = 'tabStory.aiSaveAnswers';
const TTL = 7 * 24 * 60 * 60 * 1000;

export async function answersEnabled(): Promise<boolean> {
  return (await chrome.storage.local.get(SAVE_KEY))[SAVE_KEY] !== false;
}

export async function setAnswersEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [SAVE_KEY]: enabled });
  if (!enabled) await chrome.storage.local.remove(STORAGE_KEY);
}

export async function recentAnswers(): Promise<SavedAnswer[]> {
  if (!await answersEnabled()) return [];
  const raw = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (!Array.isArray(raw)) return [];
  const entries = raw.filter((entry): entry is SavedAnswer =>
    entry && typeof entry.key === 'string' && typeof entry.at === 'number' &&
    entry.at <= Date.now() && Date.now() - entry.at < TTL &&
    typeof entry.tool === 'string' && typeof entry.provider === 'string' &&
    entry.result && typeof entry.result === 'object' && Array.isArray(entry.result.sources)
  ).sort((a, b) => b.at - a.at).slice(0, 30);
  if (entries.length !== raw.length) await chrome.storage.local.set({ [STORAGE_KEY]: entries });
  return entries;
}

export async function answerKey(parts: { sources: { text: string; title: string; url?: string }[]; tool: ToolId; question: string; language: string; provider: string; model: string; history?: ChatMessage[] }): Promise<string> {
  const payload = JSON.stringify({ version: PROMPT_VERSION, ...parts });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function saveAnswer(entry: SavedAnswer): Promise<void> {
  if (!await answersEnabled()) return;
  const entries = [{ ...entry, version: PROMPT_VERSION }, ...(await recentAnswers()).filter(item => item.key !== entry.key)].slice(0, 30);
  while (entries.length && JSON.stringify(entries).length > 750000) entries.pop();
  await chrome.storage.local.set({ [STORAGE_KEY]: entries });
}

export async function clearAnswers(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
