import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useCityClock } from '../../hooks/useCityClock';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { sunTimeStr } from '../../utils/formatters';
import s from '../../styles/components/weather-hero.module.css';

export default function WeatherHero() {
  const { weather } = useWeather();
  const { isFavorite, toggleFavorite } = useFavorites();
  const clock = useCityClock(weather?.timezone_offset ?? null);

  const icon = useMemo(
    () => weather ? getWeatherIcon(weather.weather_id, weather.weather_icon) : null,
    [weather]
  );

  const sunPercent = useMemo(() => {
    if (!weather?.sunrise || !weather?.sunset) return 0;
    const tz = weather.timezone_offset || 0;
    const now = new Date();
    const nowLocal = Math.floor(now.getTime() / 1000) + now.getTimezoneOffset() * 60 + tz;
    const rise = weather.sunrise + tz;
    const set = weather.sunset + tz;
    if (nowLocal < rise) return 0;
    if (nowLocal > set) return 100;
    return ((nowLocal - rise) / (set - rise)) * 100;
  }, [weather]);

  if (!weather) return null;

  const fav = isFavorite(weather.lat, weather.lon);

  return (
    <motion.div
      className={s.hero}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      <div className={s.heroIcon}>
        <i className={`${icon!.iconClass} ${icon!.animClass}`} />
      </div>
      <div className={s.heroTemp}>
        {Math.round(weather.temperature)}
        <span className={s.unit}>&deg;F</span>
      </div>
      <div className={s.heroDesc}>{weather.weather}</div>
      <div className={s.heroCity}>
        {weather.city}
        {weather.country && <span className={s.countryBadge}>{weather.country}</span>}
      </div>
      <div className={s.heroTime}>
        <i className="fa-regular fa-clock" /> {clock.time} &mdash; {clock.date}
      </div>
      <div className={s.actions}>
        <button
          className={`${s.favBtn} ${fav ? s.favBtnActive : ''}`}
          onClick={() => toggleFavorite({ name: weather.city, country: weather.country, lat: weather.lat, lon: weather.lon })}
        >
          <i className={fav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
        </button>
      </div>

      {weather.sunrise && weather.sunset && (
        <div className={s.sunBar}>
          <div className={s.sunTrack}>
            <div className={s.sunDot} style={{ left: `${Math.min(100, Math.max(0, sunPercent))}%` }} />
          </div>
          <div className={s.sunLabels}>
            <span><i className="fa-solid fa-sun" /> {sunTimeStr(weather.sunrise, weather.timezone_offset)}</span>
            <span><i className="fa-solid fa-moon" /> {sunTimeStr(weather.sunset, weather.timezone_offset)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
