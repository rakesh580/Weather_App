export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  feels_like: number | null;
  temp_min?: number | null;
  temp_max?: number | null;
  humidity: number;
  pressure: number | null;
  visibility: number | null;
  weather: string;
  weather_id: number;
  weather_icon: string;
  wind_speed: number;
  wind_deg?: number | null;
  wind_gust?: number | null;
  clouds: number;
  rain_1h?: number | null;
  snow_1h?: number | null;
  uvi?: number;
  aqi?: number;
  aqi_label?: string;
  dt: number;
  timezone_offset: number;
  sunrise: number | null;
  sunset: number | null;
}

export interface ForecastEntry {
  dt: number;
  time: string;
  temperature: number;
  feels_like: number | null;
  humidity: number;
  pressure: number | null;
  weather: string;
  weather_id: number;
  weather_icon: string;
  wind_speed: number;
  wind_deg?: number | null;
  clouds?: number;
  pop?: number;
  rain_3h?: number;
  snow_3h?: number;
}

export interface ForecastResponse {
  city: string;
  country: string;
  timezone_offset: number;
  forecast: ForecastEntry[];
}

export interface HourlyEntry {
  dt: number;
  temperature: number | null;
  feels_like: number | null;
  pop: number;
  precip_in: number;
  weather_code: number | null;
  wind_speed: number | null;
  wind_gust: number | null;
  humidity: number | null;
  uvi: number | null;
  is_day: boolean;
  clouds: number | null;
}

export interface DailySummary {
  date: number;
  sunrise: number | null;
  sunset: number | null;
  uv_max: number | null;
  high: number | null;
  low: number | null;
  pop_max: number | null;
}

export interface HourlyResponse {
  timezone: string | null;
  utc_offset_seconds: number;
  hourly: HourlyEntry[];
  daily: DailySummary[];
}

export interface WeatherAlert {
  id: string;
  event: string;
  headline: string | null;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: string | null;
  certainty: string | null;
  onset: string | null;
  ends: string | null;
  sender: string | null;
  description: string;
  instruction: string;
  areas: string | null;
}

export interface AlertsResponse {
  alerts: WeatherAlert[];
  coverage: 'us' | 'unsupported' | 'unavailable';
}

export interface BriefingResponse {
  briefing: string;
  city: string;
  generated_at: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  providers: { openweathermap: boolean; openrouteservice: boolean; ai: string | null };
}

export interface SearchResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface DailyForecast {
  date: string;
  weekday: string;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  weather_id: number;
  weather_icon: string;
  weather: string;
  pop: number;
}

export interface ComfortResult {
  score: number;
  color: string;
  status: string;
}

export interface ClothingChip {
  icon: string;
  text: string;
}
