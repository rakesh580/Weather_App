import { describe, it, expect } from 'vitest';
import { parseLocation, serializeLocation } from './urlState';

describe('urlState', () => {
  it('parses a valid shareable URL', () => {
    expect(parseLocation('?lat=47.6062&lon=-122.3321&name=Seattle')).toEqual({ lat: 47.6062, lon: -122.3321, name: 'Seattle' });
  });
  it('rejects missing or out-of-range coordinates', () => {
    expect(parseLocation('?lat=95&lon=0')).toBeNull();
    expect(parseLocation('?name=Seattle')).toBeNull();
    expect(parseLocation('?lat=abc&lon=1')).toBeNull();
    expect(parseLocation('')).toBeNull();
  });
  it('serializes with 4-decimal precision and encodes the name', () => {
    const s = serializeLocation({ lat: 47.606209, lon: -122.332071, name: 'São Paulo' });
    expect(s).toContain('lat=47.6062');
    expect(s).toContain('lon=-122.3321');
    expect(s).toContain('name=S%C3%A3o+Paulo');
  });
});
