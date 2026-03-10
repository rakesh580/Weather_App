import { apiPost } from './client';
import type { JourneyRequest, JourneyResponse } from '../types/journey';

export function planJourney(req: JourneyRequest): Promise<JourneyResponse> {
  return apiPost<JourneyResponse>('/api/journey', req);
}
