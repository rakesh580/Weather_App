/**
 * Favorites store shared by every component (useSyncExternalStore), persisted to localStorage
 * and synced across tabs via the `storage` event.
 */
import { useSyncExternalStore, useCallback } from 'react';
import { safeStorage } from '../utils/storage';

export interface Favorite {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

const KEY = 'favorites';
const listeners = new Set<() => void>();
let snapshot: Favorite[] = load();

function load(): Favorite[] {
  const raw = safeStorage.getJSON<unknown>(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is Favorite =>
    !!f && typeof f === 'object' && typeof (f as Favorite).lat === 'number' && typeof (f as Favorite).lon === 'number'
  );
}

function emit() {
  listeners.forEach(l => l());
}

function write(next: Favorite[]) {
  snapshot = next;
  safeStorage.setJSON(KEY, next);
  emit();
}

function same(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === KEY) { snapshot = load(); emit(); }
  });
}

export const favoritesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  getSnapshot: () => snapshot,
  isFavorite: (lat: number, lon: number) => snapshot.some(f => same(f, { lat, lon })),
  add(fav: Favorite) {
    if (!snapshot.some(f => same(f, fav))) write([...snapshot, fav]);
  },
  remove(lat: number, lon: number) {
    write(snapshot.filter(f => !same(f, { lat, lon })));
  },
  toggle(fav: Favorite) {
    if (favoritesStore.isFavorite(fav.lat, fav.lon)) favoritesStore.remove(fav.lat, fav.lon);
    else favoritesStore.add(fav);
  },
  /** test helper */
  _reset() { write([]); },
};

export function useFavorites() {
  const favorites = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.getSnapshot, favoritesStore.getSnapshot);
  const isFavorite = useCallback((lat: number, lon: number) => favorites.some(f => same(f, { lat, lon })), [favorites]);
  return {
    favorites,
    isFavorite,
    addFavorite: favoritesStore.add,
    removeFavorite: favoritesStore.remove,
    toggleFavorite: favoritesStore.toggle,
  };
}
