export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  weather: string;
  weather_id: number;
  weather_icon: string;
  wind_speed: number;
  wind_deg?: number;
  clouds?: number;
  uvi?: number;
  aqi?: number;
  aqi_label?: string;
  dt: number;
  timezone_offset: number;
  sunrise: number;
  sunset: number;
}

export interface ForecastEntry {
  dt: number;
  time: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  weather: string;
  weather_id: number;
  weather_icon: string;
  wind_speed: number;
  pop?: number;
}

export interface ForecastResponse {
  forecast: ForecastEntry[];
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
