/** Trim Nominatim display names ("Pike Place, Seattle, King County, Washington, 98101, United States") to ≤ 120 chars. */
export function shortPlaceName(name: string): string {
  const parts = name.split(',').map(p => p.trim()).filter(Boolean);
  let out = parts.slice(0, 3).join(', ');
  if (out.length > 120) out = out.slice(0, 117) + '…';
  return out || name.slice(0, 120);
}
