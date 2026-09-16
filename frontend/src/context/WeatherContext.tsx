import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getWeatherByCoords, getForecastByCoords, getAirQuality, getUVIndex, getHourly, getAlerts } from '../api/weather';
import { errorMessage } from '../api/client';
import { getWeatherIcon } from '../utils/weatherIcons';
import { parseLocation, writeLocation, type UrlLocation as Location } from '../utils/urlState';
import { safeStorage } from '../utils/storage';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { WeatherContext, type Unit } from './weather';
import { locationKey } from '../utils/location';
import type { WeatherData } from '../types/weather';

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location | null>(() => parseLocation());
  const [unit, setUnitState] = useState<Unit>(() => (safeStorage.get('skypulse-unit') === 'C' ? 'C' : 'F'));
  const { setWeatherBgClass } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const key = locationKey(location);
  const enabled = !!location;

  const weatherQ = useQuery({
    queryKey: ['weather', key],
    queryFn: ({ signal }) => getWeatherByCoords(location!.lat, location!.lon, location!.name, { signal }),
    enabled,
    placeholderData: keepPreviousData,
  });
  const forecastQ = useQuery({
    queryKey: ['forecast', key],
    queryFn: ({ signal }) => getForecastByCoords(location!.lat, location!.lon, { signal }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 15 * 60 * 1000,
  });
  const uvQ = useQuery({
    queryKey: ['uv', key],
    queryFn: ({ signal }) => getUVIndex(location!.lat, location!.lon, { signal }),
    enabled: enabled && !!weatherQ.data,
    staleTime: 15 * 60 * 1000,
  });
  const aqQ = useQuery({
    queryKey: ['airquality', key],
    queryFn: ({ signal }) => getAirQuality(location!.lat, location!.lon, { signal }),
    enabled: enabled && !!weatherQ.data,
    staleTime: 15 * 60 * 1000,
  });
  const hourlyQ = useQuery({
    queryKey: ['hourly', key],
    queryFn: ({ signal }) => getHourly(location!.lat, location!.lon, 48, { signal }),
    enabled,
    staleTime: 15 * 60 * 1000,
  });
  const alertsQ = useQuery({
    queryKey: ['alerts', key],
    queryFn: ({ signal }) => getAlerts(location!.lat, location!.lon, { signal }),
    enabled,
  });

  // Merge the fast core payload with the slower, optional UV / AQ lookups.
  const weather = useMemo<WeatherData | null>(() => {
    const w = weatherQ.data;
    if (!w || !location) return null;
    const sameLocation = Math.abs(w.lat - location.lat) < 1e-6 && Math.abs(w.lon - location.lon) < 1e-6;
    const uvi = sameLocation ? uvQ.data?.uvi : undefined;
    const aq = sameLocation ? aqQ.data : undefined;
    return {
      ...w,
      ...(uvi != null ? { uvi } : {}),
      ...(aq?.aqi != null ? { aqi: aq.aqi, aqi_label: aq.aqi_label ?? undefined } : {}),
    };
  }, [weatherQ.data, uvQ.data, aqQ.data, location]);

  useEffect(() => {
    if (!weather) { setWeatherBgClass(''); return; }
    setWeatherBgClass(getWeatherIcon(weather.weather_id, weather.weather_icon).weatherClass);
  }, [weather, setWeatherBgClass]);

  useEffect(() => {
    writeLocation(location);
  }, [location]);

  useEffect(() => {
    const onPop = () => setLocation(parseLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const error = weatherQ.error ? errorMessage(weatherQ.error, 'Could not load weather') : null;
  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const setUnit = useCallback((u: Unit) => {
    safeStorage.set('skypulse-unit', u);
    setUnitState(u);
  }, []);
  const toggleUnit = useCallback(() => setUnit(unit === 'F' ? 'C' : 'F'), [unit, setUnit]);

  const loadWeather = useCallback((lat: number, lon: number, name?: string) => {
    setLocation({ lat, lon, ...(name ? { name } : {}) });
  }, []);

  const refresh = useCallback(() => {
    if (!key) return;
    queryClient.invalidateQueries({ predicate: q => q.queryKey[1] === key });
  }, [key, queryClient]);

  const clearLocation = useCallback(() => setLocation(null), []);

  const value = useMemo(() => ({
    location,
    weather,
    forecast: forecastQ.data ?? null,
    hourly: hourlyQ.data ?? null,
    alerts: alertsQ.data ?? null,
    loading: enabled && weatherQ.isPending,
    refreshing: weatherQ.isFetching && !weatherQ.isPending,
    error,
    unit,
    setUnit,
    toggleUnit,
    loadWeather,
    refresh,
    clearLocation,
  }), [location, weather, forecastQ.data, hourlyQ.data, alertsQ.data, enabled, weatherQ.isPending, weatherQ.isFetching, error, unit, setUnit, toggleUnit, loadWeather, refresh, clearLocation]);

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
