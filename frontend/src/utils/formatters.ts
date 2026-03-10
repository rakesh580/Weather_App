export function formatTemp(temp: number): string {
  return `${Math.round(temp)}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLocalTime(timezoneOffset: number): { time: string; date: string } {
  const now = new Date();
  const localMs = now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 1000;
  const localDate = new Date(localMs);
  return {
    time: localDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    date: localDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
  };
}

export function sunTimeStr(ts: number, tzOffset: number): string {
  const d = new Date((ts + tzOffset) * 1000);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
}
