import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getDirection, getLanguage, LOCALE_STORAGE_KEY, readStoredLocale, resolveLocale, translate } from './core';
import { I18nContext } from './useI18n';
import type { I18nContextValue } from './useI18n';

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('en-US');
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const dir = getDirection(locale);

  useEffect(() => {
    let active = true;
    const initialRevision = revision.current;
    void readStoredLocale().then(saved => {
      if (active && revision.current === initialRevision) setLocale(saved);
    }).catch(cause => {
      if (active) setError('localization.saveFailed');
      console.error('[Tab Story] locale.read', cause);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset.textDirection = dir;
    document.title = translate(locale, 'localization.documentTitle');
  }, [locale, dir]);

  const setLanguage = useCallback(async (language: string) => {
    if (!Intl.DateTimeFormat.supportedLocalesOf([language]).length) throw new Error('Unsupported language');
    const previous = locale;
    const next = resolveLocale(language);
    const changeRevision = ++revision.current;
    setLocale(next);
    setError(null);
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) throw new Error('Extension storage is unavailable');
      await chrome.storage.local.set({ [LOCALE_STORAGE_KEY]: next });
    } catch (cause) {
      if (revision.current === changeRevision) setLocale(previous);
      setError('localization.saveFailed');
      console.error('[Tab Story] locale.save', cause);
      throw cause;
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale, language: getLanguage(locale), dir, setLanguage,
    t: (key, params) => translate(locale, key, params),
    // HTML date inputs and month arithmetic use the Gregorian calendar, even
    // where the locale's default calendar differs (for example ar-SA).
    formatDate: (date, options) => Number.isFinite(Number(date)) ? new Intl.DateTimeFormat(locale, { calendar: 'gregory', ...options }).format(date) : translate(locale, 'common.unknownDate'),
    formatNumber: (number, options) => new Intl.NumberFormat(locale, options).format(number),
  }), [locale, dir, setLanguage]);

  return <I18nContext.Provider value={value}>
    {error && <div role="alert" className="localization-error" style={{ padding: '8px 12px', color: 'var(--text-color)', background: 'var(--input-bg)', fontSize: 12 }}>
      {translate(locale, error)}
      <button aria-label={translate(locale, 'common.close')} onClick={() => setError(null)} style={{ marginInlineStart: 8 }}>×</button>
    </div>}
    {children}
  </I18nContext.Provider>;
}
