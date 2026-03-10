export interface JourneyRequest {
  origin_lat: number;
  origin_lon: number;
  origin_name: string;
  dest_lat: number;
  dest_lon: number;
  dest_name: string;
  departure_time: string;
  avg_speed_mph?: number;
}

export interface WaypointWeather {
  temperature: number;
  humidity: number;
  wind_speed: number;
  description: string;
  weather_id: number;
  weather_icon: string;
  feels_like?: number;
  pressure?: number;
  clouds_pct?: number;
  visibility?: number;
  pop?: number;
  wind_deg?: number;
  rain_3h?: number;
  snow_3h?: number;
}

export interface Waypoint {
  lat: number;
  lon: number;
  name: string;
  distance_from_origin_miles: number;
  estimated_arrival: string;
  weather: WaypointWeather;
  severity: string;
  color: string;
  route_bearing?: number;
  sunrise?: string;
  sunset?: string;
  elevation_ft?: number | null;
}

export interface Segment {
  coords: [number, number][];
  color: string;
  severity: string;
}

export interface JourneyResponse {
  route_coords: [number, number][];
  total_distance_miles: number;
  total_duration_hours: number;
  waypoints: Waypoint[];
  segments: Segment[];
  used_real_route: boolean;
}

export interface CityData {
  lat: number;
  lon: number;
  name: string;
}

export interface SavedJourney {
  id: string;
  origin_name: string;
  dest_name: string;
  departure_time: string;
  saved_at: string;
  request: JourneyRequest;
  summary: {
    distance_miles: number;
    duration_hours: number;
    worst_severity: string;
  };
}
