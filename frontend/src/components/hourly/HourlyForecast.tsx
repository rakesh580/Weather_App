import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { convertTemp } from '../../utils/tempUtils';
import { cityHour, cityHourOfDay, cityDayKey, cityWeekday } from '../../utils/time';
import { wmoInfo } from '../../utils/wmoCodes';
import s from '../../styles/components/hourly.module.css';

/**
 * 48-hour strip: temperature curve (SVG) over per-hour cards with precipitation-probability bars.
 * Data comes from Open-Meteo via /api/hourly, rendered in the city's own timezone.
 */
export default function HourlyForecast() {
  const { hourly, unit, location } = useWeather();
  const scrollRef = useRef<HTMLDivElement>(null);

  const model = useMemo(() => {
    if (!hourly || hourly.hourly.length === 0) return null;
    const off = hourly.utc_offset_seconds;
    const rows = hourly.hourly.filter(h => h.temperature != null);
    const temps = rows.map(h => h.temperature as number);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = Math.max(4, max - min);
    const points = rows.map((h, i) => ({
      x: i * 64 + 32,
      y: 8 + (1 - ((h.temperature as number) - min) / range) * 44,
    }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y.toFixed(1)}`).join(' ');
    let lastDay = '';
    const cards = rows.map((h, i) => {
      const day = cityDayKey(h.dt, off);
      const newDay = day !== lastDay;
      lastDay = day;
      const info = wmoInfo(h.weather_code, h.is_day);
      return {
        key: h.dt,
        hour: i === 0 ? 'Now' : cityHour(h.dt, off),
        dayLabel: newDay && i !== 0 ? cityWeekday(h.dt, off) : null,
        isNight: !h.is_day,
        isMidnight: cityHourOfDay(h.dt, off) === 0,
        icon: info.icon,
        desc: info.description,
        temp: convertTemp(h.temperature as number, unit),
        pop: Math.round(h.pop * 100),
        precip: info.precip,
        wind: h.wind_speed,
        uvi: h.uvi,
        y: points[i].y,
      };
    });
    return { cards, path, width: rows.length * 64, tz: hourly.timezone };
  }, [hourly, unit]);

  if (!location) return null;
  if (!hourly) {
    return (
      <section className={s.section} aria-label="Hourly forecast">
        <div className={s.header}><h2 className={s.title}>Next 48 hours</h2></div>
        <div className={`skeleton ${s.skeleton}`} />
      </section>
    );
  }
  if (!model) return null;

  const scrollBy = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <section className={s.section} aria-label="Hourly forecast">
      <div className={s.header}>
        <h2 className={s.title}>Next 48 hours</h2>
        <span className={s.meta}>
          <i className="fa-solid fa-droplet" aria-hidden="true" /> chance of precipitation
          {model.tz && <span className={s.tz}> · {model.tz.replace('_', ' ')}</span>}
        </span>
        <div className={s.nav}>
          <button className={s.navBtn} onClick={() => scrollBy(-1)} aria-label="Scroll hourly forecast left"><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
          <button className={s.navBtn} onClick={() => scrollBy(1)} aria-label="Scroll hourly forecast right"><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
        </div>
      </div>
      <div className={s.scroller} ref={scrollRef} tabIndex={0}>
        <div className={s.track} style={{ width: model.width }}>
          <svg className={s.curve} width={model.width} height={60} aria-hidden="true">
            <defs>
              <linearGradient id="hourlyFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${model.path} L${model.width - 32},60 L32,60 Z`} fill="url(#hourlyFill)" />
            <motion.path d={model.path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
          </svg>
          <ol className={s.cards}>
            {model.cards.map(c => (
              <li key={c.key} className={`${s.card} ${c.isNight ? s.night : ''} ${c.dayLabel ? s.dayStart : ''}`}
                  aria-label={`${c.dayLabel ? c.dayLabel + ' ' : ''}${c.hour}: ${c.temp}°${unit}, ${c.desc}, ${c.pop}% chance of precipitation`}>
                {c.dayLabel && <span className={s.dayLabel}>{c.dayLabel}</span>}
                <span className={s.hour}>{c.hour}</span>
                <span className={s.temp} style={{ marginTop: c.y - 8 }}>{c.temp}°</span>
                <i className={`fa-solid ${c.icon} ${s.icon}`} aria-hidden="true" title={c.desc} />
                <span className={`${s.pop} ${c.pop >= 40 ? s.popHigh : ''}`} aria-hidden="true">
                  <span className={s.popBar} style={{ height: `${Math.max(2, c.pop * 0.28)}px` }} />
                  {c.pop > 0 ? `${c.pop}%` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
