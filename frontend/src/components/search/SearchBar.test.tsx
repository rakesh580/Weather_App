import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchBar from './SearchBar';
import { WeatherContext, type WeatherCtx } from '../../context/weather';
import * as api from '../../api/weather';

vi.mock('../../api/weather', async importOriginal => ({ ...(await importOriginal<typeof api>()), searchCity: vi.fn() }));

function renderBar(loadWeather = vi.fn()) {
  const ctx = { location: null, weather: null, forecast: null, hourly: null, alerts: null, loading: false, refreshing: false, error: null,
    unit: 'F', setUnit: () => {}, toggleUnit: () => {}, loadWeather, refresh: () => {}, clearLocation: () => {} } as WeatherCtx;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><WeatherContext.Provider value={ctx}><SearchBar /></WeatherContext.Provider></QueryClientProvider>);
  return { loadWeather };
}

describe('SearchBar', () => {
  beforeEach(() => vi.mocked(api.searchCity).mockReset());

  it('searches after a debounce, selects with Enter, and does not re-open the dropdown', async () => {
    vi.mocked(api.searchCity).mockResolvedValue([{ name: 'Seattle', lat: 47.6, lon: -122.33, country: 'US', state: 'Washington' }]);
    const user = userEvent.setup();
    const { loadWeather } = renderBar();
    const input = screen.getByRole('combobox', { name: /search for a city/i });
    await user.type(input, 'Sea');
    const option = await screen.findByRole('option', { name: /Seattle/ });
    expect(option).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(loadWeather).toHaveBeenCalledWith(47.6, -122.33, 'Seattle');
    expect(input).toHaveValue('Seattle');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    // selecting must not trigger a second search for "Seattle"
    expect(vi.mocked(api.searchCity)).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when nothing matches', async () => {
    vi.mocked(api.searchCity).mockResolvedValue([]);
    const user = userEvent.setup();
    renderBar();
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(await screen.findByText(/no cities found/i)).toBeInTheDocument();
  });
});
