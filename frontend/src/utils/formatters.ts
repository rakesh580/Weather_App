import { cityTime, cityClock } from './time';

export function formatLocalTime(timezoneOffset: number): { time: string; date: string } {
  return cityClock(timezoneOffset);
}

export function sunTimeStr(ts: number, tzOffset: number): string {
  return cityTime(ts, tzOffset);
}
