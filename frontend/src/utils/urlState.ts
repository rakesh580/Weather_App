/** Shareable location in the URL: /?lat=47.61&lon=-122.33&name=Seattle */
export interface UrlLocation {
  lat: number;
  lon: number;
  name?: string;
}

export function parseLocation(search: string = window.location.search): UrlLocation | null {
  const p = new URLSearchParams(search);
  const lat = Number(p.get('lat'));
  const lon = Number(p.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !p.has('lat') || !p.has('lon')) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const name = p.get('name')?.trim();
  return { lat, lon, ...(name ? { name: name.slice(0, 100) } : {}) };
}

export function serializeLocation(loc: UrlLocation | null): string {
  if (!loc) return window.location.pathname;
  const p = new URLSearchParams();
  p.set('lat', loc.lat.toFixed(4));
  p.set('lon', loc.lon.toFixed(4));
  if (loc.name) p.set('name', loc.name);
  return `${window.location.pathname}?${p.toString()}`;
}

export function writeLocation(loc: UrlLocation | null) {
  const next = serializeLocation(loc);
  if (next !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, '', next);
  }
}
