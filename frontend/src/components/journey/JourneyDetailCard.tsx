import type { Waypoint } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  waypoint: Waypoint;
  open: boolean;
}

function getDrivingTip(severity: string, windSpeed: number): string {
  switch (severity) {
    case 'storm': return 'Severe weather ahead. Consider delaying your departure.';
    case 'snow': return 'Reduce speed and increase following distance.';
    case 'rain': return 'Use headlights and watch for hydroplaning.';
    case 'fog': return 'Use low beams and reduce speed significantly.';
    default:
      if (windSpeed > 25) return 'Watch for crosswinds on open stretches.';
      return 'Clear driving conditions expected.';
  }
}

export default function JourneyDetailCard({ waypoint, open }: Props) {
  if (!open) return null;

  const w = waypoint.weather;
  const visibilityMi = w.visibility != null ? (w.visibility / 1609.34).toFixed(1) : null;

  const sunriseTime = waypoint.sunrise
    ? new Date(waypoint.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;
  const sunsetTime = waypoint.sunset
    ? new Date(waypoint.sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  const tip = getDrivingTip(waypoint.severity, w.wind_speed);

  return (
    <div className={s.detailGrid}>
      {w.feels_like != null && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-temperature-half" />
          <span>Feels {Math.round(w.feels_like)}&deg;F</span>
        </div>
      )}
      {w.pressure != null && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-gauge" />
          <span>{w.pressure} hPa</span>
        </div>
      )}
      <div className={s.detailItem}>
        <i className="fa-solid fa-cloud" />
        <span>{w.clouds_pct ?? 0}% clouds</span>
      </div>
      {visibilityMi && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-eye" />
          <span>{visibilityMi} mi vis</span>
        </div>
      )}
      {(w.rain_3h ?? 0) > 0 && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-droplet" />
          <span>{w.rain_3h} mm rain</span>
        </div>
      )}
      {(w.snow_3h ?? 0) > 0 && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-snowflake" />
          <span>{w.snow_3h} mm snow</span>
        </div>
      )}
      {sunriseTime && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-sun" />
          <span>Rise {sunriseTime}</span>
        </div>
      )}
      {sunsetTime && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-moon" />
          <span>Set {sunsetTime}</span>
        </div>
      )}
      {waypoint.elevation_ft != null && (
        <div className={s.detailItem}>
          <i className="fa-solid fa-mountain" />
          <span>{waypoint.elevation_ft.toLocaleString()} ft</span>
        </div>
      )}
      <div className={s.drivingTip}>
        <i className="fa-solid fa-car" /> {tip}
      </div>
    </div>
  );
}
