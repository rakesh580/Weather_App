import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { searchCity } from '../../api/weather';
import type { SearchResult } from '../../types/weather';
import type { CityData } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  label: string;
  onSelect: (data: CityData) => void;
  value?: string;
}

export default function JourneyCityInput({ label, onSelect, value }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounced.length < 2) { setOpen(false); return; }
    searchCity(debounced).then(r => {
      setResults(r);
      setOpen(r.length > 0);
    }).catch(() => setOpen(false));
  }, [debounced]);

  const select = (r: SearchResult) => {
    setQuery(r.name);
    setOpen(false);
    onSelect({ lat: r.lat, lon: r.lon, name: r.name });
  };

  return (
    <div className={s.field}>
      <label className={s.fieldLabel}>{label}</label>
      <input
        className={s.fieldInput}
        type="text"
        placeholder={`Search ${label.toLowerCase()}...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && results.length > 0 && (
        <div className={s.dropdown}>
          {results.map((r, i) => (
            <div key={i} className={s.dropdownItem} onMouseDown={() => select(r)}>
              <div className={s.dropdownName}>{r.name}</div>
              <div className={s.dropdownDetail}>{[r.state, r.country].filter(Boolean).join(', ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
