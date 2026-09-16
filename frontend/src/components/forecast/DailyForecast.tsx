import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { aggregateDailyForecast } from '../../utils/forecastAggregator';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { useWeather } from '../../hooks/useWeather';
import { convertTemp } from '../../utils/tempUtils';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

interface Props { entries: ForecastEntry[]; timezoneOffset: number; }

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.35 } } };

function tempColor(f: number): string {
  if (f >= 90) return '#dc2626';
  if (f >= 75) return '#f97316';
  if (f >= 60) return '#eab308';
  if (f >= 45) return '#22c55e';
  if (f >= 32) return '#3b82f6';
  return '#8b5cf6';
}

export default function DailyForecast({ entries, timezoneOffset }: Props) {
  const { unit } = useWeather();
  const days = useMemo(() => aggregateDailyForecast(entries, timezoneOffset), [entries, timezoneOffset]);
  if (days.length === 0) return null;

  const allTemps = days.flatMap(d => [d.high, d.low]);
  const minT = Math.min(...allTemps);
  const maxT = Math.max(...allTemps);
  const range = maxT - minT || 1;

  return (
    <motion.ol className={s.dailyList} variants={containerVariants} initial="hidden" animate="show" aria-label="5-day forecast">
      {days.map(d => {
        const icon = getWeatherIcon(d.weather_id, d.weather_icon);
        const barLeft = ((d.low - minT) / range) * 100;
        const barWidth = Math.max(4, ((d.high - d.low) / range) * 100);
        return (
          <motion.li key={d.date} className={s.dailyCard} variants={itemVariants}>
            <div className={s.dailyDay}>{d.weekday}<span className={s.dailyDate}>{d.date}</span></div>
            <div className={s.dailyIcon} aria-hidden="true"><i className={`${icon.iconClass} ${icon.animClass}`} /></div>
            <div className={s.dailyPop}>{d.pop > 0 && <><i className="fa-solid fa-droplet" aria-hidden="true" /> {d.pop}%</>}</div>
            <div className={s.dailyTemps}>
              <span className={s.dailyLow}>{convertTemp(d.low, unit)}&deg;</span>
              <div className={s.dailyTempBar} aria-hidden="true">
                <div className={s.dailyTempFill} style={{ marginLeft: `${barLeft}%`, width: `${barWidth}%`, background: `linear-gradient(90deg, ${tempColor(d.low)}, ${tempColor(d.high)})` }} />
              </div>
              <span className={s.dailyHigh}>{convertTemp(d.high, unit)}&deg;</span>
            </div>
            <div className={s.dailyDesc}>{d.weather}</div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
