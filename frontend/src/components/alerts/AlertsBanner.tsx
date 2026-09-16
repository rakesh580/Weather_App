import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import type { WeatherAlert } from '../../types/weather';
import s from '../../styles/components/alerts.module.css';

const SEVERITY_CLASS: Record<WeatherAlert['severity'], string> = {
  Extreme: s.extreme, Severe: s.severe, Moderate: s.moderate, Minor: s.minor, Unknown: s.minor,
};

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Active NWS alerts for the searched location (US coverage). Hidden when there are none. */
export default function AlertsBanner() {
  const { alerts } = useWeather();
  const [openId, setOpenId] = useState<string | null>(null);
  const items = alerts?.alerts ?? [];
  if (items.length === 0) return null;

  return (
    <div className={s.stack} role="region" aria-label="Severe weather alerts">
      {items.slice(0, 4).map(a => {
        const open = openId === a.id;
        const ends = fmt(a.ends);
        return (
          <motion.div key={a.id} className={`${s.alert} ${SEVERITY_CLASS[a.severity] ?? s.minor}`}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <button className={s.summary} onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open}>
              <i className={`fa-solid ${a.severity === 'Extreme' || a.severity === 'Severe' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'} ${s.icon}`} aria-hidden="true" />
              <span className={s.text}>
                <strong>{a.event}</strong>
                <span className={s.sub}>{a.headline ?? a.areas ?? ''}{ends ? ` · until ${ends}` : ''}</span>
              </span>
              <span className={s.badge}>{a.severity}</span>
              <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} ${s.chevron}`} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div className={s.body} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                  {a.description && <p className={s.desc}>{a.description}</p>}
                  {a.instruction && <p className={s.instruction}><strong>What to do:</strong> {a.instruction}</p>}
                  {a.sender && <p className={s.sender}>Source: {a.sender}</p>}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
