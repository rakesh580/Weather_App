import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './theme';
import { safeStorage } from '../utils/storage';

function initialTheme(): Theme {
  const saved = safeStorage.get('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [weatherBgClass, setWeatherBgClass] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1a1d16' : '#f5f0e8');
    safeStorage.set('theme', theme);
  }, [theme]);

  // Follow the OS preference until the user picks a theme explicitly.
  useEffect(() => {
    if (safeStorage.get('theme-explicit') === '1') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // The weather palette and the theme attribute must live on the same element so the
  // `[data-theme="dark"].weather-bg-*` selectors can match.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.forEach(c => { if (c.startsWith('weather-bg-')) root.classList.remove(c); });
    if (weatherBgClass) root.classList.add(`weather-bg-${weatherBgClass}`);
  }, [weatherBgClass]);

  const toggleTheme = useCallback(() => {
    safeStorage.set('theme-explicit', '1');
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, weatherBgClass, setWeatherBgClass }), [theme, toggleTheme, weatherBgClass]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
