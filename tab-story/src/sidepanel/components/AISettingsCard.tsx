import { useEffect, useId, useState } from 'react';
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { aiRequest } from '../../ai/service';
import { providers, type ProviderId } from '../../ai/providers';

interface Props {
  onSuccess?: (connection: { provider: string; providerId: string; model: string }) => void;
  onDisconnect?: () => void;
  onAnswersChange?: () => void;
  compact?: boolean;
}

const notes: Record<ProviderId, string> = {
  groq: 'Groq processes page content under its API terms.',
  cerebras: 'Cerebras processes page content under its API terms. Free-tier limits can change.',
  gemini: "Google's free tier may use prompts to improve its products.",
};
const order: ProviderId[] = ['groq', 'cerebras', 'gemini'];

export function AISettingsCard({ onSuccess, onDisconnect, onAnswersChange, compact = false }: Props) {
  const keyInputId = useId();
  const [providerId, setProviderId] = useState<ProviderId>('groq');
  const [activeId, setActiveId] = useState<ProviderId | null>(null);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [consented, setConsented] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saveAnswers, setSaveAnswers] = useState(true);
  const [keyNeededAgain, setKeyNeededAgain] = useState(false);
  const [available, setAvailable] = useState<ProviderId[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = providers[providerId];

  useEffect(() => {
    void aiRequest('status').then(status => {
      setConfigured(status.configured === true);
      setConsented(status.consented === true);
      setSaveAnswers(status.saveAnswers !== false);
      setKeyNeededAgain(status.keyNeededAgain === true);
      setAvailable(Array.isArray(status.availableProviders) ? status.availableProviders.filter((id: unknown): id is ProviderId => typeof id === 'string' && id in providers) : []);
      if (typeof status.providerId === 'string' && status.providerId in providers) {
        const id = status.providerId as ProviderId;
        setActiveId(id);
        setProviderId(id);
      }
      if (typeof status.model === 'string') setModel(status.model);
    }).catch(() => setError('Could not read AI provider status. Reload the extension.'));
  }, []);

  async function connect() {
    const key = apiKey.trim().replace(/^["']|["']$/g, '');
    if (key.length < 8) { setError('Paste a valid API key first.'); return; }
    if (!agreed) { setError('Confirm the provider data note first.'); return; }
    setBusy(true); setError('');
    try {
      const response = await aiRequest('connect', { provider: providerId, key, accepted: true });
      if (typeof response.selectedModel !== 'string' || !response.selectedModel) throw new Error('No text model is available for this key.');
      setConfigured(true); setConsented(true); setActiveId(providerId);
      setAvailable(current => [...new Set([...current, providerId])]);
      setKeyNeededAgain(false);
      setModel(response.selectedModel); setApiKey(''); setShowKey(false); setAgreed(false);
      onSuccess?.({ provider: selected.name, providerId, model: response.selectedModel });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not connect this provider.');
    } finally { setBusy(false); }
  }

  async function confirmExisting() {
    if (!agreed || !activeId) return;
    setBusy(true); setError('');
    try {
      await aiRequest('consent', { accepted: true });
      setConsented(true); setAgreed(false);
      onSuccess?.({ provider: providers[activeId].name, providerId: activeId, model });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save consent.');
    } finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError('');
    try {
      await aiRequest('forget');
      setConfigured(false); setConsented(false); setActiveId(null); setModel(''); setApiKey(''); setAgreed(false);
      setKeyNeededAgain(false);
      setAvailable([]);
      onDisconnect?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disconnect this provider.');
    } finally { setBusy(false); }
  }

  async function switchProvider() {
    setBusy(true); setError('');
    try {
      const response = await aiRequest('switch', { provider: providerId });
      setActiveId(providerId); setConfigured(true); setConsented(true); setKeyNeededAgain(false);
      setModel(response.model);
      onSuccess?.({ provider: selected.name, providerId, model: response.model });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not switch provider.');
    } finally { setBusy(false); }
  }

  return <div className={`pwa-ai-provider-setup${compact ? ' compact' : ''}`}>
    {keyNeededAgain && <p className="pwa-ai-provider-note">Chrome restarted. Reconnect your key.</p>}
    {configured && activeId && <div className="pwa-ai-connected"><span><strong>{providers[activeId].name}</strong> · {consented ? 'Connected' : 'Consent needed'}{model && <small>{model}</small>}</span><button type="button" aria-label="Disconnect all AI providers" onClick={() => void disconnect()} disabled={busy}>Disconnect</button></div>}
    <div className="pwa-ai-field-label"><span>Provider</span><small>{selected.badge}</small></div>
    <div className="pwa-ai-provider-list" role="group" aria-label="Choose AI provider">
      {order.map(id => <button key={id} type="button" className={providerId === id ? 'selected' : ''} aria-label={providers[id].name} aria-pressed={providerId === id} onClick={() => { setProviderId(id); setApiKey(''); setAgreed(false); setError(''); }} disabled={busy}>
        <span>{id === 'gemini' ? 'Gemini' : providers[id].name}</span>
      </button>)}
    </div>
    <div className="pwa-ai-field-label pwa-ai-key-heading">
      <label htmlFor={keyInputId}>API key</label>
      <a className="pwa-ai-keylink" href={selected.keyUrl} target="_blank" rel="noreferrer" aria-label={`Get a ${selected.name} API key`}>Get key <ArrowTopRightOnSquareIcon /></a>
    </div>
    <div className="pwa-ai-keyfield"><input id={keyInputId} type={showKey ? 'text' : 'password'} value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="Paste your key" autoComplete="off" autoCapitalize="none" spellCheck={false} disabled={busy} /><button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Hide key' : 'Show key'} disabled={!apiKey}>{showKey ? <EyeSlashIcon /> : <EyeIcon />}</button></div>
    <details className="pwa-ai-provider-details">
      <summary>Privacy &amp; limits <ChevronDownIcon /></summary>
      <div id={`${keyInputId}-privacy`}>
        <p>Selected page text goes directly to {selected.name}, never to Tab Story servers.</p>
        <p>{notes[providerId]}</p>
        <p>Your key stays in this browser session and clears when Chrome restarts. Provider limits and charges apply.</p>
      </div>
    </details>
    {(!configured || !consented || Boolean(apiKey)) && <label className="pwa-ai-consent"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} aria-describedby={`${keyInputId}-privacy`} disabled={busy} /><span>Allow selected page text to {selected.name}.</span></label>}
    {error && <p role="alert" className="pwa-ai-error">{error}</p>}
    {configured && !consented && activeId === providerId && !apiKey
      ? <button className="pwa-ai-primary" type="button" onClick={() => void confirmExisting()} disabled={!agreed || busy}>Agree and continue</button>
      : available.includes(providerId) && providerId !== activeId && !apiKey
        ? <button className="pwa-ai-primary" type="button" onClick={() => void switchProvider()} disabled={busy}>Use {selected.name}</button>
        : <button className="pwa-ai-primary" type="button" onClick={() => void connect()} disabled={!apiKey.trim() || !agreed || busy}>{busy ? 'Connecting…' : configured && activeId === providerId ? 'Update key' : 'Connect'}</button>}
    <div className="pwa-ai-answer-pref"><label><input type="checkbox" checked={saveAnswers} onChange={event => {
      const enabled = event.target.checked;
      setSaveAnswers(enabled);
      void aiRequest('saveAnswers', { enabled }).then(() => onAnswersChange?.()).catch(() => { setSaveAnswers(!enabled); setError('Could not update answer preference.'); });
    }} /> Save answers on this device</label><button type="button" aria-label="Clear recent AI answers" onClick={() => void aiRequest('clearAnswers').then(() => onAnswersChange?.()).catch(() => setError('Could not clear recent answers.'))}>Clear</button></div>
  </div>;
}
