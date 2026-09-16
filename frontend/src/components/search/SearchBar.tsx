import { useState, useCallback, useEffect, useRef, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '../../hooks/useDebounce';
import { useGeolocation } from '../../hooks/useGeolocation';
import { searchCity } from '../../api/weather';
import { useWeather } from '../../hooks/useWeather';
import { useToast } from '../../hooks/useToast';
import { safeStorage } from '../../utils/storage';
import type { SearchResult } from '../../types/weather';
import s from '../../styles/components/search.module.css';

const RECENT_KEY = 'skypulse-recent-searches';
const MAX_RECENT = 5;

function loadRecent(): SearchResult[] {
  const raw = safeStorage.getJSON<unknown>(RECENT_KEY, []);
  return Array.isArray(raw) ? (raw as SearchResult[]).filter(r => r && typeof r.lat === 'number') : [];
}

function saveRecent(items: SearchResult[]) {
  safeStorage.setJSON(RECENT_KEY, items.slice(0, MAX_RECENT));
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  /** true while the current text was typed by the user (not filled in by a selection) */
  const [dirty, setDirty] = useState(false);
  /** user dismissed the dropdown (Escape / blur / selection) */
  const [dismissed, setDismissed] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(loadRecent);
  const debounced = useDebounce(query, 300);
  const { getLocation, loading: geoLoading } = useGeolocation();
  const { loadWeather } = useWeather();
  const { showToast } = useToast();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  const searchActive = dirty && debounced.length >= 2;
  const search = useQuery({
    queryKey: ['city-search', debounced],
    queryFn: ({ signal }) => searchCity(debounced, 5, { signal }),
    enabled: searchActive,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const results: SearchResult[] = searchActive && search.data ? search.data : [];
  const isSearching = searchActive && search.isFetching;
  const settled = searchActive && query === debounced && !search.isFetching && !search.isError;
  const open = !dismissed && settled && results.length > 0;
  const noResults = !dismissed && settled && results.length === 0;

  const closeAll = useCallback(() => {
    setDismissed(true);
    setActiveIndex(-1);
  }, []);

  const select = useCallback((r: SearchResult) => {
    setDirty(false);
    setQuery(r.name);
    closeAll();
    loadWeather(r.lat, r.lon, r.name);
    setRecentSearches(prev => {
      const updated = [r, ...prev.filter(p => !(p.lat === r.lat && p.lon === r.lon))].slice(0, MAX_RECENT);
      saveRecent(updated);
      return updated;
    });
    inputRef.current?.blur();
  }, [loadWeather, closeAll]);

  const removeRecent = useCallback((lat: number, lon: number) => {
    setRecentSearches(prev => {
      const updated = prev.filter(p => !(p.lat === lat && p.lon === lon));
      saveRecent(updated);
      return updated;
    });
  }, []);

  const handleGeo = useCallback(async () => {
    try {
      const { lat, lon } = await getLocation();
      loadWeather(lat, lon);
    } catch {
      showToast('Could not get your location. Please allow location access.', 'error');
    }
  }, [getLocation, loadWeather, showToast]);

  const handleChange = (value: string) => {
    setQuery(value);
    setDirty(true);
    setDismissed(false);
    setActiveIndex(-1);
  };

  const isRecentMode = !dismissed && query.length < 2 && recentSearches.length > 0;
  const displayItems = isRecentMode ? recentSearches : results;
  const dropdownVisible = open || isRecentMode || noResults;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdownVisible && recentSearches.length > 0) {
        setDismissed(false);
        setActiveIndex(0);
        return;
      }
      setActiveIndex(i => Math.min(i + 1, Math.max(0, displayItems.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < displayItems.length) select(displayItems[activeIndex]);
      else if (displayItems.length > 0) select(displayItems[0]);
    } else if (e.key === 'Escape') {
      closeAll();
    }
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(closeAll, 180);
  };

  const activeId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className={s.section}>
      <div className={s.wrapper}>
        <i className={`fa-solid ${isSearching ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'} ${s.icon}`} aria-hidden="true" />
        <input
          id="city-search"
          ref={inputRef}
          className={s.input}
          type="text"
          placeholder="Search any city…  (press / to focus)"
          aria-label="Search for a city"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.length < 2 && recentSearches.length > 0) setDismissed(false); }}
          onBlur={handleBlur}
          role="combobox"
          aria-expanded={dropdownVisible}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          aria-busy={isSearching}
          autoComplete="off"
        />
        <button className={s.locationBtn} onClick={handleGeo} aria-label="Use my location" disabled={geoLoading}>
          <i className={geoLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'} aria-hidden="true" />
        </button>
        {dropdownVisible && (
          <div className={s.dropdown} id={listboxId} role="listbox" aria-label={isRecentMode ? 'Recent searches' : 'City results'}>
            {isRecentMode && <div className={s.dropdownLabel}>Recent searches</div>}
            {displayItems.map((r, i) => (
              <div
                key={`${r.lat},${r.lon}`}
                id={`${listboxId}-opt-${i}`}
                className={`${s.result} ${activeIndex === i ? s.resultActive : ''}`}
                onMouseDown={e => { e.preventDefault(); select(r); }}
                onMouseEnter={() => setActiveIndex(i)}
                role="option"
                aria-selected={activeIndex === i}
              >
                <div className={s.resultName}>
                  {isRecentMode && <i className={`fa-regular fa-clock ${s.recentIcon}`} aria-hidden="true" />}
                  {r.name}
                </div>
                <div className={s.resultDetail}>
                  {[r.state, r.country].filter(Boolean).join(', ')}
                  {isRecentMode && (
                    <span
                      className={s.resultDelete}
                      role="button"
                      tabIndex={-1}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); removeRecent(r.lat, r.lon); }}
                      aria-label={`Remove ${r.name} from recent`}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            {noResults && !isRecentMode && (
              <div className={s.emptyState} role="status">
                <i className="fa-regular fa-face-frown" aria-hidden="true" /> No cities found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
