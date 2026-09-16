import { apiGet, type RequestOptions } from './client';
import type { PressureTrend } from '../types/health';

export function getPressureTrend(lat: number, lon: number, opts?: RequestOptions): Promise<PressureTrend> {
  return apiGet<PressureTrend>('/api/health/pressure-trend', { lat: String(lat), lon: String(lon) }, opts);
}
