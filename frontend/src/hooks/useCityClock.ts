import { useState, useEffect } from 'react';
import { formatLocalTime } from '../utils/formatters';

export function useCityClock(timezoneOffset: number | null) {
  const [clock, setClock] = useState({ time: '', date: '' });

  useEffect(() => {
    if (timezoneOffset === null) return;
    const update = () => setClock(formatLocalTime(timezoneOffset));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezoneOffset]);

  return clock;
}
