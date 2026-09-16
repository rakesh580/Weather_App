import { describe, it, expect } from 'vitest';
import { aggregateDailyForecast } from './forecastAggregator';
import type { ForecastEntry } from '../types/weather';

function entry(dt: number, temperature: number, weather_id = 800, pop = 0): ForecastEntry {
  return { dt, time: '', temperature, feels_like: temperature, humidity: 50, pressure: 1010, weather: weather_id === 500 ? 'rain' : 'clear', weather_id, weather_icon: '01d', wind_speed: 5, pop };
}

describe('aggregateDailyForecast', () => {
  it('groups 3-hourly entries by the city day and computes high/low/pop', () => {
    const start = Date.UTC(2026, 5, 21, 0, 0) / 1000; // 00:00 UTC
    const entries = Array.from({ length: 16 }, (_, i) => entry(start + i * 10800, 50 + i, i === 3 ? 500 : 800, i === 3 ? 0.7 : 0));
    const days = aggregateDailyForecast(entries, 0);
    expect(days).toHaveLength(2);
    expect(days[0].low).toBe(50);
    expect(days[0].high).toBe(57);
    expect(days[0].pop).toBe(70);
    expect(days[0].weather_id).toBe(500); // most severe condition wins
    expect(days[1].low).toBe(58);
  });

  it('uses the city offset for day boundaries', () => {
    const start = Date.UTC(2026, 5, 21, 22, 0) / 1000; // 22:00 UTC = 07:00 next day in Tokyo
    const entries = [entry(start, 60), entry(start + 10800, 62)];
    expect(aggregateDailyForecast(entries, 0)).toHaveLength(2);
    expect(aggregateDailyForecast(entries, 9 * 3600)).toHaveLength(1);
  });

  it('returns an empty list for no data', () => {
    expect(aggregateDailyForecast([], 0)).toEqual([]);
  });
});
