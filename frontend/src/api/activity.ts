import { apiGet, type RequestOptions } from './client';
import type { ActivityType, ActivityResponse } from '../types/activity';

export function getActivityTypes(opts?: RequestOptions): Promise<ActivityType[]> {
  return apiGet<ActivityType[]>('/api/activity/types', undefined, opts);
}

export function optimizeActivity(lat: number, lon: number, activity: string, opts?: RequestOptions): Promise<ActivityResponse> {
  return apiGet<ActivityResponse>('/api/activity/optimize', { lat: String(lat), lon: String(lon), activity }, opts);
}
