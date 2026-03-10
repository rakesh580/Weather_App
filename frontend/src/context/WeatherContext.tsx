import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getWeatherByCoords, getForecastByCoords, getAirQuality, getUVIndex } from '../api/weather';
import { getWeatherIcon } from '../utils/weatherIcons';
import { useTheme } from './ThemeContext';
import type { WeatherData, ForecastResponse } from '../types/weather';

interface WeatherCtx {
  weather: WeatherData | null;
  forecast: ForecastResponse | null;
  loading: boolean;
  unit: 'F' | 'C';
  toggleUnit: () => void;
  loadWeather: (lat: number, lon: number, name?: string) => Promise<void>;
}

const WeatherContext = createContext<WeatherCtx>({
  weather: null,
  forecast: null,
  loading: false,
  unit: 'F',
  toggleUnit: () => {},
  loadWeather: async () => {},
});

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<'F' | 'C'>(() => {
    const saved = localStorage.getItem('skypulse-unit');
    return saved === 'C' ? 'C' : 'F';
  });
  const { setWeatherBgClass } = useTheme();

  const toggleUnit = useCallback(() => {
    setUnit(u => {
      const next = u === 'F' ? 'C' : 'F';
      localStorage.setItem('skypulse-unit', next);
      return next;
    });
  }, []);

  const loadWeather = useCallback(async (lat: number, lon: number, name?: string) => {
    setLoading(true);
    try {
      const [w, fc] = await Promise.all([
        getWeatherByCoords(lat, lon, name),
        getForecastByCoords(lat, lon),
      ]);
      // Fetch UV and Air Quality in parallel (non-blocking)
      const [uvResult, aqResult] = await Promise.allSettled([
        getUVIndex(lat, lon),
        getAirQuality(lat, lon),
      ]);
      const uvi = uvResult.status === 'fulfilled' ? uvResult.value.uvi : undefined;
      const aqData = aqResult.status === 'fulfilled' ? aqResult.value : undefined;

      setWeather({
        ...w,
        ...(uvi != null ? { uvi } : {}),
        ...(aqData?.aqi != null ? { aqi: aqData.aqi, aqi_label: aqData.aqi_label ?? undefined } : {}),
      });
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
    <WeatherContext.Provider value={{ weather, forecast, loading, unit, toggleUnit, loadWeather }}>
      {children}
    </WeatherContext.Provider>
  );
}

export const useWeather = () => useContext(WeatherContext);
