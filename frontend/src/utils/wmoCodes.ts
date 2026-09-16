/** WMO weather interpretation codes (Open-Meteo) → description + Font Awesome icon. */
export interface WmoInfo {
  description: string;
  icon: string;
  precip: boolean;
}

export function wmoInfo(code: number | null | undefined, isDay = true): WmoInfo {
  if (code == null) return { description: 'Unknown', icon: 'fa-cloud', precip: false };
  if (code === 0) return { description: 'Clear', icon: isDay ? 'fa-sun' : 'fa-moon', precip: false };
  if (code === 1) return { description: 'Mostly clear', icon: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', precip: false };
  if (code === 2) return { description: 'Partly cloudy', icon: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', precip: false };
  if (code === 3) return { description: 'Overcast', icon: 'fa-cloud', precip: false };
  if (code === 45 || code === 48) return { description: 'Fog', icon: 'fa-smog', precip: false };
  if (code >= 51 && code <= 57) return { description: 'Drizzle', icon: 'fa-cloud-rain', precip: true };
  if (code >= 61 && code <= 67) return { description: code >= 65 ? 'Heavy rain' : 'Rain', icon: 'fa-cloud-showers-heavy', precip: true };
  if (code >= 71 && code <= 77) return { description: 'Snow', icon: 'fa-snowflake', precip: true };
  if (code >= 80 && code <= 82) return { description: 'Showers', icon: 'fa-cloud-showers-heavy', precip: true };
  if (code === 85 || code === 86) return { description: 'Snow showers', icon: 'fa-snowflake', precip: true };
  if (code >= 95) return { description: 'Thunderstorm', icon: 'fa-cloud-bolt', precip: true };
  return { description: 'Cloudy', icon: 'fa-cloud', precip: false };
}
