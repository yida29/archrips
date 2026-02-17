import { useCallback, useEffect } from 'react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'archrip-theme';
const THEME_VALUES = ['light', 'dark'] as const;

function resolveTheme(urlTheme: string | null): Theme {
  // 1. URL query parameter — highest priority
  if (urlTheme === 'light' || urlTheme === 'dark') return urlTheme;
  // 2. localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  // 3. System preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [urlTheme, setUrlTheme] = useQueryState('theme', parseAsStringLiteral(THEME_VALUES).withOptions({ history: 'replace' }));
  const theme = resolveTheme(urlTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    void setUrlTheme(next);
  }, [theme, setUrlTheme]);

  return { theme, toggleTheme } as const;
}
