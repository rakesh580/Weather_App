import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getWeatherByCoords, getForecastByCoords } from '../api/weather';
import { getWeatherIcon } from '../utils/weatherIcons';
import { useTheme } from './ThemeContext';
import type { WeatherData, ForecastResponse } from '../types/weather';

interface WeatherCtx {
  weather: WeatherData | null;
  forecast: ForecastResponse | null;
  loading: boolean;
  loadWeather: (lat: number, lon: number, name?: string) => Promise<void>;
}

const WeatherContext = createContext<WeatherCtx>({
  weather: null,
  forecast: null,
  loading: false,
  loadWeather: async () => {},
});

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { setWeatherBgClass } = useTheme();

  const loadWeather = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    try {
      const [w, fc] = await Promise.all([
        getWeatherByCoords(lat, lon, name),
        getForecastByCoords(lat, lon),
      ]);
      setWeather(w);
      setForecast(fc);

      const icon = getWeatherIcon(w.weather_id, w.weather_icon);
      setWeatherBgClass(icon.weatherClass);
    } catch (e) {
      console.error('Failed to load weather:', e);
    } finally {
      setLoading(false);
    }
  }, [setWeatherBgClass]);

  return (
    <WeatherContext.Provider value={{ weather, forecast, loading, loadWeather }}>
      {children}
    </WeatherContext.Provider>
  );
}

export const useWeather = () => useContext(WeatherContext);
