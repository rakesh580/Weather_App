import { useState, useEffect } from 'react';
import { cityClock } from '../utils/time';

/** Ticking clock in a city's local time. Returns `now` (ms) too so other derived values can update. */
export function useCityClock(timezoneOffset: number | null) {
  const [state, setState] = useState<{ time: string; date: string; now: number }>({ time: '', date: '', now: 0 });

  useEffect(() => {
    if (timezoneOffset === null) return;
    const update = () => {
      const d = new Date();
      setState({ ...cityClock(timezoneOffset, d), now: d.getTime() });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezoneOffset]);

  return state;
}
