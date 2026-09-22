import { appMessages } from './appMessages';
import { calendarMessages } from './calendarMessages';
import { reminderMessages } from './reminderMessages';
import { uiMessages } from './uiMessages';

export type TranslationParams = Record<string, string | number>;
export const LOCALE_STORAGE_KEY = 'tabStory.locale';

// Add a language here and supply its resources to make it available throughout
// the panel and background worker. Regions are retained separately for Intl.
export const supportedLanguages = [
  { code: 'en', nativeName: 'English', locale: 'en-US', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', locale: 'hi-IN', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', locale: 'es-ES', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', locale: 'de-DE', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', locale: 'ar', dir: 'rtl' },
  { code: 'ur', nativeName: 'اردو', locale: 'ur', dir: 'rtl' },
] as const;

export const messages: Record<string, Record<string, string>> = Object.fromEntries(
  supportedLanguages.map(({ code }) => [code, {
    "navigation.Collections": ({ en: "Collections", hi: "संग्रह", es: "Colecciones", de: "Sammlungen", ar: "المجموعات", ur: "مجموعے" })[code],
    ...appMessages[code], ...calendarMessages[code], ...reminderMessages[code], ...uiMessages[code],
  }]),
);

function supportedLocale(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const canonical = Intl.getCanonicalLocales(value)[0];
    if (canonical && Intl.DateTimeFormat.supportedLocalesOf([canonical]).length) return canonical;
  } catch { /* Invalid or stale preferences use browser defaults. */ }
}

export function getBrowserLocales(): string[] {
  if (typeof navigator !== 'undefined') return [...(navigator.languages?.length ? navigator.languages : [navigator.language])];
  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) return [chrome.i18n.getUILanguage()];
  return ['en-US'];
}

/** Saved choice wins; supported browser locales retain their regional formatting. */
export function resolveLocale(saved?: unknown, browserLocales = getBrowserLocales()): string {
  const preferred = supportedLocale(saved);
  if (preferred) {
    return preferred;
  }
  return browserLocales.map(supportedLocale).find((candidate): candidate is string => !!candidate) || 'en-US';
}

export function getLanguage(locale: string): string {
  return new Intl.Locale(resolveLocale(locale)).language;
}

export function getDirection(locale: string): 'ltr' | 'rtl' {
  const parsed = new Intl.Locale(resolveLocale(locale)).maximize();
  return ['Arab', 'Hebr', 'Thaa', 'Nkoo', 'Adlm', 'Rohg', 'Syrc', 'Samr', 'Mand'].includes(parsed.script || '') ? 'rtl' : 'ltr';
}

export async function readStoredLocale(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolveLocale();
  const stored = await chrome.storage.local.get(LOCALE_STORAGE_KEY);
  return resolveLocale(stored[LOCALE_STORAGE_KEY]);
}

/** Background notifications remain usable when preference storage is unavailable. */
export async function getStoredLocale(): Promise<string> {
  try { return await readStoredLocale(); }
  catch (error) {
    console.error('[Tab Story] locale.read', error);
    return resolveLocale();
  }
}

export function translate(locale: string, key: string, params: TranslationParams = {}): string {
  const resolved = resolveLocale(locale);
  const language = getLanguage(resolved);
  const plural = typeof params.count === 'number' ? new Intl.PluralRules(resolved).select(params.count) : undefined;
  const catalog = messages[language] || messages.en;
  const template = (plural && catalog[`${key}.${plural}`]) || catalog[key] ||
    (plural && messages.en[`${key}.${plural}`]) || messages.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : typeof value === 'number' ? new Intl.NumberFormat(resolved).format(value) : value;
  });
}

export interface WeekInfo { firstDay: number; weekend: number[]; minimalDays: number }

export function getWeekInfo(locale: string): WeekInfo {
  const intlLocale = new Intl.Locale(resolveLocale(locale)) as Intl.Locale & { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo };
  if (intlLocale.getWeekInfo) return intlLocale.getWeekInfo();
  if (intlLocale.weekInfo) return intlLocale.weekInfo;
  const region = intlLocale.maximize().region;
  // Fallback for browsers predating Intl.Locale week information.
  if (['AE', 'AF', 'BH', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY'].includes(region || '')) {
    return { firstDay: 6, weekend: [5, 6], minimalDays: 1 };
  }
  const sunday = ['US', 'CA', 'MX', 'IN', 'SA', 'IL', 'JP', 'KR', 'BR', 'PH', 'TW', 'TH', 'ZA'].includes(region || '');
  return { firstDay: sunday ? 7 : 1, weekend: region === 'SA' ? [5, 6] : [6, 7], minimalDays: sunday ? 1 : 4 };
}
