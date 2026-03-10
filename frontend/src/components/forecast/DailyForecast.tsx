import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { aggregateDailyForecast } from '../../utils/forecastAggregator';
import { getWeatherIcon } from '../../utils/weatherIcons';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

interface Props { entries: ForecastEntry[]; }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function DailyForecast({ entries }: Props) {
  const days = useMemo(() => aggregateDailyForecast(entries), [entries]);

  const allTemps = days.flatMap(d => [d.high, d.low]);
  const minT = Math.min(...allTemps);
  const maxT = Math.max(...allTemps);
  const range = maxT - minT || 1;

  return (
    <motion.div
      className={s.dailyList}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {days.map((d, i) => {
        const icon = getWeatherIcon(d.weather_id, d.weather_icon);
        const barLeft = ((d.low - minT) / range) * 100;
        const barWidth = ((d.high - d.low) / range) * 100;

        return (
          <motion.div key={i} className={s.dailyCard} variants={itemVariants}>
            <div className={s.dailyDay}>{d.weekday}</div>
            <div className={s.dailyIcon}><i className={`${icon.iconClass} ${icon.animClass}`} /></div>
            <div className={s.dailyTemps}>
              <span className={s.dailyHigh}>{d.high}&deg;</span>
              <div className={s.dailyTempBar}>
                <div className={s.dailyTempFill} style={{ marginLeft: `${barLeft}%`, width: `${barWidth}%` }} />
              </div>
              <span className={s.dailyLow}>{d.low}&deg;</span>
            </div>
            <div className={s.dailyDesc}>{d.weather}</div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
