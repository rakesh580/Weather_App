import { describe, it, expect } from 'vitest';
import { cityHour, cityTime, cityDayKey, cityHourOfDay, relativeAgo, cityClock, toDatetimeLocal, datetimeLocalToISO } from './time';

// 2026-06-21T12:00:00Z
const NOON_UTC = Date.UTC(2026, 5, 21, 12, 0, 0) / 1000;

describe('city time helpers', () => {
  it('renders the hour in the city timezone, not the viewer timezone', () => {
    expect(cityHour(NOON_UTC, -7 * 3600)).toBe('5 AM');   // Seattle (PDT)
    expect(cityHour(NOON_UTC, 9 * 3600)).toBe('9 PM');    // Tokyo
    expect(cityTime(NOON_UTC, 0)).toBe('12:00 PM');
  });

  it('buckets by the city calendar day', () => {
    // 23:30 in Tokyo is 14:30 UTC — the key must roll over to the next day at 00:00 Tokyo time
    const tokyo = 9 * 3600;
    const before = Date.UTC(2026, 5, 21, 14, 30) / 1000;
    const after = Date.UTC(2026, 5, 21, 15, 30) / 1000;
    expect(cityDayKey(before, tokyo)).toBe('2026-06-21');
    expect(cityDayKey(after, tokyo)).toBe('2026-06-22');
    expect(cityHourOfDay(after, tokyo)).toBe(0);
  });

  it('formats a live clock for the city', () => {
    const { time, date } = cityClock(9 * 3600, new Date(NOON_UTC * 1000));
    expect(time).toBe('09:00:00 PM');
    expect(date).toContain('Sunday');
  });
});

describe('relativeAgo', () => {
  const now = NOON_UTC * 1000;
  it('describes elapsed minutes and hours', () => {
    expect(relativeAgo(NOON_UTC - 10, now)).toBe('Just now');
    expect(relativeAgo(NOON_UTC - 60, now)).toBe('1 min ago');
    expect(relativeAgo(NOON_UTC - 900, now)).toBe('15 min ago');
    expect(relativeAgo(NOON_UTC - 7200, now)).toBe('2h ago');
  });
  it('never goes negative for future observation times', () => {
    expect(relativeAgo(NOON_UTC + 600, now)).toBe('Just now');
  });
});

describe('datetime-local round trip', () => {
  it('round-trips a local wall-clock time through ISO', () => {
    const local = '2030-01-05T09:30';
    const iso = datetimeLocalToISO(local);
    expect(toDatetimeLocal(new Date(iso))).toBe(local);
  });
  it('rejects garbage', () => {
    expect(() => datetimeLocalToISO('yesterday')).toThrow();
  });
});
