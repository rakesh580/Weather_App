import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import s from '../../styles/components/details.module.css';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function WeatherDetails() {
  const { weather, forecast } = useWeather();

  const pressureTrend = useMemo(() => {
    if (!weather?.pressure || !forecast?.forecast || forecast.forecast.length < 3) return null;
    const diff = forecast.forecast[2].pressure - weather.pressure;
    if (diff > 1) return { icon: 'fa-arrow-up', text: 'Rising', color: '#48bb78' };
    if (diff < -1) return { icon: 'fa-arrow-down', text: 'Falling', color: '#fc8181' };
    return { icon: 'fa-arrow-right', text: 'Steady', color: 'var(--text-muted)' };
  }, [weather, forecast]);

  if (!weather) return null;

  const details = [
    { icon: 'fa-temperature-half', value: `${Math.round(weather.feels_like || weather.temperature)}°F`, label: 'Feels Like' },
    { icon: 'fa-droplet', value: `${weather.humidity}%`, label: 'Humidity' },
    { icon: 'fa-wind', value: `${weather.wind_speed} mph`, label: 'Wind' },
    { icon: 'fa-gauge-high', value: `${weather.pressure || '--'} hPa`, label: 'Pressure', trend: pressureTrend },
    { icon: 'fa-eye', value: weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : '--', label: 'Visibility' },
  ];

  return (
    <motion.div
      className={s.grid}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {details.map((d, i) => (
        <motion.div
          key={i}
          className={s.card}
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
        >
          <div className={s.icon}><i className={`fa-solid ${d.icon}`} /></div>
          <div className={s.value} dangerouslySetInnerHTML={{ __html: d.value }} />
          <div className={s.label}>{d.label}</div>
          {d.trend && (
            <div className={s.trend} style={{ color: d.trend.color }}>
              <i className={`fa-solid ${d.trend.icon}`} /> {d.trend.text}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
