import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { calculateComfort, getClothingChips } from '../../utils/comfortScore';
import InfoTooltip from '../ui/InfoTooltip';
import s from '../../styles/components/comfort.module.css';

export default function ComfortScore() {
  const { weather } = useWeather();
  const arcRef = useRef<SVGCircleElement>(null);

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

  const circumference = 301.6;
  const offset = comfort ? circumference - (comfort.score / 100) * circumference : circumference;

  useEffect(() => {
    if (arcRef.current) {
      setTimeout(() => {
        arcRef.current?.setAttribute('stroke-dashoffset', String(offset));
      }, 100);
    }
  }, [offset]);

  if (!weather || !comfort) return null;

  return (
    <div className={s.section}>
      <motion.svg
        className={s.svg}
        width="110"
        height="110"
        viewBox="0 0 110 110"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
      >
        <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          ref={arcRef}
          cx="55" cy="55" r="48"
          fill="none" stroke={comfort.color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s' }}
        />
        <text x="55" y="55" textAnchor="middle" dy="6" fill="var(--text-primary)" fontSize="26" fontWeight="800">
          {comfort.score}
        </text>
      </motion.svg>
      <div className={s.right}>
        <div className={s.status} style={{ color: comfort.color }}>
          {comfort.status}
          <InfoTooltip text="Combines temperature, humidity, wind, and visibility into a 0-100 rating" />
        </div>
        <div className={s.chips}>
          {chips.map((c, i) => (
            <span key={i} className={s.chip}>
              <i className={`fa-solid ${c.icon}`} /> {c.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
