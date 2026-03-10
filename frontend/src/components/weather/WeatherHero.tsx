import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useCityClock } from '../../hooks/useCityClock';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { sunTimeStr } from '../../utils/formatters';
import { convertTemp } from '../../utils/tempUtils';
import AnomalyBadge from '../anomaly/AnomalyBadge';
import MicroclimateCard from '../microclimate/MicroclimateCard';
import s from '../../styles/components/weather-hero.module.css';

export default function WeatherHero() {
  const { weather, loading, loadWeather, unit, toggleUnit } = useWeather();
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

  const updatedAgo = useMemo(() => {
    if (!weather?.dt) return '';
    const mins = Math.floor((Date.now() / 1000 - weather.dt) / 60);
    if (mins < 1) return 'Just now';
    if (mins === 1) return '1 min ago';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }, [weather?.dt]);

  if (!weather) return null;

  const fav = isFavorite(weather.lat, weather.lon);

  return (
    <motion.div
      className={s.hero}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      <button
        className={`${s.favBtn} ${fav ? s.favBtnActive : ''}`}
        onClick={() => toggleFavorite({ name: weather.city, country: weather.country, lat: weather.lat, lon: weather.lon })}
      >
        <i className={fav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
      </button>

      <div className={s.heroLeft}>
        <div className={s.heroIcon}>
          <i className={`${icon!.iconClass} ${icon!.animClass}`} />
        </div>
        <div className={s.heroTemp}>
          {convertTemp(weather.temperature, unit)}
          <span className={s.unit}>&deg;{unit}</span>
          <div className={s.unitToggle}>
            <button
              className={`${s.unitBtn} ${unit === 'F' ? s.unitBtnActive : ''}`}
              onClick={toggleUnit}
            >F</button>
            <button
              className={`${s.unitBtn} ${unit === 'C' ? s.unitBtnActive : ''}`}
              onClick={toggleUnit}
            >C</button>
          </div>
        </div>
        <div className={s.heroDesc}>{weather.weather}</div>
      </div>

      <div className={s.heroRight}>
        <div className={s.heroCity}>
          {weather.city}
          {weather.country && <span className={s.countryBadge}>{weather.country}</span>}
        </div>
        <div className={s.heroTime}>
          <i className="fa-regular fa-clock" /> {clock.time} &mdash; {clock.date}
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

        <AnomalyBadge />
        <MicroclimateCard />

        <div className={s.lastUpdated}>
          <span>Updated {updatedAgo}</span>
          <button
            className={s.refreshBtn}
            onClick={() => loadWeather(weather.lat, weather.lon, weather.city)}
            disabled={loading}
            title="Refresh weather"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? s.spinning : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
