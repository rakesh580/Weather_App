import { useState, useEffect } from 'react';
import type { SavedJourney } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

const STORAGE_KEY = 'skypulse-journey-history';
const MAX_ITEMS = 10;

export function loadHistory(): SavedJourney[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveToHistory(journey: SavedJourney) {
  const list = loadHistory();
  list.unshift(journey);
  if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface Props {
  onReplan: (journey: SavedJourney) => void;
}

export default function JourneyHistory({ onReplan }: Props) {
  const [history, setHistory] = useState<SavedJourney[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  const remove = (id: string) => {
    const updated = history.filter(j => j.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  if (history.length === 0) return null;

  return (
    <div className={s.historyPanel}>
      <button className={s.historyToggle} onClick={() => setOpen(!open)}>
        <i className={`fa-solid fa-clock-rotate-left`} /> Recent Journeys ({history.length})
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} />
      </button>
      {open && (
        <div className={s.historyList}>
          {history.map(j => (
            <div key={j.id} className={s.historyItem}>
              <div className={s.historyRoute} onClick={() => onReplan(j)}>
                <strong>{j.origin_name}</strong> → <strong>{j.dest_name}</strong>
                <span className={s.historyMeta}>
                  {Math.round(j.summary.distance_miles)} mi &middot; {new Date(j.departure_time).toLocaleDateString()}
                </span>
              </div>
              <button className={s.historyDelete} onClick={() => remove(j.id)} title="Remove">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
