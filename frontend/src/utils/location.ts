export interface LatLon { lat: number; lon: number; }

/** Stable cache key for a coordinate pair (4 decimals ≈ 11 m). */
export const locationKey = (loc: LatLon | null | undefined): string | null =>
  loc ? `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}` : null;
