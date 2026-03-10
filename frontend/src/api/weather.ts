import { apiGet } from './client';
import type { WeatherData, ForecastResponse, SearchResult } from '../types/weather';

export function searchCity(q: string, limit = 5): Promise<SearchResult[]> {
  return apiGet<SearchResult[]>('/api/search', { q, limit: String(limit) });
}

export function getWeatherByCoords(lat: number, lon: number, name?: string): Promise<WeatherData> {
  const params: Record<string, string> = { lat: String(lat), lon: String(lon) };
  if (name) params.name = name;
  return apiGet<WeatherData>('/api/weather/coords', params);
}

export function getForecastByCoords(lat: number, lon: number): Promise<ForecastResponse> {
  return apiGet<ForecastResponse>('/api/forecast/coords', { lat: String(lat), lon: String(lon) });
}

export function geocodeAddress(q: string, limit = 5): Promise<SearchResult[]> {
  return apiGet<SearchResult[]>('/api/geocode', { q, limit: String(limit) });
}

export function getAirQuality(lat: number, lon: number): Promise<{ aqi: number | null; aqi_label: string | null }> {
  return apiGet('/api/airquality', { lat: String(lat), lon: String(lon) });
}

export function getUVIndex(lat: number, lon: number): Promise<{ uvi: number | null }> {
  return apiGet('/api/uv', { lat: String(lat), lon: String(lon) });
}
