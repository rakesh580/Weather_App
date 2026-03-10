import { useFavorites } from '../../hooks/useFavorites';
import { useWeather } from '../../context/WeatherContext';
import s from '../../styles/components/favorites.module.css';

export default function FavoritesBar() {
  const { favorites, removeFavorite } = useFavorites();
  const { loadWeather } = useWeather();

  if (favorites.length === 0) {
    return (
      <div className={s.bar}>
        <span className={s.emptyHint}>
          <i className="fa-regular fa-star" /> Star cities for quick access
        </span>
      </div>
    );
  }

  return (
    <div className={s.bar}>
      {favorites.map((f, i) => (
        <div key={i} className={s.chip} onClick={() => loadWeather(f.lat, f.lon, f.name)}>
          <span>{f.name}</span>
          <button
            className={s.remove}
            onClick={e => { e.stopPropagation(); removeFavorite(f.lat, f.lon); }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
