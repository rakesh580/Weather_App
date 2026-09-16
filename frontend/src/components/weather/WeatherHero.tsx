import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { useFavorites } from '../../hooks/useFavorites';
import { useCityClock } from '../../hooks/useCityClock';
import { getWeatherIcon } from '../../utils/weatherIcons';
import { cityTime, relativeAgo } from '../../utils/time';
import { convertTemp } from '../../utils/tempUtils';
import AnomalyBadge from '../anomaly/AnomalyBadge';
import MicroclimateCard from '../microclimate/MicroclimateCard';
import s from '../../styles/components/weather-hero.module.css';

export default function WeatherHero() {
  const { weather, hourly, refreshing, refresh, unit, setUnit } = useWeather();
  const { isFavorite, toggleFavorite } = useFavorites();
  const clock = useCityClock(weather?.timezone_offset ?? null);

  const icon = useMemo(
    () => (weather ? getWeatherIcon(weather.weather_id, weather.weather_icon) : null),
    [weather]
  );

  // Sun position: compare absolute epoch seconds — no timezone shifting needed.
  const sunPercent = useMemo(() => {
    if (!weather?.sunrise || !weather?.sunset) return 0;
    const nowSec = clock.now / 1000;
    if (nowSec < weather.sunrise) return 0;
    if (nowSec > weather.sunset) return 100;
    return ((nowSec - weather.sunrise) / (weather.sunset - weather.sunrise)) * 100;
  }, [weather, clock.now]);

  const today = hourly?.daily?.[0];
  const high = today?.high ?? weather?.temp_max ?? null;
  const low = today?.low ?? weather?.temp_min ?? null;

  if (!weather || !icon) return null;

  const fav = isFavorite(weather.lat, weather.lon);
  const updatedAgo = weather.dt ? relativeAgo(weather.dt, clock.now) : '';

  return (
    <motion.section
      className={s.hero}
      aria-label={`Current weather in ${weather.city}`}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    >
      <button
        className={`${s.favBtn} ${fav ? s.favBtnActive : ''}`}
        onClick={() => toggleFavorite({ name: weather.city, country: weather.country, lat: weather.lat, lon: weather.lon })}
        aria-pressed={fav}
        aria-label={fav ? `Remove ${weather.city} from favorites` : `Add ${weather.city} to favorites`}
      >
        <i className={fav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} aria-hidden="true" />
      </button>

      <div className={s.heroLeft}>
        <div className={s.heroIcon} aria-hidden="true">
          <i className={`${icon.iconClass} ${icon.animClass}`} />
        </div>
        <div className={s.heroTemp}>
          <span aria-label={`${convertTemp(weather.temperature, unit)} degrees ${unit === 'F' ? 'Fahrenheit' : 'Celsius'}`}>
            {convertTemp(weather.temperature, unit)}
          </span>
          <span className={s.unit} aria-hidden="true">&deg;{unit}</span>
          <div className={s.unitToggle} role="group" aria-label="Temperature unit">
            <button className={`${s.unitBtn} ${unit === 'F' ? s.unitBtnActive : ''}`} onClick={() => setUnit('F')} aria-pressed={unit === 'F'}>F</button>
            <button className={`${s.unitBtn} ${unit === 'C' ? s.unitBtnActive : ''}`} onClick={() => setUnit('C')} aria-pressed={unit === 'C'}>C</button>
          </div>
        </div>
        <div className={s.heroDesc}>{weather.weather}</div>
        {(high != null || low != null) && (
          <div className={s.hiLo}>
            {high != null && <span><i className="fa-solid fa-arrow-up" aria-hidden="true" /> {convertTemp(high, unit)}&deg;</span>}
            {low != null && <span><i className="fa-solid fa-arrow-down" aria-hidden="true" /> {convertTemp(low, unit)}&deg;</span>}
          </div>
        )}
      </div>

      <div className={s.heroRight}>
        <div className={s.heroCity}>
          {weather.city}
          {weather.country && <span className={s.countryBadge}>{weather.country}</span>}
        </div>
        <div className={s.heroTime}>
          <i className="fa-regular fa-clock" aria-hidden="true" /> {clock.time} &mdash; {clock.date}
        </div>

        {weather.sunrise && weather.sunset && (
          <div className={s.sunBar} aria-label={`Sunrise ${cityTime(weather.sunrise, weather.timezone_offset)}, sunset ${cityTime(weather.sunset, weather.timezone_offset)}`}>
            <div className={s.sunTrack}>
              <div className={s.sunDot} style={{ left: `${Math.min(100, Math.max(0, sunPercent))}%` }} />
            </div>
            <div className={s.sunLabels}>
              <span><i className="fa-solid fa-sun" aria-hidden="true" /> {cityTime(weather.sunrise, weather.timezone_offset)}</span>
              <span><i className="fa-solid fa-moon" aria-hidden="true" /> {cityTime(weather.sunset, weather.timezone_offset)}</span>
            </div>
          </div>
        )}

        <AnomalyBadge />
        <MicroclimateCard />

        <div className={s.lastUpdated}>
          <span>Observed {updatedAgo}</span>
          <button
            className={s.refreshBtn}
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh weather"
            title="Refresh weather"
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? s.spinning : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
