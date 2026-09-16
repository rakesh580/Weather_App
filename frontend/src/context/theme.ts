import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  weatherBgClass: string;
  setWeatherBgClass: (cls: string) => void;
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  toggleTheme: () => {},
  weatherBgClass: '',
  setWeatherBgClass: () => {},
});
