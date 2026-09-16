import { createContext } from 'react';
import type { WeatherData, ForecastResponse, HourlyResponse, AlertsResponse } from '../types/weather';

export type Unit = 'F' | 'C';

export interface Location {
  lat: number;
  lon: number;
  name?: string;
}

export interface WeatherCtx {
  location: Location | null;
  weather: WeatherData | null;
  forecast: ForecastResponse | null;
  hourly: HourlyResponse | null;
  alerts: AlertsResponse | null;
  /** first load for a location (no data yet) */
  loading: boolean;
  /** background refresh while data is shown */
  refreshing: boolean;
  error: string | null;
  unit: Unit;
  setUnit: (u: Unit) => void;
  toggleUnit: () => void;
  loadWeather: (lat: number, lon: number, name?: string) => void;
  refresh: () => void;
  clearLocation: () => void;
}

export const WeatherContext = createContext<WeatherCtx>({
  location: null,
  weather: null,
  forecast: null,
  hourly: null,
  alerts: null,
  loading: false,
  refreshing: false,
  error: null,
  unit: 'F',
  setUnit: () => {},
  toggleUnit: () => {},
  loadWeather: () => {},
  refresh: () => {},
  clearLocation: () => {},
});
