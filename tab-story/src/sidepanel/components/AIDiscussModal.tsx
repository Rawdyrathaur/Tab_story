import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import {
  ArrowPathIcon, ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, ChevronDownIcon,
  DocumentTextIcon, GlobeAltIcon, LanguageIcon, LightBulbIcon, LinkIcon, ListBulletIcon,
  MagnifyingGlassIcon, PaperAirplaneIcon, Squares2X2Icon, XMarkIcon,
} from '@heroicons/react/24/outline';
import type { SavedTab } from '../db';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { AIRequestError, aiGenerate, aiRequest, parseArticle, type ChatMessage, type Source } from '../../ai/service';
import { PROMPT_VERSION, evidenceText, structuredPreview, verifiedDataItems, type CitationEvidence, type RelatedTopic, type ToolId } from '../../ai/summary';
import type { SavedAnswer } from '../../ai/answers';
import { AISettingsCard } from './AISettingsCard';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const tools: { id: ToolId; title: string; description: string; icon: Icon }[] = [
  { id: 'summarize', title: 'Summary', description: 'The essentials', icon: DocumentTextIcon },
  { id: 'keypoints', title: 'Key points', description: 'What matters most', icon: ListBulletIcon },
  { id: 'simple', title: 'Explain simply', description: 'In everyday words', icon: LightBulbIcon },
  { id: 'extract', title: 'Extract data', description: 'Facts & figures', icon: MagnifyingGlassIcon },
  { id: 'translate', title: 'Translate summary', description: 'In your language', icon: LanguageIcon },
  { id: 'related', title: 'Related topics', description: 'Reference links', icon: LinkIcon },
];
const languages = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Arabic', 'Urdu', 'Portuguese', 'Japanese'];
type SourceView = { title: string; domain: string; url: string; status: 'idle' | 'reading' | 'ready' | 'failed'; id?: string; detail?: string; trimmed?: boolean };
type Result = {
  text: string; cachedAt?: number; incomplete?: boolean; trimmed?: boolean; contextTrimmed?: boolean; formatWarning?: boolean;
  items?: { label: string; value: string; source: string; note: string }[];
  topics?: RelatedTopic[];
  evidence?: CitationEvidence[];
  sources?: { id: string; title: string; domain: string; url: string; trimmed: boolean }[];
};
type Turn = { id: string; question: string; result: Result | null; urls: string[]; error?: string; pending?: boolean };
type Action = { tool: ToolId; question: string; turnId?: string };

function safeUrl(value?: string): string {
  try { const url = new URL(value || ''); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

function evidenceUrl(value: string | undefined, quote: string): string {
  const safe = safeUrl(value);
  if (!safe || !quote.trim()) return '';
  const url = new URL(safe);
  url.hash = `:~:text=${encodeURIComponent(quote.trim().replace(/\s+/gu, ' ').slice(0, 160)).replace(/-/g, '%2D')}`;
  return url.href;
}

function SiteIcon({ url, reference = false }: { url: string; reference?: boolean }) {
  const [failedUrl, setFailedUrl] = useState('');
  if (failedUrl === url || !safeUrl(url)) return <GlobeAltIcon className="pwa-ai-site-icon" aria-hidden="true" />;
  const parsed = new URL(url);
  const icon = reference ? parsed.hostname === 'en.wikipedia.org' ? 'https://en.wikipedia.org/static/favicon/wikipedia.ico' : `${parsed.origin}/favicon.ico`
    : `${chrome.runtime.getURL('_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=32`;
  return <img className="pwa-ai-site-icon" src={icon} referrerPolicy="no-referrer" alt="" onError={() => setFailedUrl(url)} />;
}

function Citation({ id, urls }: { id: string; urls: string[] }) {
  const url = safeUrl(urls[Number(id.replace('S', '')) - 1]);
  if (!url) return <span className="pwa-ai-note">[{id}]</span>;
  const domain = new URL(url).hostname.replace(/^www\./, '');
  return <a className="pwa-ai-citation" href={url} target="_blank" rel="noreferrer" title={`Open source ${id}: ${url}`}><SiteIcon url={url} /><span>{domain}</span></a>;
}

function InlineAnswer({ value, urls, onCitation, activeCitation }: { value: string; urls: string[]; onCitation?: (id: string) => void; activeCitation?: string }) {
  const parts = value.split(/(\[S[1-5]\]|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return <>{parts.map((part, index) => {
    const citation = /^\[(S[1-5])\]$/.exec(part);
    if (citation) return onCitation
      ? <button key={index} type="button" className="pwa-ai-cite-marker" aria-label={`Show source ${citation[1].slice(1)} for this point`} aria-expanded={activeCitation === citation[1]} onClick={() => onCitation(citation[1])}>{citation[1].slice(1)}</button>
      : <Citation key={index} id={citation[1]} urls={urls} />;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

function SourceNote({ id, claim, urls, evidence, sources }: { id: string; claim: string; urls: string[]; evidence: CitationEvidence[]; sources: NonNullable<Result['sources']> }) {
  const url = safeUrl(urls[Number(id.slice(1)) - 1]);
  const source = sources.find(item => item.id === id);
  const match = evidence.find(item => item.source === id && item.claim === claim);
  const destination = match?.quote ? evidenceUrl(url, match.quote) || url : url;
  return <aside className="pwa-ai-source-note" aria-label={`Source ${id.slice(1)}`}>
    <div className="pwa-ai-source-note-heading"><SiteIcon url={url} /><span>{source?.title || (url ? new URL(url).hostname : `Source ${id.slice(1)}`)}</span></div>
    {match?.section && <small>Section · {match.section}</small>}
    {match?.quote ? <blockquote>{match.quote}</blockquote> : <p>Matching passage not found in this page snapshot. Check the source before relying on this point.</p>}
    {url && <a href={destination} target="_blank" rel="noreferrer">{match?.quote ? 'Open highlighted passage' : 'Open source page'}<ArrowTopRightOnSquareIcon /></a>}
  </aside>;
}

function tableCells(value: string): string[] | null {
  const line = value.trim();
  if (!line.includes('|')) return null;
  const cells = line.replace(/^\|/u, '').replace(/\|$/u, '').split(/(?<!\\)\|/u).map(cell => cell.trim());
  return cells.length >= 2 && cells.length <= 5 ? cells : null;
}

function AnswerText({ value, urls, evidence = [], sources = [] }: { value: string; urls: string[]; evidence?: CitationEvidence[]; sources?: NonNullable<Result['sources']> }) {
  const [selected, setSelected] = useState<{ line: number; id: string } | null>(null);
  const blocks: ReactNode[] = [];
  let list: { value: string; line: number }[] = [];
  let code: string[] | null = null;
  const toggle = (line: number, id: string) => setSelected(current => current?.line === line && current.id === id ? null : { line, id });
  const renderLine = (content: string, line: number) => <>
    <InlineAnswer value={content} urls={urls} onCitation={id => toggle(line, id)} activeCitation={selected?.line === line ? selected.id : undefined} />
    {selected?.line === line && <SourceNote id={selected.id} claim={content} urls={urls} evidence={evidence} sources={sources} />}
  </>;
  const flush = () => {
    if (!list.length) return;
    const items = list;
    blocks.push(<ul key={`list-${blocks.length}`}>{items.map(item => <li key={item.line}>{renderLine(item.value, item.line)}</li>)}</ul>);
    list = [];
  };
  const lines = value.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const currentLine = lineIndex;
    const raw = lines[currentLine];
    const line = raw.trim();
    if (line.startsWith('```')) {
      flush();
      if (code) { blocks.push(<pre key={blocks.length}><code>{code.join('\n')}</code></pre>); code = null; } else code = [];
      continue;
    }
    if (code) { code.push(raw); continue; }
    if (!line) { flush(); continue; }
    const headings = tableCells(line);
    const separator = tableCells(lines[currentLine + 1] || '');
    if (headings && separator?.length === headings.length && separator.every(cell => /^:?-{3,}:?$/u.test(cell))) {
      const rows: { cells: string[]; line: number; raw: string }[] = [];
      let next = currentLine + 2;
      while (next < lines.length) {
        const cells = tableCells(lines[next]);
        if (!cells || cells.length !== headings.length) break;
        rows.push({ cells, line: next, raw: lines[next].trim() });
        next++;
      }
      if (rows.length) {
        flush();
        blocks.push(<div key={`table-${currentLine}`} className="pwa-ai-table-list" role="list" aria-label={`AI answer: ${headings.join(', ')}`}>
          {rows.map(row => <div key={row.line} className="pwa-ai-table-row" role="listitem">
            <strong><InlineAnswer value={row.cells[0]} urls={urls} onCitation={id => toggle(row.line, id)} activeCitation={selected?.line === row.line ? selected.id : undefined} /></strong>
            <dl>{row.cells.slice(1).map((cell, index) => <div key={index}><dt>{headings[index + 1]}</dt><dd><InlineAnswer value={cell} urls={urls} onCitation={id => toggle(row.line, id)} activeCitation={selected?.line === row.line ? selected.id : undefined} /></dd></div>)}</dl>
            {selected?.line === row.line && <SourceNote id={selected.id} claim={row.raw} urls={urls} evidence={evidence} sources={sources} />}
          </div>)}
        </div>);
        lineIndex = next - 1;
        continue;
      }
    }
    const bullet = /^(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
    if (bullet) { list.push({ value: bullet[1], line: currentLine }); continue; }
    flush();
    const heading = /^#{1,6}\s+(.+)$/.exec(line);
    blocks.push(heading
      ? <div key={currentLine}><h3><InlineAnswer value={heading[1]} urls={urls} onCitation={id => toggle(currentLine, id)} activeCitation={selected?.line === currentLine ? selected.id : undefined} /></h3>{selected?.line === currentLine && <SourceNote id={selected.id} claim={heading[1]} urls={urls} evidence={evidence} sources={sources} />}</div>
      : <div key={currentLine} className="pwa-ai-paragraph"><p><InlineAnswer value={line} urls={urls} onCitation={id => toggle(currentLine, id)} activeCitation={selected?.line === currentLine ? selected.id : undefined} /></p>{selected?.line === currentLine && <SourceNote id={selected.id} claim={line} urls={urls} evidence={evidence} sources={sources} />}</div>);
  }
  flush();
  if (code) blocks.push(<pre key={blocks.length}><code>{code.join('\n')}</code></pre>);
  return <div className="pwa-ai-answer" dir="auto">{blocks}</div>;
}

function answerValue(result: Result): string {
  return result.items ? result.items.map(item => `${item.label}: ${item.value}${item.source ? ` [${item.source}]` : ''}${item.note ? ` — ${item.note}` : ''}`).join('\n')
    : result.topics ? result.topics.map(topic => `${topic.title}: ${topic.why}${(topic.references?.length ? topic.references.map(reference => reference.url) : topic.url ? [topic.url] : []).map(url => `\n${url}`).join('')}`).join('\n') : result.text;
}

function Answer({ result, urls, provider }: { result: Result; urls: string[]; provider: string }) {
  const notes = [
    result.incomplete && 'This answer stopped early. Ask to continue, or retry.',
    result.formatWarning && 'The provider returned text instead of structured data.',
    result.trimmed && `Long pages were shortened to fit ${provider} limits.`,
    result.contextTrimmed && 'Older turns no longer fit the provider context. Recent turns were kept; restate earlier details if needed.',
  ].filter(Boolean);
  return <>
    {result.cachedAt && <p className="pwa-ai-note">Saved · {new Date(result.cachedAt).toLocaleString()}</p>}
    {result.items ? <>{urls.length === 1 && result.items.length > 0 && <p className="pwa-ai-data-source">Extracted from <Citation id="S1" urls={urls} /></p>}
      <dl className="pwa-ai-data">{result.items.length ? result.items.map((item, index) => {
        const evidence = evidenceUrl(urls[Number(item.source.slice(1)) - 1], item.value);
        return <div key={index}><dt>{item.label}</dt><dd>
          {evidence ? <a className="pwa-ai-evidence" href={evidence} target="_blank" rel="noreferrer" title="Open matching text in the selected source"><strong>{item.value}</strong><ArrowTopRightOnSquareIcon /></a> : <strong>{item.value}</strong>}
          {item.note && <small>{item.note}</small>}{urls.length > 1 && item.source && <Citation id={item.source} urls={urls} />}
        </dd></div>;
      }) : <div><dd>No directly supported data found in the selected pages.</dd></div>}</dl></>
      : result.topics ? <div className="pwa-ai-topics">{result.topics.length ? result.topics.map((topic, index) => {
        const references = topic.references?.length ? topic.references : topic.url ? [{ title: topic.referenceTitle || topic.title, url: topic.url, kind: 'page-link' as const }] : [];
        return <div key={index}><strong>{topic.title}</strong><p><InlineAnswer value={topic.why} urls={urls} /></p>
          {references.length ? <div className="pwa-ai-topic-links">{references.map(reference => {
            const url = safeUrl(reference.url);
            return url && <a key={url} href={url} target="_blank" rel="noreferrer" title={`${reference.title}\n${url}`}><SiteIcon url={url} reference /><span>{reference.kind === 'wikipedia' ? 'Wikipedia' : reference.kind === 'wikidata' ? 'Wikidata' : new URL(url).hostname.replace(/^www\./, '')}</span><ArrowTopRightOnSquareIcon /></a>;
          })}</div> : <small>{topic.referenceStatus === 'unavailable' ? 'No exact reference found' : 'Checking references…'}</small>}
        </div>;
      }) : <p>No related topics found.</p>}</div>
        : <AnswerText value={result.text} urls={urls} evidence={result.evidence} sources={result.sources} />}
    {result.contextTrimmed && <p className="pwa-ai-note">Context limit: older turns were shortened.</p>}
    {notes.length > 0 && <details className="pwa-ai-answer-details"><summary>Answer notes{result.incomplete ? ' · incomplete' : ''}</summary>{notes.map((note, index) => <p key={index}>{note}</p>)}</details>}
  </>;
}

function initialViews(tabs: SavedTab[]): SourceView[] {
  return tabs.map(tab => ({ title: tab.title || new URL(tab.url).hostname, domain: new URL(tab.url).hostname, url: tab.url, status: 'idle' }));
}

export function AIDiscussModal({ tabs, onClose }: { title: string; tabs: SavedTab[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  useDialogFocus(dialogRef);
  const abort = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const readIds = useRef(new Set<string>());
  const sourceCache = useRef(new Map<string, Source>());
  const chatSources = useRef<Source[] | null>(null);
  const followScroll = useRef(true);
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const [providerId, setProviderId] = useState('');
  const sourceTabs = useMemo(() => {
    const seen = new Set<string>();
    return tabs.filter(tab => {
      const url = safeUrl(tab.url);
      if (!url || seen.has(url)) return false;
      const parsed = new URL(url);
      if (parsed.hostname === 'chromewebstore.google.com' || (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore'))) return false;
      seen.add(url);
      return true;
    }).slice(0, providerId === 'groq' ? 3 : 5);
  }, [tabs, providerId]);
  const sourceKey = sourceTabs.map(tab => tab.url).join('\n');
  const selection = useRef(sourceKey);
  const [sourceViews, setSourceViews] = useState<SourceView[]>(() => initialViews(sourceTabs));
  const [usedUrls, setUsedUrls] = useState<string[]>([]);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [mode, setMode] = useState<'tools' | 'answer' | 'chat' | 'settings'>('tools');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [consented, setConsented] = useState(false);
  const [providerName, setProviderName] = useState('AI provider');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [showProviderOption, setShowProviderOption] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [thread, setThread] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [language, setLanguage] = useState(() => ({ hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German', ar: 'Arabic', ur: 'Urdu', pt: 'Portuguese', ja: 'Japanese' }[navigator.language.split('-')[0]] || 'English'));
  const [activeTool, setActiveTool] = useState<ToolId>('summarize');
  const [copied, setCopied] = useState('');
  const [recent, setRecent] = useState<SavedAnswer[]>([]);

  function stop() {
    abort.current?.abort();
    for (const id of readIds.current) void aiRequest('cancel', { id }).catch(() => {});
  }

  useEffect(() => {
    mounted.current = true;
    void aiRequest('status').then(status => {
      if (!mounted.current) return;
      setConfigured(status.configured === true); setConsented(status.consented === true);
      if (!status.configured || status.consented !== true) setMode('settings');
      if (typeof status.provider === 'string' && status.provider) setProviderName(status.provider);
      if (typeof status.providerId === 'string') setProviderId(status.providerId);
    }).catch(() => {
      if (!mounted.current) return;
      setConfigured(false); setMode('settings'); setError('AI service unavailable. Reload the extension.');
    });
    void aiRequest('recent').then(data => { if (mounted.current) setRecent(Array.isArray(data.entries) ? data.entries : []); }).catch(() => {});
    return () => { mounted.current = false; stop(); };
  }, []);

  useEffect(() => {
    if (selection.current === sourceKey) return;
    selection.current = sourceKey;
    stop(); sourceCache.current.clear(); chatSources.current = null;
    setSourceViews(initialViews(sourceTabs)); setThread([]); setResult(null); setUsedUrls([]); setLastAction(null);
    setMode(current => current === 'settings' ? current : 'tools');
  }, [sourceKey, sourceTabs]);

  useEffect(() => {
    if (mode !== 'chat' || !followScroll.current) return;
    const frame = requestAnimationFrame(() => { if (mainRef.current) mainRef.current.scrollTop = mainRef.current.scrollHeight; });
    return () => cancelAnimationFrame(frame);
  }, [thread, mode, phase]);

  useEffect(() => { if (mode === 'chat' && !busy) questionRef.current?.focus(); }, [mode, busy]);

  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  function close() { stop(); onClose(); }

  async function generate(tool: ToolId, userQuestion = '', refresh = false, retryTurnId?: string) {
    if (busyRef.current || configured === null) return;
    if (!configured || !consented) { setMode('settings'); return; }
    if (!sourceTabs.length) { setError('Choose a normal saved webpage. Chrome cannot read the selected pages.'); return; }
    if (tool === 'ask' && !userQuestion.trim()) return;
    const retryIndex = retryTurnId ? thread.findIndex(turn => turn.id === retryTurnId) : -1;
    if (retryIndex >= 0 && retryIndex !== thread.length - 1) { setError('Only the latest turn can be retried. Ask a new follow-up instead.'); return; }
    const previous = retryIndex >= 0 ? thread.slice(0, retryIndex) : thread;
    const history: ChatMessage[] = tool === 'ask' ? previous.flatMap(turn => turn.result ? [
      { role: 'user' as const, content: turn.question }, { role: 'assistant' as const, content: answerValue(turn.result) },
    ] : []) : [];
    if (history.length >= 80) { setError('Start a new chat to continue. This conversation has reached its limit.'); return; }
    const origins = [...new Set(sourceTabs.map(tab => { const url = new URL(tab.url); return `${url.protocol}//${url.hostname}/*`; }))];
    // Invoke before losing the click's user gesture. Granted sites show no prompt.
    const permissionPromise = chrome.permissions.request({ origins });
    const controller = new AbortController();
    abort.current = controller; busyRef.current = true;
    const turnId = tool === 'ask' ? retryTurnId || crypto.randomUUID() : undefined;
    setLastAction({ tool, question: userQuestion, turnId });
    setMode(tool === 'ask' ? 'chat' : 'answer'); setElapsed(0); setBusy(true); setPhase('Checking page access…');
    setError(''); setShowProviderOption(false); setCopied(''); setActiveTool(tool);
    if (tool !== 'ask') setResult(null);
    else { followScroll.current = true; setThread([...previous, { id: turnId!, question: userQuestion, result: null, urls: [], pending: true }]); setQuestion(''); }
    let streamed = '';
    let streamTimer: number | undefined;
    let urls: string[] = [];
    let normalizedSources: string[] = [];
    let checkingReferences = false;
    const referenceUpdates = new Map<string, RelatedTopic>();
    const partialResult = (): Result | null => {
      if (!streamed) return null;
      if (tool === 'extract' || tool === 'related') {
        const preview = structuredPreview(tool, streamed);
        if (tool === 'extract' && preview.items) preview.items = verifiedDataItems(preview.items, normalizedSources);
        if (!preview.items?.length && !preview.topics?.length) return null;
        return { ...preview, topics: preview.topics?.map(topic => referenceUpdates.get(topic.title) || topic) };
      }
      return { text: streamed };
    };
    const displayStream = () => {
      streamTimer = undefined;
      if (!mounted.current || controller.signal.aborted) return;
      const partial = partialResult();
      if (!partial) return;
      if (!checkingReferences) {
        if (tool === 'related') setPhase(`Finding topics · ${partial.topics?.length || 0} ready`);
        else if (tool === 'extract') setPhase(`Extracting details · ${partial.items?.length || 0} ready`);
        else setPhase(`Writing answer · ${streamed.trim().split(/\s+/u).length} words`);
      }
      if (tool === 'ask') setThread(current => current.map(turn => turn.id === turnId ? { ...turn, result: partial, urls } : turn));
      else setResult(partial);
    };
    try {
      await permissionPromise;
      controller.signal.throwIfAborted();
      const allowed = new Set((await Promise.all(origins.map(async origin => await chrome.permissions.contains({ origins: [origin] }) ? origin : ''))).filter(Boolean));
      controller.signal.throwIfAborted();
      let sources: Source[];
      if (tool === 'ask' && chatSources.current) {
        if (allowed.size !== origins.length) throw new Error('Allow access to all pages in this chat before continuing.');
        sources = chatSources.current;
      } else {
        const views = initialViews(sourceTabs);
        const slots: (Source | undefined)[] = new Array(sourceTabs.length);
        let next = 0;
        setPhase(`Reading ${sourceTabs.length === 1 ? 'page' : `${sourceTabs.length} pages`}…`);
        const worker = async () => {
          while (next < sourceTabs.length) {
            const index = next++;
            const tab = sourceTabs[index];
            controller.signal.throwIfAborted();
            const url = new URL(tab.url);
            if (!allowed.has(`${url.protocol}//${url.hostname}/*`)) { views[index] = { ...views[index], status: 'failed', detail: 'Site access was not granted.' }; setSourceViews([...views]); continue; }
            try {
              let source = !refresh ? sourceCache.current.get(url.href) : undefined;
              if (!source) {
                views[index] = { ...views[index], status: 'reading' }; setSourceViews([...views]);
                const id = crypto.randomUUID(); readIds.current.add(id);
                try {
                  const { snapshot } = await aiRequest('read', { id, url: url.href });
                  controller.signal.throwIfAborted();
                  source = parseArticle(snapshot);
                  if (source.text.length > 240000) { source.text = source.text.slice(0, 240000); source.truncated = true; }
                  sourceCache.current.set(url.href, source);
                } finally { readIds.current.delete(id); }
              }
              slots[index] = source;
              views[index] = { ...views[index], title: source.title, url: source.url, domain: source.domain || new URL(source.url).hostname, status: 'ready', trimmed: source.truncated };
            } catch (cause) {
              if (controller.signal.aborted) throw cause;
              views[index] = { ...views[index], status: 'failed', detail: cause instanceof Error ? cause.message : 'This page could not be read.' };
            }
            setSourceViews([...views]);
            setPhase(`Read ${slots.filter(Boolean).length} of ${sourceTabs.length} pages…`);
          }
        };
        await Promise.all([worker(), worker()]);
        controller.signal.throwIfAborted();
        sources = slots.filter((source): source is Source => Boolean(source));
        let index = 0;
        setSourceViews(views.map(view => view.status === 'ready' ? { ...view, id: `S${++index}` } : view));
      }
      if (!sources.length) { setSourcesExpanded(true); throw new Error('No readable pages. Check the sources above.'); }
      normalizedSources = sources.map(source => evidenceText(source.text));
      if (tool === 'ask') chatSources.current = sources;
      urls = sources.map(source => source.url); setUsedUrls(urls);
      setPhase('Preparing page context…');
      const response = await aiGenerate({ id: crypto.randomUUID(), sources, tool, query: userQuestion, language, refresh, history }, delta => {
        if (controller.signal.aborted) return;
        if (!streamed) setPhase(tool === 'related' ? 'Finding topics…' : tool === 'extract' ? 'Extracting details…' : 'Writing answer…');
        streamed += delta;
        if (streamTimer === undefined) streamTimer = window.setTimeout(displayStream, 60);
      }, controller.signal, progress => {
        if (controller.signal.aborted) return;
        if (progress.stage === 'waiting') setPhase('Preparing page context…');
        if (progress.stage === 'sending') setPhase(`Sending context to ${providerName}…`);
        if (progress.stage === 'processing') setPhase(`${providerName} connected · preparing response…`);
        if (progress.stage === 'receiving') setPhase(tool === 'related' ? 'Finding topics…' : tool === 'extract' ? 'Extracting details…' : 'Writing answer…');
        if (progress.stage === 'references') {
          checkingReferences = true;
          setPhase(`Checking reference links · ${progress.completed || 0}/${progress.total || 0}`);
        }
        if (progress.topics) {
          progress.topics.forEach(topic => referenceUpdates.set(topic.title, topic));
          displayStream();
        }
      }) as Result;
      controller.signal.throwIfAborted();
      if (tool === 'ask') setThread(current => current.map(turn => turn.id === turnId ? { ...turn, result: response, urls, pending: false } : turn));
      else setResult(response);
      void aiRequest('recent').then(data => { if (mounted.current) setRecent(Array.isArray(data.entries) ? data.entries : []); }).catch(() => {});
    } catch (cause) {
      if (!mounted.current || selection.current !== sourceKey) return;
      const message = controller.signal.aborted ? 'Stopped.' : cause instanceof AIRequestError && cause.code === 'AI_QUOTA' ? 'Provider limit reached. Try later or change provider.' : cause instanceof Error ? cause.message : 'Could not analyze these pages.';
      setShowProviderOption(cause instanceof AIRequestError && ['AI_QUOTA', 'AI_UNAVAILABLE', 'AI_MODEL', 'AI_AUTH'].includes(cause.code || ''));
      const partial = partialResult();
      if (tool === 'ask') setThread(current => current.map(turn => turn.id === turnId ? { ...turn, error: message, result: partial ? { ...partial, incomplete: true } : null, urls, pending: false } : turn));
      else { setError(message); if (partial) setResult({ ...partial, incomplete: true, topics: partial.topics?.map(topic => topic.referenceStatus === 'found' ? topic : { ...topic, referenceStatus: 'unavailable' }) }); }
    } finally {
      if (streamTimer !== undefined) clearTimeout(streamTimer);
      if (mounted.current) { setBusy(false); setPhase(''); }
      if (abort.current === controller) { abort.current = null; busyRef.current = false; }
    }
  }

  async function copyAnswer(answer: Result, id: string) {
    try { await navigator.clipboard.writeText(answerValue(answer)); setCopied(id); window.setTimeout(() => setCopied(''), 1500); }
    catch { setError('Could not copy. Check clipboard permission.'); }
  }

  function openChat(seed = false) {
    if (seed && result) {
      const previous = !thread.length || thread[0].urls.join('\n') === usedUrls.join('\n') ? thread : [];
      if (!previous.some(turn => turn.result && answerValue(turn.result) === answerValue(result))) setThread([...previous, { id: crypto.randomUUID(), question: tools.find(tool => tool.id === activeTool)?.title || 'About these pages', result, urls: usedUrls }]);
      const snapshots = sourceTabs.map(tab => sourceCache.current.get(new URL(tab.url).href)).filter((source): source is Source => Boolean(source));
      chatSources.current = snapshots.length && snapshots.map(source => source.url).join('\n') === usedUrls.join('\n') ? snapshots : null;
    }
    setMode('chat'); setError(''); followScroll.current = true;
  }

  const failedCount = sourceViews.filter(source => source.status === 'failed').length;
  const readyCount = sourceViews.filter(source => source.status === 'ready').length;
  const pageCount = readyCount || sourceTabs.length;
  const recentForPages = recent.filter(entry => entry.tool !== 'ask' && entry.version === PROMPT_VERSION &&
    entry.result.sources.every(source => safeUrl(source.url) && sourceTabs.some(tab => tab.url === source.url))).slice(0, 3);
  const errorActions = <>{!busy && lastAction && <button type="button" onClick={() => void generate(lastAction.tool, lastAction.question, false, lastAction.turnId)}>Retry</button>}{showProviderOption && <button type="button" onClick={() => setMode('settings')}>Change provider</button>}</>;
  const loading = busy && <div className="pwa-ai-loading" role="status"><span className="pwa-ai-progress" aria-hidden="true" /><span>{phase}</span><time aria-label={`${elapsed} seconds elapsed`}>{elapsed}s</time><button type="button" onClick={stop}>Stop</button></div>;
  return <div className="pwa-ai-scrim" onClick={close}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="AI assistant" className={`pwa-ai-view${mode === 'settings' ? ' is-setup' : ''}`} onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') { if (busy) stop(); else close(); } }}>
      <header className="pwa-ai-header">
        {configured && consented ? <nav aria-label="AI views"><button type="button" className={mode === 'tools' || mode === 'answer' ? 'active' : ''} aria-pressed={mode === 'tools' || mode === 'answer'} onClick={() => { setMode('tools'); setError(''); }} disabled={busy}><Squares2X2Icon />Tools</button><button type="button" className={mode === 'chat' ? 'active' : ''} aria-pressed={mode === 'chat'} onClick={() => openChat(mode === 'answer')} disabled={busy}><ChatBubbleLeftRightIcon />Chat</button></nav> : <span className="pwa-ai-header-label">AI assistant</span>}
        <button type="button" className="pwa-ai-close" onClick={close} aria-label="Close AI assistant"><XMarkIcon /></button>
      </header>
      {mode !== 'settings' && configured !== null && <>
        <div className="pwa-ai-sourcebar"><button type="button" onClick={() => setSourcesExpanded(!sourcesExpanded)} aria-expanded={sourcesExpanded}><span className="pwa-ai-source-dots">{sourceViews.slice(0, 2).map((source, index) => <SiteIcon key={index} url={source.url} />)}</span><span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}{failedCount ? ` · ${failedCount} skipped` : ''}</span><ChevronDownIcon /></button><button type="button" className="pwa-ai-provider" onClick={() => { setMode('settings'); setError(''); }} disabled={busy}>{providerName.replace('Google ', '')}</button></div>
        {sourcesExpanded && <div className="pwa-ai-sources">{sourceViews.map((source, index) => <div key={index}><SiteIcon url={source.url} /><span><a href={safeUrl(source.url)} target="_blank" rel="noreferrer" title={source.url}>{source.title}</a><small>{source.detail || `${source.domain}${source.status === 'reading' ? ' · reading' : source.id ? ` · ${source.id}` : ''}`}</small></span></div>)}{tabs.length > sourceTabs.length && <p>{tabs.length - sourceTabs.length} duplicate, unsupported or over-limit pages excluded.</p>}{mode === 'chat' && thread.some(turn => turn.result) && <p>Chat uses this page snapshot. New chat reads the pages again.</p>}</div>}
      </>}
      <main ref={mainRef} className="pwa-ai-content" onScroll={() => { const node = mainRef.current; if (node) followScroll.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }}>
        {configured === null ? <div className="pwa-ai-loading" role="status">Checking provider…</div> : mode === 'settings' ? <div className="pwa-ai-settings"><h2>{configured ? 'AI provider' : 'Connect AI'}</h2><p>Your key. No Tab Story subscription.</p>{error && <p role="alert" className="pwa-ai-error">{error}</p>}
          <AISettingsCard compact onAnswersChange={() => { void aiRequest('recent').then(data => setRecent(Array.isArray(data.entries) ? data.entries : [])).catch(() => {}); }} onDisconnect={() => { setConfigured(false); setConsented(false); setProviderId(''); setProviderName('AI provider'); }} onSuccess={connection => {
            setConfigured(true); setConsented(true); setProviderId(connection.providerId); setProviderName(connection.provider); setMode(thread.length ? 'chat' : 'tools'); setError('');
            void aiRequest('recent').then(data => setRecent(Array.isArray(data.entries) ? data.entries : [])).catch(() => {});
          }} />
        </div> : mode === 'tools' ? <div className="pwa-ai-tools"><div className="pwa-ai-tools-title"><h2>Make sense of your pages</h2><p>Choose a tool, or ask a question in Chat.</p></div>
          <div className="pwa-ai-toolgrid">{tools.map(tool => { const ToolIcon = tool.icon; return <button type="button" key={tool.id} className="pwa-ai-tool" title={tool.id === 'related' ? 'Links from your pages or Wikipedia. Only related-topic names are looked up on Wikipedia, not page text.' : undefined} onClick={() => void generate(tool.id)}><ToolIcon /><span><strong>{tool.title}</strong><small>{tool.description}</small></span></button>; })}</div>
          <p className="pwa-ai-reference-note">Related links use page references & Wikipedia.</p>
          <label className="pwa-ai-language">Language<select value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(value => <option key={value}>{value}</option>)}</select></label>
          {error && <div className="pwa-ai-error" role="alert"><p>{error}</p>{errorActions}</div>}
          {recentForPages.length > 0 && <details className="pwa-ai-recent"><summary>Recent answers for these pages</summary>{recentForPages.map(entry => <button type="button" key={entry.key} onClick={() => {
            setLastAction({ tool: entry.tool, question: '' }); setUsedUrls(entry.result.sources.map(source => source.url)); setResult({ ...entry.result, cachedAt: entry.at }); setActiveTool(entry.tool); setMode('answer'); setError('');
          }}><span>{tools.find(tool => tool.id === entry.tool)?.title}</span><small>{new Date(entry.at).toLocaleDateString()}</small></button>)}</details>}
        </div> : mode === 'chat' ? <div className="pwa-ai-chat"><div className="pwa-ai-chathead"><h2>Chat with your pages</h2>{thread.length > 0 && <button type="button" disabled={busy} onClick={() => { setThread([]); setQuestion(''); setError(''); chatSources.current = null; sourceCache.current.clear(); setLastAction(null); }}>New chat</button>}</div>
          {!thread.length && <p className="pwa-ai-note">Ask anything about the selected pages. Follow-ups stay in this chat.</p>}
          {thread.map(turn => <article key={turn.id} className="pwa-ai-turn"><h3 dir="auto">{turn.question}</h3>{turn.result && <Answer result={turn.result} urls={turn.urls} provider={providerName} />}{turn.pending && loading}{turn.error && <div className="pwa-ai-error" role="alert"><p>{turn.error}</p>{!busy && turn.id === thread.at(-1)?.id && <button type="button" onClick={() => void generate('ask', turn.question, true, turn.id)}>Retry</button>}{showProviderOption && <button type="button" onClick={() => setMode('settings')}>Change provider</button>}</div>}{turn.result && !turn.pending && <button type="button" className="pwa-ai-copy" onClick={() => void copyAnswer(turn.result!, turn.id)}>{copied === turn.id ? 'Copied' : 'Copy'}</button>}</article>)}
          {error && <div className="pwa-ai-error" role="alert"><p>{error}</p></div>}
          <form className="pwa-ai-chat-form" onSubmit={event => { event.preventDefault(); if (question.trim()) void generate('ask', question.trim()); }}><label htmlFor="tab-story-ai-question" className="pwa-ai-chat-label">{thread.length ? 'Follow up' : 'Your question'}</label><div><textarea ref={questionRef} id="tab-story-ai-question" rows={2} maxLength={2000} value={question} onChange={event => setQuestion(event.target.value)} placeholder={thread.length ? 'Ask a follow-up…' : 'What would you like to know?'} disabled={busy} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button type="submit" disabled={busy || !question.trim()} aria-label="Send question"><PaperAirplaneIcon /></button></div></form>
          <p className="pwa-ai-footnote">AI can be wrong. Check the linked sources.</p>
        </div> : <div className="pwa-ai-output"><div className="pwa-ai-resulthead"><h2>{activeTool === 'translate' ? `Summary · ${language}` : tools.find(tool => tool.id === activeTool)?.title || 'Answer'}</h2>{result && <button type="button" disabled={busy} onClick={() => void copyAnswer(result, 'answer')}>{copied === 'answer' ? 'Copied' : 'Copy'}</button>}</div>
          {loading}{error && <div role="alert" className="pwa-ai-error"><p>{error}</p>{errorActions}</div>}{result && <Answer result={result} urls={usedUrls} provider={providerName} />}
          {result && !busy && <><div className="pwa-ai-answer-actions"><button type="button" onClick={() => openChat(true)}><ChatBubbleLeftRightIcon />Discuss this</button><button type="button" title="Reread pages and generate a fresh answer" onClick={() => void generate(activeTool, '', true)}><ArrowPathIcon />Refresh pages</button></div><p className="pwa-ai-footnote">AI can be wrong. Check the linked sources.</p></>}
        </div>}
      </main>
    </section>
  </div>;
}
