import { useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodeAddress } from '../../api/weather';
import type { SearchResult } from '../../types/weather';
import type { CityData } from '../../types/journey';
import { shortPlaceName } from '../../utils/places';
import s from '../../styles/components/journey.module.css';

interface Props {
  label: string;
  onSelect: (data: CityData) => void;
  /** Called when the user edits the text after a selection so parents can invalidate stale coordinates. */
  onClear?: () => void;
  value?: string;
  error?: string;
  placeholder?: string;
}

export default function JourneyCityInput({ label, onSelect, onClear, value, error, placeholder = 'Search city or address…' }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dirty, setDirty] = useState(false);
  const debounced = useDebounce(query, 300);
  const inputId = useId();
  const listId = useId();
  const active = dirty && debounced.length >= 2;
  const geo = useQuery({
    queryKey: ['geocode', debounced],
    queryFn: ({ signal }) => geocodeAddress(debounced, 5, { signal }),
    enabled: active,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const results: SearchResult[] = active && geo.data ? geo.data : [];
  const searching = active && geo.isFetching;

  // Sync from parent (swap / replan) without triggering a search.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setQuery(value ?? '');
    setDirty(false);
  }

  const select = (r: SearchResult) => {
    const name = shortPlaceName(r.name);
    setDirty(false);
    setQuery(name);
    setOpen(false);
    onSelect({ lat: r.lat, lon: r.lon, name });
  };

  const handleChange = (v: string) => {
    setQuery(v);
    setDirty(true);
    setOpen(true);
    setHighlightIdx(-1);
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(prev => (prev + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(prev => (prev - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); select(results[highlightIdx >= 0 ? highlightIdx : 0]); }
  };

  const showDropdown = open && active && !geo.isError && (searching || results.length > 0 || query === debounced);

  return (
    <div className={s.field}>
      {label && <label className={s.fieldLabel} htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={`${s.fieldInput} ${error ? s.fieldInputError : ''}`}
        type="text"
        placeholder={placeholder}
        aria-label={label || placeholder}
        value={query}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        onFocus={() => { if (dirty) setOpen(true); }}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={highlightIdx >= 0 ? `${listId}-${highlightIdx}` : undefined}
        aria-invalid={!!error}
        autoComplete="off"
      />
      {error && <span className={s.fieldError} role="alert">{error}</span>}

      <AnimatePresence>
        {showDropdown && (
          <motion.div className={s.dropdown} role="listbox" id={listId}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {searching && <div className={s.dropdownLoading}><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Searching…</div>}
            {!searching && results.length === 0 && debounced.length >= 2 && (
              <div className={s.dropdownEmpty}><i className="fa-solid fa-circle-info" aria-hidden="true" /> No results found</div>
            )}
            {!searching && results.map((r, i) => (
              <div
                key={`${r.lat},${r.lon}`}
                id={`${listId}-${i}`}
                className={`${s.dropdownItem} ${i === highlightIdx ? s.dropdownItemHighlighted : ''}`}
                onMouseDown={e => { e.preventDefault(); select(r); }}
                onMouseEnter={() => setHighlightIdx(i)}
                role="option"
                aria-selected={i === highlightIdx}
              >
                <div className={s.dropdownName}>{shortPlaceName(r.name)}</div>
                <div className={s.dropdownDetail}>{[r.state, r.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
