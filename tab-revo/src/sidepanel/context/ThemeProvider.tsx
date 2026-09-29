import React, { useEffect, useState, useCallback } from 'react';
import { THEME_STORAGE_KEY, type Theme } from '../styles/theme';
import { ThemeContext } from './ThemeContext';

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;

  if (document.body) {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    document.body.setAttribute('data-theme', theme);
    document.body.style.colorScheme = theme;
  }
}

// Immediately apply initial theme before React render to avoid flash
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialTheme = getInitialTheme();
applyThemeToDOM(initialTheme);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Sync with chrome.storage.local if available
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([THEME_STORAGE_KEY], (result) => {
        const stored = result?.[THEME_STORAGE_KEY] as Theme;
        if (stored === 'light' || stored === 'dark') {
          setTheme(stored);
          applyThemeToDOM(stored);
        }
      });

      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes[THEME_STORAGE_KEY]) {
          const newTheme = changes[THEME_STORAGE_KEY].newValue as Theme;
          if (newTheme === 'light' || newTheme === 'dark') {
            setTheme(newTheme);
            applyThemeToDOM(newTheme);
          }
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
