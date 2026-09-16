import { apiGet, type RequestOptions } from './client';
import type { MicroclimateData } from '../types/microclimate';

export function getMicroclimate(lat: number, lon: number, opts?: RequestOptions): Promise<MicroclimateData> {
  return apiGet<MicroclimateData>('/api/microclimate', { lat: String(lat), lon: String(lon) }, opts);
}
