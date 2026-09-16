import type { Unit } from '../context/weather';

export function formatWind(mph: number, unit: Unit): string {
  return unit === 'C' ? `${Math.round(mph * 1.609344)} km/h` : `${Math.round(mph)} mph`;
}

export function formatVisibility(meters: number | null, unit: Unit): string {
  if (meters == null) return '--';
  return unit === 'C' ? `${(meters / 1000).toFixed(1)} km` : `${(meters / 1609.34).toFixed(1)} mi`;
}

export function formatPrecip(inches: number, unit: Unit): string {
  return unit === 'C' ? `${(inches * 25.4).toFixed(1)} mm` : `${inches.toFixed(2)} in`;
}
