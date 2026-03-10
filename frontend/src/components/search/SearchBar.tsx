import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useGeolocation } from '../../hooks/useGeolocation';
import { searchCity } from '../../api/weather';
import { useWeather } from '../../context/WeatherContext';
import { useToast } from '../ui/Toast';
import type { SearchResult } from '../../types/weather';
import s from '../../styles/components/search.module.css';

const RECENT_KEY = 'skypulse-recent-searches';
const MAX_RECENT = 5;

function loadRecent(): SearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(items: SearchResult[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>(loadRecent);
  const [showRecent, setShowRecent] = useState(false);
  const debounced = useDebounce(query, 300);
  const { getLocation, loading: geoLoading } = useGeolocation();
  const { loadWeather } = useWeather();
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setOpen(false);
      setNoResults(false);
      return;
    }
    setIsSearching(true);
    setNoResults(false);
    searchCity(debounced).then(r => {
      setResults(r);
      setOpen(r.length > 0);
      setNoResults(r.length === 0);
      setActiveIndex(-1);
    }).catch(() => {
      setOpen(false);
      setNoResults(false);
    }).finally(() => setIsSearching(false));
  }, [debounced]);

  const select = useCallback((r: SearchResult) => {
    setQuery(r.name);
    setOpen(false);
    setShowRecent(false);
    setNoResults(false);
    loadWeather(r.lat, r.lon, r.name);
    setRecentSearches(prev => {
      const filtered = prev.filter(p => !(p.lat === r.lat && p.lon === r.lon));
      const updated = [r, ...filtered].slice(0, MAX_RECENT);
      saveRecent(updated);
      return updated;
    });
  }, [loadWeather]);

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

  const displayItems = showRecent && !open && query.length < 2 ? recentSearches : results;
  const isRecentMode = showRecent && !open && query.length < 2 && recentSearches.length > 0;
  const dropdownVisible = open || isRecentMode || noResults;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdownVisible && recentSearches.length > 0) {
        setShowRecent(true);
        setActiveIndex(0);
        return;
      }
      const max = noResults ? 0 : displayItems.length - 1;
      setActiveIndex(i => Math.min(i + 1, max));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < displayItems.length) {
        select(displayItems[activeIndex]);
      } else if (displayItems.length > 0) {
        select(displayItems[0]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setShowRecent(false);
      setNoResults(false);
      setActiveIndex(-1);
    }
  };

  const handleFocus = () => {
    if (query.length < 2 && recentSearches.length > 0) {
      setShowRecent(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      setShowRecent(false);
      setNoResults(false);
      setActiveIndex(-1);
    }, 200);
  };

  const activeId = activeIndex >= 0 ? `search-option-${activeIndex}` : undefined;

  return (
    <div className={s.section}>
      <div className={s.wrapper}>
        <i className={`fa-solid ${isSearching ? 'fa-spinner fa-spin' : 'fa-magnifying-glass'} ${s.icon}`} />
        <input
          className={s.input}
          type="text"
          placeholder="Search any city..."
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          role="combobox"
          aria-expanded={dropdownVisible}
          aria-autocomplete="list"
          aria-controls="search-listbox"
          aria-activedescendant={activeId}
        />
        <button className={s.locationBtn} onClick={handleGeo} aria-label="Use my location">
          <i className={geoLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-location-crosshairs'} />
        </button>
        {dropdownVisible && (
          <div className={s.dropdown} ref={listRef} id="search-listbox" role="listbox">
            {isRecentMode && (
              <>
                <div className={s.dropdownLabel}>Recent searches</div>
                {recentSearches.map((r, i) => (
                  <div
                    key={`recent-${i}`}
                    id={`search-option-${i}`}
                    className={`${s.result} ${activeIndex === i ? s.resultActive : ''}`}
                    onMouseDown={() => select(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    role="option"
                    aria-selected={activeIndex === i}
                  >
                    <div className={s.resultName}>
                      <i className={`fa-regular fa-clock ${s.recentIcon}`} />
                      {r.name}
                    </div>
                    <div className={s.resultDetail}>
                      {[r.state, r.country].filter(Boolean).join(', ')}
                      <button
                        className={s.resultDelete}
                        onMouseDown={e => { e.stopPropagation(); removeRecent(r.lat, r.lon); }}
                        aria-label={`Remove ${r.name} from recent`}
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {open && results.map((r, i) => (
              <div
                key={i}
                id={`search-option-${i}`}
                className={`${s.result} ${activeIndex === i ? s.resultActive : ''}`}
                onMouseDown={() => select(r)}
                onMouseEnter={() => setActiveIndex(i)}
                role="option"
                aria-selected={activeIndex === i}
              >
                <div className={s.resultName}>{r.name}</div>
                <div className={s.resultDetail}>{[r.state, r.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
            {noResults && !isRecentMode && (
              <div className={s.emptyState}>
                <i className="fa-regular fa-face-frown" /> No cities found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
