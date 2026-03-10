import { useState, useCallback } from 'react';

export interface Favorite {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

function load(): Favorite[] {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
  catch { return []; }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>(load);

  const save = useCallback((favs: Favorite[]) => {
    localStorage.setItem('favorites', JSON.stringify(favs));
    setFavorites(favs);
  }, []);

  const isFavorite = useCallback((lat: number, lon: number) =>
    favorites.some(f => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01), [favorites]);

  const addFavorite = useCallback((fav: Favorite) => {
    const favs = load();
    if (!favs.some(f => Math.abs(f.lat - fav.lat) < 0.01 && Math.abs(f.lon - fav.lon) < 0.01)) {
      save([...favs, fav]);
    }
  }, [save]);

  const removeFavorite = useCallback((lat: number, lon: number) => {
    save(load().filter(f => !(Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01)));
  }, [save]);

  const toggleFavorite = useCallback((fav: Favorite) => {
    if (isFavorite(fav.lat, fav.lon)) removeFavorite(fav.lat, fav.lon);
    else addFavorite(fav);
  }, [isFavorite, addFavorite, removeFavorite]);

  return { favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite };
}
