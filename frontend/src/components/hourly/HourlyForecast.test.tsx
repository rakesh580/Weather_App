import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HourlyForecast from './HourlyForecast';
import { WeatherContext, type WeatherCtx } from '../../context/weather';
import type { HourlyResponse } from '../../types/weather';

const base = Date.UTC(2026, 5, 21, 12, 0) / 1000;
const hourly: HourlyResponse = {
  timezone: 'America/Los_Angeles',
  utc_offset_seconds: -7 * 3600,
  daily: [],
  hourly: Array.from({ length: 6 }, (_, i) => ({
    dt: base + i * 3600, temperature: 60 + i, feels_like: 59 + i, pop: i === 2 ? 0.8 : 0.05, precip_in: 0,
    weather_code: i === 2 ? 61 : 1, wind_speed: 5, wind_gust: 8, humidity: 50, uvi: 3, is_day: true, clouds: 20,
  })),
};

function renderWith(value: Partial<WeatherCtx>) {
  const ctx: WeatherCtx = {
    location: { lat: 47.6, lon: -122.33 }, weather: null, forecast: null, hourly: null, alerts: null,
    loading: false, refreshing: false, error: null, unit: 'F', setUnit: () => {}, toggleUnit: () => {},
    loadWeather: () => {}, refresh: () => {}, clearLocation: () => {}, ...value,
  };
  return render(<WeatherContext.Provider value={ctx}><HourlyForecast /></WeatherContext.Provider>);
}

describe('HourlyForecast', () => {
  it('renders one card per hour in the city timezone with precipitation chance', () => {
    renderWith({ hourly });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent('Now');
    expect(items[1]).toHaveTextContent('6 AM'); // 13:00 UTC → 06:00 PDT
    expect(items[2]).toHaveTextContent('80%');
    expect(items[2]).toHaveTextContent('62°');
  });

  it('converts to Celsius', () => {
    renderWith({ hourly, unit: 'C' });
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('16°'); // 60°F
  });

  it('shows a skeleton while loading and nothing without a location', () => {
    renderWith({ hourly: null });
    expect(screen.getByLabelText('Hourly forecast')).toBeInTheDocument();
    const { container } = renderWith({ hourly: null, location: null });
    expect(container).toBeEmptyDOMElement();
  });
});
