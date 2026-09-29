import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CheckIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { getBrowserLocales, getDirection, messages } from '../../i18n/core';
import { useI18n } from '../../i18n/useI18n';

// Common languages plus every ISO 639-1 code recognized by this browser's Intl data.
const languageCodes = Array.from({ length: 676 }, (_, i) =>
  String.fromCharCode(97 + Math.floor(i / 26), 97 + i % 26));
const englishNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'code' });
const knownCodes = languageCodes.filter(code => englishNames.of(code) !== code &&
  Intl.DateTimeFormat.supportedLocalesOf([code]).length > 0);

export function LanguageSelector() {
  const { t, locale, dir, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const options = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'language' });
    const seen = new Set<string>();
    return [...new Set([...knownCodes, 'pt-BR', 'pt-PT', 'zh-Hans', 'zh-Hant', 'en-US', 'en-GB', ...getBrowserLocales(), locale])]
      .flatMap(code => {
        try {
          const canonical = Intl.getCanonicalLocales(code)[0];
          if (seen.has(canonical)) return [];
          seen.add(canonical);
          const native = new Intl.DisplayNames([canonical], { type: 'language' }).of(canonical) || canonical;
          return [{ code: canonical, native, label: names.of(canonical) || canonical, english: englishNames.of(canonical) || canonical }];
        } catch { return []; }
      }).sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [locale]);
  const filtered = options.filter(item => [item.code, item.native, item.label, item.english].join(' ').toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  async function select(code: string) {
    if (saving) return;
    try {
      if (!code.trim() || !Intl.DateTimeFormat.supportedLocalesOf([code.trim()]).length) throw new Error('Invalid locale');
    } catch {
      setError('Choose a language from the list or enter a valid locale code, such as fr-CA.');
      return;
    }
    setSaving(true); setError('');
    try { await setLanguage(code.trim()); setOpen(false); setSearch(''); }
    catch { setError(t('localization.saveFailed')); }
    finally { setSaving(false); }
  }
  return <Popover.Root open={open} onOpenChange={value => { setOpen(value); setError(''); }}>
    <Popover.Trigger asChild>
      <button type="button" aria-label={t('localization.language')}
        style={{ width: 36, height: 36, border: 0, borderRadius: 10, background: open ? 'var(--btn-hover-bg)' : 'transparent', color: 'var(--icon-color)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
        <LanguageIcon aria-hidden="true" style={{ width: 20, height: 20 }} />
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content dir={dir} side="right" align="end" sideOffset={8} collisionPadding={10}
        aria-label={t('localization.language')} style={{ width: 290, maxWidth: 'calc(100vw - 20px)', maxHeight: 'var(--radix-popover-content-available-height)', overflowY: 'auto', padding: 14, borderRadius: 14, border: '1px solid var(--border-color)', background: 'var(--modal-bg)', color: 'var(--text-color)', zIndex: 200, boxShadow: '0 12px 36px rgba(0,0,0,.2)' }}>
        <strong style={{ display: 'block', marginBottom: 10 }}>{t('localization.language')}</strong>
        <form onSubmit={event => { event.preventDefault(); if (filtered.length === 1) void select(filtered[0].code); else if (search.trim()) void select(search.trim()); }}>
          <input aria-label="Search languages or enter a locale code" placeholder="Search language / locale…" value={search} onChange={event => setSearch(event.target.value)}
            style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }} />
        </form>
        <button disabled={saving} onClick={() => void select(getBrowserLocales()[0] || 'en-US')} style={{ marginBlock: 8, padding: 7, background: 'transparent', border: 0, color: 'var(--text-color)', cursor: 'pointer' }}>Use browser language</button>
        <div role="group" aria-label={t('localization.choose')} style={{ maxHeight: 280, overflowY: 'auto' }}>
          {filtered.map(item => <button key={item.code} disabled={saving} aria-pressed={locale === item.code} onClick={() => void select(item.code)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'start', padding: '9px 8px', borderRadius: 8, border: 0, background: locale === item.code ? 'var(--btn-hover-bg)' : 'transparent', color: 'var(--text-color)', cursor: 'pointer' }}>
            <span style={{ flex: 1 }}><span lang={item.code} dir={getDirection(item.code)}>{item.native}</span><small style={{ display: 'block', color: 'var(--placeholder-color)', marginTop: 3 }}>{item.label} · {item.code} · {messages[new Intl.Locale(item.code).language] ? 'Interface + AI' : 'AI + formatting only'}</small></span>
            {locale === item.code && <CheckIcon style={{ width: 16 }} />}
          </button>)}
          {!filtered.length && <button disabled={saving} onClick={() => void select(search.trim())}>{t('common.save')} “{search}”</button>}
        </div>
        <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--placeholder-color)' }}>
          Dates, numbers and AI responses use your selected locale. {messages[new Intl.Locale(locale).language] ? 'Interface translations are available for this language.' : 'Interface text falls back to English where translations are unavailable.'}
        </p>
        {error && <p role="alert" style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
