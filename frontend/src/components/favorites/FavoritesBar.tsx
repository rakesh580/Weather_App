import { useFavorites } from '../../hooks/useFavorites';
import { useWeather } from '../../hooks/useWeather';
import s from '../../styles/components/favorites.module.css';

export default function FavoritesBar() {
  const { favorites, removeFavorite } = useFavorites();
  const { loadWeather, location } = useWeather();

  if (favorites.length === 0) {
    return (
      <div className={s.bar}>
        <span className={s.emptyHint}><i className="fa-regular fa-heart" aria-hidden="true" /> Favorite cities appear here for one-tap access</span>
      </div>
    );
  }

  return (
    <ul className={s.bar} aria-label="Favorite cities">
      {favorites.map(f => {
        const active = !!location && Math.abs(location.lat - f.lat) < 0.01 && Math.abs(location.lon - f.lon) < 0.01;
        return (
          <li key={`${f.lat},${f.lon}`} className={`${s.chip} ${active ? s.chipActive : ''}`}>
            <button className={s.chipBtn} onClick={() => loadWeather(f.lat, f.lon, f.name)} aria-current={active ? 'true' : undefined}>
              {f.name}{f.country ? <span className={s.country}> {f.country}</span> : null}
            </button>
            <button className={s.remove} onClick={() => removeFavorite(f.lat, f.lon)} aria-label={`Remove ${f.name} from favorites`}>
              &times;
            </button>
          </li>
        );
      })}
    </ul>
  );
}
