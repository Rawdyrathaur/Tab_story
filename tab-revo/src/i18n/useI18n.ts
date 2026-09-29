import { createContext, useContext } from 'react';
import type { TranslationParams } from './core';

export interface I18nContextValue {
  locale: string;
  language: string;
  dir: 'ltr' | 'rtl';
  setLanguage: (language: string) => Promise<void>;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n requires LocalizationProvider');
  return context;
}
