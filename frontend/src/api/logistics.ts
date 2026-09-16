import { apiPost } from './client';
import type { LogisticsStop, LogisticsResponse } from '../types/logistics';

export function optimizeLogistics(stops: LogisticsStop[], startTime: string): Promise<LogisticsResponse> {
  return apiPost<LogisticsResponse>('/api/logistics/optimize', { stops, start_time: startTime });
}
