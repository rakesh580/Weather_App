export interface ActivityType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ActivityWindow {
  start: string;       // ISO datetime
  end: string;
  score: number;       // 0-100
  temp: number;
  wind: number;
  pop: number;         // probability of precipitation 0-1
  humidity: number;
  description: string;
  weather_icon: string;
}

export interface GoldenWindow {
  start: string;
  end: string;
  avg_score: number;
  conditions: string;
  windows: ActivityWindow[];
}

export interface ActivityResponse {
  activity: ActivityType;
  best_windows: GoldenWindow[];
  all_windows: ActivityWindow[];
  avoid_windows: ActivityWindow[];
  ai_summary: string;
}
