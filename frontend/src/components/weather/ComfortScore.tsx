import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { calculateComfort, getClothingChips } from '../../utils/comfortScore';
import InfoTooltip from '../ui/InfoTooltip';
import s from '../../styles/components/comfort.module.css';

const CIRCUMFERENCE = 2 * Math.PI * 48;

export default function ComfortScore() {
  const { weather } = useWeather();

  const comfort = useMemo(() => {
    if (!weather) return null;
    const visKm = weather.visibility ? weather.visibility / 1000 : 10;
    return calculateComfort(weather.temperature, weather.humidity, weather.wind_speed, visKm);
  }, [weather]);

  const chips = useMemo(() => {
    if (!weather) return [];
    const visKm = weather.visibility ? weather.visibility / 1000 : 10;
    return getClothingChips(weather.temperature, weather.humidity, weather.wind_speed, visKm, weather.weather_id);
  }, [weather]);

  if (!weather || !comfort) return null;
  const offset = CIRCUMFERENCE - (comfort.score / 100) * CIRCUMFERENCE;

  return (
    <section className={s.section} aria-label={`Comfort score ${comfort.score} out of 100, ${comfort.status}`}>
      <motion.svg
        className={s.svg} width="110" height="110" viewBox="0 0 110 110" aria-hidden="true"
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <circle cx="55" cy="55" r="48" fill="none" stroke="var(--card-border)" strokeWidth="6" />
        <motion.circle
          cx="55" cy="55" r="48" fill="none" stroke={comfort.color} strokeWidth="6"
          strokeDasharray={CIRCUMFERENCE} strokeLinecap="round" transform="rotate(-90 55 55)"
          initial={{ strokeDashoffset: CIRCUMFERENCE }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
        <text x="55" y="55" textAnchor="middle" dy="6" fill="var(--text-primary)" fontSize="26" fontWeight="800">{comfort.score}</text>
      </motion.svg>
      <div className={s.right}>
        <div className={s.status} style={{ color: comfort.color }}>
          {comfort.status}
          <InfoTooltip text="Outdoor comfort 0–100, weighing temperature (40%), humidity (25%), wind (20%) and visibility (15%)" label="About the comfort score" />
        </div>
        <ul className={s.chips} aria-label="What to bring">
          {chips.map(c => (
            <li key={c.text} className={s.chip}><i className={`fa-solid ${c.icon}`} aria-hidden="true" /> {c.text}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
