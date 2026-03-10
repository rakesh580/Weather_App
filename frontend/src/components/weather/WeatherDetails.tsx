import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import InfoTooltip from '../ui/InfoTooltip';
import { convertTemp } from '../../utils/tempUtils';
import s from '../../styles/components/details.module.css';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getMeterColor(percent: number, type: 'blue' | 'green-orange' | 'green' | 'uv' | 'aqi'): string {
  if (type === 'blue') return `hsl(${210 - percent * 0.4}, 70%, 55%)`;
  if (type === 'green-orange') return percent < 50 ? '#48bb78' : percent < 80 ? '#f6ad55' : '#fc8181';
  if (type === 'green') return percent > 60 ? '#48bb78' : percent > 30 ? '#f6ad55' : '#fc8181';
  if (type === 'uv') {
    if (percent < 20) return '#48bb78';
    if (percent < 45) return '#f6e05e';
    if (percent < 65) return '#f6ad55';
    if (percent < 82) return '#fc8181';
    return '#9f7aea';
  }
  // aqi
  if (percent <= 20) return '#48bb78';
  if (percent <= 40) return '#68d391';
  if (percent <= 60) return '#f6ad55';
  if (percent <= 80) return '#fc8181';
  return '#9b2c2c';
}

function getUVLabel(uvi: number): string {
  if (uvi <= 2) return 'Low';
  if (uvi <= 5) return 'Moderate';
  if (uvi <= 7) return 'High';
  if (uvi <= 10) return 'Very High';
  return 'Extreme';
}

interface Detail {
  icon: string;
  value: string;
  label: string;
  trend?: { icon: string; text: string; color: string } | null;
  meter?: { percent: number; color: string };
  windDeg?: number;
  tooltip?: string;
}

export default function WeatherDetails() {
  const { weather, forecast, unit } = useWeather();

  const pressureTrend = useMemo(() => {
    if (!weather?.pressure || !forecast?.forecast || forecast.forecast.length < 3) return null;
    const diff = forecast.forecast[2].pressure - weather.pressure;
    if (diff > 1) return { icon: 'fa-arrow-up', text: 'Rising', color: '#48bb78' };
    if (diff < -1) return { icon: 'fa-arrow-down', text: 'Falling', color: '#fc8181' };
    return { icon: 'fa-arrow-right', text: 'Steady', color: 'var(--text-muted)' };
  }, [weather, forecast]);

  if (!weather) return null;

  const humidityPct = weather.humidity;
  const windPct = Math.min(100, (weather.wind_speed / 40) * 100);
  const visPct = weather.visibility ? Math.min(100, (weather.visibility / 10000) * 100) : 0;
  const uviPct = weather.uvi != null ? Math.min(100, (weather.uvi / 11) * 100) : 0;
  const aqiPct = weather.aqi != null ? (weather.aqi / 5) * 100 : 0;

  const details: Detail[] = [
    {
      icon: 'fa-temperature-half',
      value: `${convertTemp(weather.feels_like || weather.temperature, unit)}°${unit}`,
      label: 'Feels Like',
    },
    {
      icon: 'fa-droplet',
      value: `${weather.humidity}%`,
      label: 'Humidity',
      meter: { percent: humidityPct, color: getMeterColor(humidityPct, 'blue') },
    },
    {
      icon: 'fa-wind',
      value: `${weather.wind_speed} mph`,
      label: 'Wind',
      meter: { percent: windPct, color: getMeterColor(windPct, 'green-orange') },
      windDeg: weather.wind_deg,
    },
    {
      icon: 'fa-gauge-high',
      value: `${weather.pressure || '--'} hPa`,
      label: 'Pressure',
      trend: pressureTrend,
    },
    {
      icon: 'fa-eye',
      value: weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : '--',
      label: 'Visibility',
      meter: weather.visibility ? { percent: visPct, color: getMeterColor(visPct, 'green') } : undefined,
    },
    {
      icon: 'fa-sun',
      value: weather.uvi != null ? `${weather.uvi}` : '--',
      label: weather.uvi != null ? `UV · ${getUVLabel(weather.uvi)}` : 'UV Index',
      meter: weather.uvi != null ? { percent: uviPct, color: getMeterColor(uviPct, 'uv') } : undefined,
      tooltip: '0-2 Low, 3-5 Moderate, 6-7 High, 8-10 Very High, 11+ Extreme',
    },
    {
      icon: 'fa-lungs',
      value: weather.aqi_label ?? (weather.aqi != null ? `${weather.aqi}` : '--'),
      label: 'Air Quality',
      meter: weather.aqi != null ? { percent: aqiPct, color: getMeterColor(aqiPct, 'aqi') } : undefined,
      tooltip: '1 Good, 2 Fair, 3 Moderate, 4 Poor, 5 Very Poor',
    },
  ];

  return (
    <motion.div
      className={s.grid}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      role="region"
      aria-label="Weather details"
    >
      {details.map((d, i) => (
        <motion.div
          key={i}
          className={s.card}
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
          role="group"
          aria-label={`${d.label}: ${d.value}`}
        >
          <div className={s.icon}><i className={`fa-solid ${d.icon}`} /></div>
          <div className={s.value}>
            {d.value}
            {d.windDeg != null && (
              <i
                className={`fa-solid fa-location-arrow ${s.windArrow}`}
                style={{ transform: `rotate(${d.windDeg}deg)` }}
              />
            )}
          </div>
          <div className={s.label}>
            {d.label}
            {d.tooltip && <InfoTooltip text={d.tooltip} />}
          </div>
          {d.trend && (
            <div className={s.trend} style={{ color: d.trend.color }}>
              <i className={`fa-solid ${d.trend.icon}`} /> {d.trend.text}
            </div>
          )}
          {d.meter && (
            <div
              className={s.meter}
              role="meter"
              aria-valuenow={Math.round(d.meter.percent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${d.label} level`}
            >
              <div
                className={s.meterFill}
                style={{ width: `${d.meter.percent}%`, background: d.meter.color }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
