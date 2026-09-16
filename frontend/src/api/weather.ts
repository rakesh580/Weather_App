import { apiGet, type RequestOptions } from './client';
import type {
  WeatherData, ForecastResponse, SearchResult, HourlyResponse, AlertsResponse, BriefingResponse, HealthResponse,
} from '../types/weather';

const coords = (lat: number, lon: number) => ({ lat: String(lat), lon: String(lon) });

export function searchCity(q: string, limit = 5, opts?: RequestOptions): Promise<SearchResult[]> {
  return apiGet<SearchResult[]>('/api/search', { q, limit: String(limit) }, opts);
}

export function getWeatherByCoords(lat: number, lon: number, name?: string, opts?: RequestOptions): Promise<WeatherData> {
  return apiGet<WeatherData>('/api/weather/coords', { ...coords(lat, lon), ...(name ? { name } : {}) }, opts);
}

export function getForecastByCoords(lat: number, lon: number, opts?: RequestOptions): Promise<ForecastResponse> {
  return apiGet<ForecastResponse>('/api/forecast/coords', coords(lat, lon), opts);
}

export function getHourly(lat: number, lon: number, hours = 48, opts?: RequestOptions): Promise<HourlyResponse> {
  return apiGet<HourlyResponse>('/api/hourly', { ...coords(lat, lon), hours: String(hours) }, opts);
}

export function getAlerts(lat: number, lon: number, opts?: RequestOptions): Promise<AlertsResponse> {
  return apiGet<AlertsResponse>('/api/alerts', coords(lat, lon), opts);
}

export function getBriefing(lat: number, lon: number, name?: string, opts?: RequestOptions): Promise<BriefingResponse> {
  return apiGet<BriefingResponse>('/api/briefing', { ...coords(lat, lon), ...(name ? { name } : {}) }, { timeoutMs: 45_000, ...opts });
}

export function getServerHealth(opts?: RequestOptions): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/api/health', undefined, opts);
}

export function geocodeAddress(q: string, limit = 5, opts?: RequestOptions): Promise<SearchResult[]> {
  return apiGet<SearchResult[]>('/api/geocode', { q, limit: String(limit) }, opts);
}

export function getAirQuality(lat: number, lon: number, opts?: RequestOptions): Promise<{ aqi: number | null; aqi_label: string | null; components: Record<string, number> }> {
  return apiGet('/api/airquality', coords(lat, lon), opts);
}

export function getUVIndex(lat: number, lon: number, opts?: RequestOptions): Promise<{ uvi: number | null; source?: string }> {
  return apiGet('/api/uv', coords(lat, lon), opts);
}
