import type { ForecastEntry, DailyForecast } from '../types/weather';
import { cityDayKey, cityWeekday, cityDateLabel } from './time';

interface DayBucket {
  key: string;
  label: string;
  weekday: string;
  temps: number[];
  humidities: number[];
  weatherIds: number[];
  weatherIcons: string[];
  weatherDescs: string[];
  winds: number[];
  pops: number[];
}

/** Bucket 3-hourly entries by the *city's* calendar day (using its UTC offset), not the viewer's. */
export function aggregateDailyForecast(entries: ForecastEntry[], timezoneOffset = 0, maxDays = 5): DailyForecast[] {
  const days = new Map<string, DayBucket>();

  for (const e of entries) {
    const key = cityDayKey(e.dt, timezoneOffset);
    let bucket = days.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: cityDateLabel(e.dt, timezoneOffset),
        weekday: cityWeekday(e.dt, timezoneOffset),
        temps: [], humidities: [], weatherIds: [], weatherIcons: [], weatherDescs: [], winds: [], pops: [],
      };
      days.set(key, bucket);
    }
    bucket.temps.push(e.temperature);
    bucket.humidities.push(e.humidity);
    bucket.weatherIds.push(e.weather_id);
    bucket.weatherIcons.push(e.weather_icon);
    bucket.weatherDescs.push(e.weather);
    bucket.winds.push(e.wind_speed);
    bucket.pops.push(e.pop ?? 0);
  }

  return [...days.values()].slice(0, maxDays).map(d => {
    // Prefer the most severe condition of the day (rain over clouds) as the representative icon.
    const idCounts = new Map<number, number>();
    d.weatherIds.forEach(id => idCounts.set(id, (idCounts.get(id) ?? 0) + 1));
    const severe = d.weatherIds.find(id => id < 700); // thunderstorm / drizzle / rain / snow
    const dominantId = severe ?? [...idCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const dominantIdx = d.weatherIds.indexOf(dominantId);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    return {
      date: d.label,
      weekday: d.weekday,
      high: Math.round(Math.max(...d.temps)),
      low: Math.round(Math.min(...d.temps)),
      humidity: Math.round(avg(d.humidities)),
      wind: Math.round(avg(d.winds)),
      weather_id: dominantId,
      weather_icon: d.weatherIcons[dominantIdx] || d.weatherIcons[0],
      weather: d.weatherDescs[dominantIdx] || d.weatherDescs[0],
      pop: Math.round(Math.max(...d.pops) * 100),
    };
  });
}
