import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'iar_theme';
export const DARK_THEME_COLOR = '#0a0d14';
export const LIGHT_THEME_COLOR = '#f4efe4';

export function readStoredThemePreference(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function detectSystemTheme(): Theme {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // Ignore matchMedia errors in non-browser environments
  }
  return 'light';
}

export function resolveInitialTheme(): Theme {
  const stored = readStoredThemePreference();
  if (stored) return stored;

  if (typeof document !== 'undefined') {
    const attrTheme = document.documentElement?.getAttribute('data-theme');
    if (attrTheme === 'dark') return 'dark';
    if (document.documentElement?.classList?.contains('dark')) return 'dark';
  }

  return detectSystemTheme();
}

export function applyDocumentTheme(theme: Theme): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
  }
}

export interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(initialTheme?: Theme): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(
    () => initialTheme ?? resolveInitialTheme()
  );

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    const normalized: Theme = next === 'dark' ? 'dark' : 'light';
    setThemeState(normalized);
    applyDocumentTheme(normalized);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyDocumentTheme(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next: Theme =
        event.newValue === 'dark' || event.newValue === 'light'
          ? event.newValue
          : detectSystemTheme();
      setThemeState(next);
      applyDocumentTheme(next);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme
  };
}
