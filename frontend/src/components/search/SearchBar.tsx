import { useState, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useGeolocation } from '../../hooks/useGeolocation';
import { searchCity } from '../../api/weather';
import { useWeather } from '../../context/WeatherContext';
import type { SearchResult } from '../../types/weather';
import s from '../../styles/components/search.module.css';
import { useEffect } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 300);
  const { getLocation, loading: geoLoading } = useGeolocation();
  const { loadWeather } = useWeather();

  useEffect(() => {
    if (debounced.length < 2) { setOpen(false); return; }
    searchCity(debounced).then(r => {
      setResults(r);
      setOpen(r.length > 0);
    }).catch(() => setOpen(false));
  }, [debounced]);

  const select = useCallback((r: SearchResult) => {
    setQuery(r.name);
    setOpen(false);
    loadWeather(r.lat, r.lon, r.name);
  }, [loadWeather]);

  const handleGeo = useCallback(async () => {
    try {
      const { lat, lon } = await getLocation();
      loadWeather(lat, lon);
    } catch {
      alert('Could not get your location. Please allow location access.');
    }
  }, [getLocation, loadWeather]);

  return (
    <div className={s.section}>
      <div className={s.wrapper}>
        <i className={`fa-solid fa-magnifying-glass ${s.icon}`} />
        <input
          className={s.input}
          type="text"
          placeholder="Search any city..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        <button className={s.locationBtn} onClick={handleGeo} aria-label="Use my location">
          <i className={geoLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'} />
        </button>
        {open && results.length > 0 && (
          <div className={s.dropdown}>
            {results.map((r, i) => (
              <div key={i} className={s.result} onMouseDown={() => select(r)}>
                <div className={s.resultName}>{r.name}</div>
                <div className={s.resultDetail}>{[r.state, r.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
