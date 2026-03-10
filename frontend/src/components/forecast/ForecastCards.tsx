import { motion } from 'framer-motion';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { useWeather } from '../../context/WeatherContext';
import { convertTemp } from '../../utils/tempUtils';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

interface Props { entries: ForecastEntry[]; }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ForecastCards({ entries }: Props) {
  const { unit } = useWeather();
  return (
    <motion.div
      className={s.scroll}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {entries.map((e, i) => {
        const date = new Date(e.dt * 1000);
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const icon = getWeatherIcon(e.weather_id, e.weather_icon);

        return (
          <motion.div
            key={i}
            className={s.item}
            variants={itemVariants}
            whileHover={{ y: -6 }}
          >
            <div className={s.fcTime}>{day} {time}</div>
            <div className={s.fcIcon}><i className={`${icon.iconClass} ${icon.animClass}`} /></div>
            <div className={s.fcTemp}>{convertTemp(e.temperature, unit)}&deg;{unit}</div>
            {(e.pop ?? 0) > 0 && (
              <div className={s.fcPop}>
                <i className="fa-solid fa-droplet" /> {Math.round((e.pop ?? 0) * 100)}%
              </div>
            )}
            <div className={s.fcDesc}>{e.weather}</div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
