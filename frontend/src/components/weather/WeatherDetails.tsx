import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import InfoTooltip from '../ui/InfoTooltip';
import { convertTemp } from '../../utils/tempUtils';
import { formatWind, formatVisibility } from '../../utils/units';
import s from '../../styles/components/details.module.css';

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function getMeterColor(percent: number, type: 'blue' | 'green-orange' | 'green' | 'uv' | 'aqi'): string {
  if (type === 'blue') return `hsl(${210 - percent * 0.4}, 70%, 50%)`;
  if (type === 'green-orange') return percent < 50 ? '#16a34a' : percent < 80 ? '#f59e0b' : '#dc2626';
  if (type === 'green') return percent > 60 ? '#16a34a' : percent > 30 ? '#f59e0b' : '#dc2626';
  if (type === 'uv') {
    if (percent < 20) return '#16a34a';
    if (percent < 45) return '#eab308';
    if (percent < 65) return '#f59e0b';
    if (percent < 82) return '#dc2626';
    return '#7c3aed';
  }
  if (percent <= 20) return '#16a34a';
  if (percent <= 40) return '#65a30d';
  if (percent <= 60) return '#f59e0b';
  if (percent <= 80) return '#dc2626';
  return '#7f1d1d';
}

function getUVLabel(uvi: number): string {
  if (uvi <= 2) return 'Low';
  if (uvi <= 5) return 'Moderate';
  if (uvi <= 7) return 'High';
  if (uvi <= 10) return 'Very High';
  return 'Extreme';
}

function compass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

interface Detail {
  key: string;
  icon: string;
  value: string;
  label: string;
  trend?: { icon: string; text: string; color: string } | null;
  meter?: { percent: number; color: string };
  windDeg?: number | null;
  tooltip?: string;
}

export default function WeatherDetails() {
  const { weather, forecast, hourly, unit } = useWeather();

  // Pressure tendency over the next ~6h (two 3-hour steps); ±2 hPa is the usual "changing" threshold.
  const pressureTrend = useMemo(() => {
    if (weather?.pressure == null || !forecast?.forecast || forecast.forecast.length < 3) return null;
    const future = forecast.forecast[2].pressure;
    if (future == null) return null;
    const diff = future - weather.pressure;
    if (diff >= 2) return { icon: 'fa-arrow-trend-up', text: 'Rising', color: '#16a34a' };
    if (diff <= -2) return { icon: 'fa-arrow-trend-down', text: 'Falling', color: '#dc2626' };
    return { icon: 'fa-arrow-right', text: 'Steady', color: 'var(--text-muted)' };
  }, [weather, forecast]);

  if (!weather) return null;

  const humidityPct = weather.humidity;
  const windPct = Math.min(100, (weather.wind_speed / 40) * 100);
  const visPct = weather.visibility ? Math.min(100, (weather.visibility / 10000) * 100) : 0;
  const uviPct = weather.uvi != null ? Math.min(100, (weather.uvi / 11) * 100) : 0;
  const aqiPct = weather.aqi != null ? (weather.aqi / 5) * 100 : 0;
  const feels = weather.feels_like ?? weather.temperature;
  const gust = weather.wind_gust ?? hourly?.hourly?.[0]?.wind_gust ?? null;

  const details: Detail[] = [
    { key: 'feels', icon: 'fa-temperature-half', value: `${convertTemp(feels, unit)}°${unit}`, label: 'Feels Like',
      tooltip: 'Apparent temperature accounting for humidity and wind' },
    { key: 'humidity', icon: 'fa-droplet', value: `${weather.humidity}%`, label: 'Humidity',
      meter: { percent: humidityPct, color: getMeterColor(humidityPct, 'blue') } },
    { key: 'wind', icon: 'fa-wind', value: formatWind(weather.wind_speed, unit),
      label: weather.wind_deg != null ? `Wind · ${compass(weather.wind_deg)}${gust ? ` · gusts ${formatWind(gust, unit)}` : ''}` : 'Wind',
      meter: { percent: windPct, color: getMeterColor(windPct, 'green-orange') }, windDeg: weather.wind_deg },
    { key: 'pressure', icon: 'fa-gauge-high', value: weather.pressure != null ? `${weather.pressure} hPa` : '--', label: 'Pressure', trend: pressureTrend,
      tooltip: 'Falling pressure often precedes unsettled weather; rising pressure suggests clearing' },
    { key: 'visibility', icon: 'fa-eye', value: formatVisibility(weather.visibility, unit), label: 'Visibility',
      meter: weather.visibility ? { percent: visPct, color: getMeterColor(visPct, 'green') } : undefined },
    { key: 'uv', icon: 'fa-sun', value: weather.uvi != null ? `${weather.uvi}` : '--',
      label: weather.uvi != null ? `UV · ${getUVLabel(weather.uvi)}` : 'UV Index',
      meter: weather.uvi != null ? { percent: uviPct, color: getMeterColor(uviPct, 'uv') } : undefined,
      tooltip: '0–2 Low, 3–5 Moderate, 6–7 High, 8–10 Very High, 11+ Extreme' },
    { key: 'aqi', icon: 'fa-lungs', value: weather.aqi_label ?? (weather.aqi != null ? `${weather.aqi}` : '--'), label: 'Air Quality',
      meter: weather.aqi != null ? { percent: aqiPct, color: getMeterColor(aqiPct, 'aqi') } : undefined,
      tooltip: 'OpenWeatherMap index: 1 Good, 2 Fair, 3 Moderate, 4 Poor, 5 Very Poor' },
  ];

  return (
    <motion.div className={s.grid} variants={containerVariants} initial="hidden" animate="show" role="list" aria-label="Weather details">
      {details.map(d => (
        <motion.div key={d.key} className={s.card} variants={itemVariants} role="listitem" aria-label={`${d.label}: ${d.value}`}>
          <div className={s.icon} aria-hidden="true"><i className={`fa-solid ${d.icon}`} /></div>
          <div className={s.value}>
            {d.value}
            {d.windDeg != null && (
              <i className={`fa-solid fa-arrow-up ${s.windArrow}`} style={{ transform: `rotate(${(d.windDeg + 180) % 360}deg)` }} aria-hidden="true" title="Wind direction (blowing towards)" />
            )}
          </div>
          <div className={s.label}>
            {d.label}
            {d.tooltip && <InfoTooltip text={d.tooltip} label={`About ${d.label}`} />}
          </div>
          {d.trend && (
            <div className={s.trend} style={{ color: d.trend.color }}>
              <i className={`fa-solid ${d.trend.icon}`} aria-hidden="true" /> {d.trend.text}
            </div>
          )}
          {d.meter && (
            <div className={s.meter} role="meter" aria-valuenow={Math.round(d.meter.percent)} aria-valuemin={0} aria-valuemax={100} aria-label={`${d.label} level`}>
              <div className={s.meterFill} style={{ width: `${d.meter.percent}%`, background: d.meter.color }} />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
