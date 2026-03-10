export interface ChatRequest {
  message: string;
  timezone: string;
  journey_context?: {
    from: string;
    to: string;
    distance_miles: number;
    duration_hours: number;
    waypoints: {
      name: string;
      severity: string;
      temp: number;
      desc: string;
    }[];
  } | null;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
}
