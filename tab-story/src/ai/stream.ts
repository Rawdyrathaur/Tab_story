export type TextDelta = (text: string) => void;
type StreamEvent = {
  error?: { message?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  choices?: { finish_reason?: string; delta?: { content?: unknown } }[];
};

// SSE frames can span network chunks. Decode incrementally, never expose thoughts.
export async function readEventStream(response: Response, receive: (data: StreamEvent) => void, signal?: AbortSignal) {
  if (!response.body) throw new Error('The provider returned no response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  const frame = (value: string) => {
    const data = value.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    if (data.trim() === '[DONE]') { finished = true; return; }
    const parsed = JSON.parse(data) as StreamEvent;
    if (parsed?.error) throw new Error(typeof parsed.error.message === 'string' ? parsed.error.message : 'The provider stopped the response.');
    receive(parsed);
  };
  try {
    while (!finished) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 1000000) throw new Error('The provider response frame is too large.');
      let separator: RegExpExecArray | null;
      while ((separator = /\r?\n\r?\n/.exec(buffer))) {
        frame(buffer.slice(0, separator.index));
        buffer = buffer.slice(separator.index + separator[0].length);
        if (finished) break;
      }
      if (done) { if (buffer.trim() && !finished) frame(buffer); break; }
    }
    signal?.throwIfAborted();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function visibleText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter(part => part?.type === 'text' && typeof part.text === 'string').map(part => part.text).join('');
}
