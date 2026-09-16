/**
 * Time helpers that render in the *searched city's* timezone (not the viewer's).
 * `offset` is the city's UTC offset in seconds (OpenWeatherMap `timezone`, Open-Meteo `utc_offset_seconds`).
 */

function shifted(ts: number, offset: number): Date {
  return new Date((ts + offset) * 1000);
}

const UTC = { timeZone: 'UTC' } as const;

export function cityHour(ts: number, offset: number): string {
  return shifted(ts, offset).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, ...UTC });
}

export function cityTime(ts: number, offset: number): string {
  return shifted(ts, offset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, ...UTC });
}

export function cityWeekday(ts: number, offset: number, style: 'short' | 'long' = 'short'): string {
  return shifted(ts, offset).toLocaleDateString('en-US', { weekday: style, ...UTC });
}

export function cityDateLabel(ts: number, offset: number): string {
  return shifted(ts, offset).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...UTC });
}

/** YYYY-MM-DD in the city's local calendar — stable bucket key for daily aggregation. */
export function cityDayKey(ts: number, offset: number): string {
  return shifted(ts, offset).toISOString().slice(0, 10);
}

export function cityHourOfDay(ts: number, offset: number): number {
  return shifted(ts, offset).getUTCHours();
}

/** Live clock for a city. */
export function cityClock(offset: number, now: Date = new Date()): { time: string; date: string } {
  const d = new Date(now.getTime() + offset * 1000);
  return {
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, ...UTC }),
    date: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', ...UTC }),
  };
}

/** "Just now", "5 min ago", "2h ago" */
export function relativeAgo(ts: number, nowMs: number = Date.now()): string {
  const mins = Math.max(0, Math.floor((nowMs / 1000 - ts) / 60));
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? '1h ago' : `${hrs}h ago`;
}

/** Value for <input type="datetime-local"> from a Date, in the viewer's local time. */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local string (viewer's local time) to an absolute ISO-8601 string with offset. */
export function datetimeLocalToISO(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d.toISOString();
}

export function defaultDeparture(hoursAhead = 1): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + hoursAhead);
  return toDatetimeLocal(d);
}
