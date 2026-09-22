import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  ChevronRightIcon,
  DocumentTextIcon,
  LanguageIcon,
  LightBulbIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { SavedTab } from '../db';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { AIRequestError, aiRequest, parseArticle, type Source } from '../../ai/service';
import { AISettingsCard } from './AISettingsCard';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
const tools: { title: string; description: string; prompt: string; icon: Icon; color: string; background: string; border: string }[] = [
  { title: 'Summarize', description: 'Get a concise summary of this page', prompt: 'Provide a concise summary of this page.', icon: DocumentTextIcon, color: '#a855f7', background: 'rgba(168,85,247,.16)', border: 'rgba(168,85,247,.3)' },
  { title: 'Key points', description: 'Extract the main points', prompt: 'Extract the main key points from this page.', icon: DocumentTextIcon, color: '#3b82f6', background: 'rgba(59,130,246,.16)', border: 'rgba(59,130,246,.3)' },
  { title: 'Simple explanation', description: 'Explain this page in easy words', prompt: 'Explain this page in simple, easy-to-understand concepts.', icon: LightBulbIcon, color: '#10b981', background: 'rgba(16,185,129,.16)', border: 'rgba(16,185,129,.3)' },
  { title: 'Find information', description: 'Ask anything about this page', prompt: 'Analyze this page to answer questions and find core insights.', icon: MagnifyingGlassIcon, color: '#6366f1', background: 'rgba(99,102,241,.16)', border: 'rgba(99,102,241,.3)' },
  { title: 'Extract key data', description: 'Get important facts, links, etc.', prompt: 'Extract all important facts, data points, statistics, and links from this page.', icon: DocumentTextIcon, color: '#ec4899', background: 'rgba(236,72,153,.16)', border: 'rgba(236,72,153,.3)' },
  { title: 'Translate', description: 'Convert content to any language', prompt: 'Translate and summarize the main content of this page into clear English.', icon: LanguageIcon, color: '#f59e0b', background: 'rgba(245,158,11,.16)', border: 'rgba(245,158,11,.3)' },
  { title: 'Related topics', description: 'Explore more on this topic', prompt: 'List key related topics, concepts, and recommendations for further reading based on this page.', icon: LinkIcon, color: '#8b5cf6', background: 'rgba(139,92,246,.16)', border: 'rgba(139,92,246,.3)' },
];

export function AIDiscussModal({ tabs, onClose }: { title: string; tabs: SavedTab[]; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(dialogRef);
  const abort = useRef<AbortController | null>(null);
  const requestId = useRef('');
  const [showTools, setShowTools] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [premium, setPremium] = useState<boolean | null>(null);
  const tab = tabs[0];

  useEffect(() => {
    void chrome.storage.local.get(['tabStory.proActive', 'tabStorySync']).then(value => {
      const syncTier = (value.tabStorySync as { tier?: string } | undefined)?.tier;
      setPremium(value['tabStory.proActive'] === true || syncTier === 'premium');
    });
    void aiRequest('status').then(result => setConfigured(result.configured)).catch(() => setError('AI service unavailable. Reload the extension.'));
    return () => {
      abort.current?.abort();
      if (requestId.current) void aiRequest('cancel', { id: requestId.current }).catch(() => {});
    };
  }, []);

  function close() {
    abort.current?.abort();
    if (requestId.current) void aiRequest('cancel', { id: requestId.current });
    onClose();
  }

  async function readSource(tabId: number): Promise<Source[]> {
    const result = await aiRequest('sources', { tabId, url: new URL(tab.url).href });
    return [parseArticle(result.snapshot)];
  }

  async function generate(prompt: string) {
    if (busy || !tab) return;
    if (!premium) { setError('AI Tools are a Premium feature. Upgrade to use Summarize, Key points, explanations, extraction, and translation.'); setShowTools(false); return; }
    setShowTools(false); setError(''); setAnswer('');
    if (!configured) { setShowSettings(true); return; }
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    requestId.current = crypto.randomUUID();
    try {
      if (!/^https?:\/\//i.test(tab.url)) throw new Error('Select a saved webpage. Chrome internal pages cannot be read.');
      const pageUrl = new URL(tab.url);
      if (pageUrl.hostname === 'chromewebstore.google.com' || (pageUrl.hostname === 'chrome.google.com' && pageUrl.pathname.startsWith('/webstore'))) throw new Error('Chrome does not allow extensions to read the Chrome Web Store.');
      const granted = await chrome.permissions.request({ origins: [`${pageUrl.protocol}//${pageUrl.hostname}/*`] });
      if (!granted) throw new Error(`Allow Tab Story to read ${pageUrl.hostname}, then try again.`);
      controller.signal.throwIfAborted();
      const target = await aiRequest('target', { url: tab.url });
      const sources = await readSource(target.tabId);
      controller.signal.throwIfAborted();
      const result = await aiRequest('generate', { id: requestId.current, sources, query: prompt, language: 'en-US' });
      setAnswer(result.text + (result.incomplete ? '\n\nResponse reached its length limit.' : ''));
    } catch (cause) {
      setError(controller.signal.aborted ? 'Request cancelled.' : cause instanceof AIRequestError && cause.code === 'AI_QUOTA' ? 'Your AI provider limit was reached. Try again later.' : cause instanceof Error ? cause.message : 'Could not analyze this page.');
    } finally { setBusy(false); requestId.current = ''; }
  }

  return <div className="pwa-ai-scrim" onClick={close}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Discuss with AI" className="pwa-ai-view" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') close(); }}>
      <header className="pwa-ai-header">
        <button className={showTools ? 'active' : ''} onClick={() => { setShowTools(!showTools); setShowSettings(false); }}><Squares2X2Icon /><span>Tools</span></button>
        <button className="pwa-ai-close" onClick={close} aria-label="Close AI view"><XMarkIcon /></button>
      </header>
      <div className="pwa-ai-divider" />

      <main className="pwa-ai-content">
        {premium === false ? <div className="pwa-ai-settings">
          <SparklesIcon style={{ width: 34, height: 34, color: '#c084fc' }} />
          <h2>Unlock AI Tools</h2>
          <p>Summaries, key points, simple explanations, page Q&amp;A, data extraction, translation, and related topics are included with Tab Story Premium.</p>
          <button className="pwa-schedule-confirm" onClick={() => chrome.tabs.create({ url: 'https://tabstory.pages.dev/#pricing', active: true })}>View Premium</button>
        </div> : showTools ? <div className="pwa-ai-tools">
          <div className="pwa-ai-tools-title"><h2>Tools</h2><p>Use AI to get more from this page</p></div>
          {tools.map(tool => {
            const ToolIcon = tool.icon;
            return <button key={tool.title} className="pwa-ai-tool" onClick={() => { setQuestion(tool.prompt); void generate(tool.prompt); }}>
              <span className="pwa-ai-tool-icon" style={{ color: tool.color, background: tool.background, borderColor: tool.border }}><ToolIcon /></span>
              <span className="pwa-ai-tool-copy"><strong>{tool.title}</strong><small>{tool.description}</small></span>
              <ChevronRightIcon />
            </button>;
          })}
        </div> : showSettings ? <div className="pwa-ai-settings">
          <h2>Connect AI Provider</h2><p>Choose a provider to use the AI page tools.</p>
          <AISettingsCard compact onSuccess={() => { setConfigured(true); setShowSettings(false); setShowTools(true); setError(''); }} />
        </div> : <div className="pwa-ai-output">
          {busy && <div className="pwa-ai-loading"><SparklesIcon /><span>Analyzing content with AI...</span></div>}
          {error && <p role="alert" className="pwa-ai-error">{error}</p>}
          {!busy && answer && <div className="pwa-ai-answer">{answer}</div>}
        </div>}
      </main>

      {!showTools && !showSettings && <form className="pwa-ai-composer" onSubmit={event => { event.preventDefault(); if (question.trim()) void generate(question.trim()); }}>
        <input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask anything about this page" disabled={busy} />
        <button type="submit" disabled={busy || !question.trim()} aria-label="Ask AI"><PaperAirplaneIcon /></button>
      </form>}
    </section>
  </div>;
}
