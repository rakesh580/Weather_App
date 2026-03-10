import { apiGet } from './client';
import type { ActivityType, ActivityResponse } from '../types/activity';

export function getActivityTypes(): Promise<ActivityType[]> {
  return apiGet<ActivityType[]>('/api/activity/types');
}

export function optimizeActivity(
  lat: number,
  lon: number,
  activity: string,
  durationHours: number = 1,
): Promise<ActivityResponse> {
  return apiGet<ActivityResponse>('/api/activity/optimize', {
    lat: String(lat),
    lon: String(lon),
    activity,
    duration_hours: String(durationHours),
  });
}
