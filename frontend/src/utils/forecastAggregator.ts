import type { ForecastEntry, DailyForecast } from '../types/weather';

interface DayBucket {
  key: string;
  weekday: string;
  temps: number[];
  humidities: number[];
  weatherIds: number[];
  weatherIcons: string[];
  weatherDescs: string[];
  winds: number[];
  pops: number[];
}

export function aggregateDailyForecast(entries: ForecastEntry[]): DailyForecast[] {
  const days: Record<string, DayBucket> = {};

  entries.forEach(e => {
    const date = new Date(e.dt * 1000);
    const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!days[key]) {
      days[key] = {
        key,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        temps: [], humidities: [], weatherIds: [],
        weatherIcons: [], weatherDescs: [], winds: [], pops: [],
      };
    }
    days[key].temps.push(e.temperature);
    days[key].humidities.push(e.humidity);
    days[key].weatherIds.push(e.weather_id);
    days[key].weatherIcons.push(e.weather_icon);
    days[key].weatherDescs.push(e.weather);
    days[key].winds.push(e.wind_speed);
    days[key].pops.push(e.pop ?? 0);
  });

  return Object.values(days).slice(0, 5).map(d => {
    const idCounts: Record<number, number> = {};
    d.weatherIds.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
    const dominantId = Number(
      Object.keys(idCounts).reduce((a, b) => (idCounts[Number(a)] > idCounts[Number(b)] ? a : b))
    );
    const dominantIdx = d.weatherIds.indexOf(dominantId);

    return {
      date: d.key,
      weekday: d.weekday,
      high: Math.round(Math.max(...d.temps)),
      low: Math.round(Math.min(...d.temps)),
      humidity: Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length),
      wind: Math.round(d.winds.reduce((a, b) => a + b, 0) / d.winds.length),
      weather_id: dominantId,
      weather_icon: d.weatherIcons[dominantIdx] || d.weatherIcons[0],
      weather: d.weatherDescs[dominantIdx] || d.weatherDescs[0],
      pop: Math.round(Math.max(...d.pops) * 100),
    };
  });
}
