import { apiGet } from './client';
import type { AnomalyData } from '../types/anomaly';

export function getAnomaly(lat: number, lon: number): Promise<AnomalyData> {
  return apiGet<AnomalyData>('/api/anomaly', { lat: String(lat), lon: String(lon) });
}
