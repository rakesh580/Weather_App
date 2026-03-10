import type { LogisticsStop, LogisticsResponse } from '../types/logistics';

export function optimizeLogistics(
  stops: LogisticsStop[],
  startTime: string,
): Promise<LogisticsResponse> {
  // Use POST via fetch directly since apiGet is GET-only
  const BASE = import.meta.env.VITE_API_URL || '';
  return fetch(`${BASE}/api/logistics/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stops, start_time: startTime }),
  }).then(res => {
    if (!res.ok) throw new Error('Logistics optimization failed');
    return res.json();
  });
}
