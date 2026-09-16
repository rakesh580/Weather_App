export interface ActivityType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ActivityWindow {
  start: string;       // 'YYYY-MM-DD HH:MM:SS' in UTC (OpenWeatherMap dt_txt)
  dt: number;          // unix seconds — use this for display
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
