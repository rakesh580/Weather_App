export interface LogisticsStop {
  lat: number;
  lon: number;
  name: string;
  duration_minutes: number;
}

export interface StopDetail {
  index: number;
  name: string;
  lat: number;
  lon: number;
  arrival: string;
  departure: string;
  weather: {
    temp: number;
    description: string;
    weather_id: number;
    wind_speed: number;
    pop: number;
  };
  penalty: number;
  score_label: string;
}

export interface LogisticsComparison {
  naive_penalty: number;
  optimized_penalty: number;
  improvement_pct: number;
  naive_distance_miles: number;
  optimized_distance_miles: number;
}

export interface LogisticsResponse {
  optimized_order: number[];
  stops_detail: StopDetail[];
  comparison: LogisticsComparison;
  ai_briefing: string;
}
