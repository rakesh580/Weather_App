import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { favoritesStore, useFavorites } from './favorites';

describe('favorites store', () => {
  beforeEach(() => favoritesStore._reset());

  it('shares state between independent hook consumers', () => {
    const a = renderHook(() => useFavorites());
    const b = renderHook(() => useFavorites());
    act(() => a.result.current.toggleFavorite({ name: 'Seattle', country: 'US', lat: 47.6, lon: -122.33 }));
    expect(b.result.current.favorites).toHaveLength(1);
    expect(b.result.current.isFavorite(47.6001, -122.3301)).toBe(true);
    act(() => b.result.current.removeFavorite(47.6, -122.33));
    expect(a.result.current.favorites).toHaveLength(0);
  });

  it('persists to localStorage', () => {
    act(() => favoritesStore.add({ name: 'Tokyo', country: 'JP', lat: 35.68, lon: 139.69 }));
    expect(JSON.parse(localStorage.getItem('favorites')!)).toHaveLength(1);
  });
});
