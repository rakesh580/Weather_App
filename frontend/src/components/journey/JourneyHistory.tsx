import { useState } from 'react';
import { useJourneyHistory, journeyHistory } from '../../utils/journeyHistory';
import type { SavedJourney } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  onReplan: (journey: SavedJourney) => void;
}

export default function JourneyHistory({ onReplan }: Props) {
  const history = useJourneyHistory();
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className={s.historyPanel}>
      <button className={s.historyToggle} onClick={() => setOpen(!open)} aria-expanded={open}>
        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Recent Journeys ({history.length})
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }} aria-hidden="true" />
      </button>
      {open && (
        <ul className={s.historyList}>
          {history.map(j => (
            <li key={j.id} className={s.historyItem}>
              <button className={s.historyRoute} onClick={() => onReplan(j)}>
                <strong>{j.origin_name}</strong> → <strong>{j.dest_name}</strong>
                <span className={s.historyMeta}>
                  {Math.round(j.summary.distance_miles)} mi &middot; {new Date(j.departure_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}
                </span>
              </button>
              <button className={s.historyDelete} onClick={() => journeyHistory.remove(j.id)} aria-label={`Remove journey ${j.origin_name} to ${j.dest_name}`}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
