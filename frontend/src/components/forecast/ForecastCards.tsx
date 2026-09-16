import { motion } from 'framer-motion';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { useWeather } from '../../hooks/useWeather';
import { convertTemp } from '../../utils/tempUtils';
import { cityHour, cityWeekday } from '../../utils/time';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

interface Props { entries: ForecastEntry[]; timezoneOffset: number; }

const containerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function ForecastCards({ entries, timezoneOffset }: Props) {
  const { unit } = useWeather();
  return (
    <motion.ol className={s.scroll} variants={containerVariants} initial="hidden" animate="show" aria-label="3-hour forecast">
      {entries.map(e => {
        const icon = getWeatherIcon(e.weather_id, e.weather_icon);
        const pop = Math.round((e.pop ?? 0) * 100);
        return (
          <motion.li key={e.dt} className={s.item} variants={itemVariants} whileHover={{ y: -4 }}>
            <div className={s.fcTime}>{cityWeekday(e.dt, timezoneOffset)} {cityHour(e.dt, timezoneOffset)}</div>
            <div className={s.fcIcon} aria-hidden="true"><i className={`${icon.iconClass} ${icon.animClass}`} /></div>
            <div className={s.fcTemp}>{convertTemp(e.temperature, unit)}&deg;{unit}</div>
            {pop > 0 && (
              <div className={s.fcPop}><i className="fa-solid fa-droplet" aria-hidden="true" /> {pop}%</div>
            )}
            <div className={s.fcDesc}>{e.weather}</div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
