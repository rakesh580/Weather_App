import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface ThemeCtx {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  weatherBgClass: string;
  setWeatherBgClass: (cls: string) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  toggleTheme: () => {},
  weatherBgClass: '',
  setWeatherBgClass: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [weatherBgClass, setWeatherBgClass] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const body = document.body;
    body.className = body.className.replace(/weather-bg-\S+/g, '').trim();
    if (weatherBgClass) body.classList.add(`weather-bg-${weatherBgClass}`);
  }, [weatherBgClass]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, weatherBgClass, setWeatherBgClass }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
