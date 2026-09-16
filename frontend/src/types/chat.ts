export interface ChatJourneyContext {
  from: string;
  to: string;
  distance_miles: number;
  duration_hours: number;
  waypoints: { name: string; severity: string; temp: number; desc: string }[];
}

export interface ChatRequest {
  message: string;
  timezone?: string;
  lat?: number;
  lon?: number;
  city?: string;
  journey_context?: ChatJourneyContext | null;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
  context_city?: string | null;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  streaming?: boolean;
  error?: boolean;
}
