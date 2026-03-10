import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodeAddress } from '../../api/weather';
import type { SearchResult } from '../../types/weather';
import type { CityData } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  label: string;
  onSelect: (data: CityData) => void;
  value?: string;
  error?: string;
}

export default function JourneyCityInput({ label, onSelect, value, error }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounced.length < 2) { setOpen(false); setSearching(false); return; }
    setSearching(true);
    geocodeAddress(debounced).then(r => {
      setResults(r);
      setOpen(true);
      setSearching(false);
      setHighlightIdx(-1);
    }).catch(() => { setOpen(false); setSearching(false); });
  }, [debounced]);

  const select = (r: SearchResult) => {
    setQuery(r.name);
    setOpen(false);
    onSelect({ lat: r.lat, lon: r.lon, name: r.name });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      select(results[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && (searching || results.length > 0 || (debounced.length >= 2 && !searching && results.length === 0));

  return (
    <div className={s.field}>
      <label className={s.fieldLabel}>{label}</label>
      <input
        className={`${s.fieldInput} ${error ? s.fieldInputError : ''}`}
        type="text"
        placeholder="Search city or address..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {error && <span className={s.fieldError}>{error}</span>}

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className={s.dropdown}
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {searching && (
              <div className={s.dropdownLoading}>
                <i className="fa-solid fa-spinner fa-spin" /> Searching...
              </div>
            )}
            {!searching && results.length === 0 && debounced.length >= 2 && (
              <div className={s.dropdownEmpty}>
                <i className="fa-solid fa-circle-info" /> No results found
              </div>
            )}
            {!searching && results.map((r, i) => (
              <div
                key={i}
                className={`${s.dropdownItem} ${i === highlightIdx ? s.dropdownItemHighlighted : ''}`}
                onMouseDown={() => select(r)}
                onMouseEnter={() => setHighlightIdx(i)}
                role="option"
                aria-selected={i === highlightIdx}
              >
                <div className={s.dropdownName}>{r.name}</div>
                <div className={s.dropdownDetail}>{[r.state, r.country].filter(Boolean).join(', ')}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
