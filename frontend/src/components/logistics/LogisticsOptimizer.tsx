import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JourneyCityInput from '../journey/JourneyCityInput';
import { optimizeLogistics } from '../../api/logistics';
import { errorMessage } from '../../api/client';
import { convertTemp } from '../../utils/tempUtils';
import { defaultDeparture, datetimeLocalToISO } from '../../utils/time';
import { useWeather } from '../../hooks/useWeather';
import type { LogisticsResponse } from '../../types/logistics';
import type { CityData } from '../../types/journey';
import s from '../../styles/components/logistics.module.css';

interface StopEntry {
  id: string;
  city: CityData | null;
  name: string;
  duration: number;
}

let stopSeq = 0;
function makeStop(): StopEntry {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `stop-${Date.now()}-${stopSeq++}`;
  return { id, city: null, name: '', duration: 30 };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const scoreBadgeClass: Record<string, string> = { Clear: s.scoreClear, Good: s.scoreGood, Fair: s.scoreFair, Poor: s.scorePoor };

export default function LogisticsOptimizer() {
  const { unit } = useWeather();
  const [stops, setStops] = useState<StopEntry[]>(() => [makeStop(), makeStop()]);
  const [startTime, setStartTime] = useState(() => defaultDeparture(1));
  const [result, setResult] = useState<LogisticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStop = (id: string, data: Partial<StopEntry>) => setStops(prev => prev.map(st => (st.id === id ? { ...st, ...data } : st)));
  const removeStop = (id: string) => setStops(prev => prev.filter(st => st.id !== id));
  const addStop = () => { if (stops.length < 8) setStops(prev => [...prev, makeStop()]); };

  const validStops = stops.filter(st => st.city);
  const validCount = validStops.length;

  const handleOptimize = async () => {
    if (validCount < 2) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await optimizeLogistics(
        validStops.map(st => ({ lat: st.city!.lat, lon: st.city!.lon, name: st.city!.name, duration_minutes: st.duration })),
        datetimeLocalToISO(startTime),
      );
      setResult(res);
    } catch (e) {
      setError(errorMessage(e, 'Optimization failed. Please check your stops and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Logistics Optimizer</h2>
        <div className={s.subtitle}>Order up to 8 stops to minimise weather exposure (brute-force search over every route)</div>
      </div>

      <ol className={s.stopsList} aria-label="Stops">
        {stops.map((stop, i) => (
          <li key={stop.id} className={s.stopRow}>
            <div className={s.stopNumber} aria-hidden="true">{i + 1}</div>
            <div className={s.stopInput}>
              <JourneyCityInput
                label=""
                placeholder={`Stop ${i + 1} — city or address`}
                value={stop.name}
                onSelect={(data: CityData) => updateStop(stop.id, { city: data, name: data.name })}
                onClear={() => updateStop(stop.id, { city: null })}
              />
            </div>
            <input
              className={s.stopDuration}
              type="number"
              min={0}
              max={480}
              value={stop.duration}
              onChange={e => updateStop(stop.id, { duration: Math.max(0, Math.min(480, Number(e.target.value))) })}
              placeholder="min"
              aria-label={`Minutes at stop ${i + 1}`}
              title="Duration at stop (minutes)"
            />
            {stops.length > 2 && (
              <button className={s.stopRemove} onClick={() => removeStop(stop.id)} aria-label={`Remove stop ${i + 1}`}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ol>

      <button className={s.addStopBtn} onClick={addStop} disabled={stops.length >= 8}>
        <i className="fa-solid fa-plus" style={{ marginRight: 6 }} aria-hidden="true" /> Add Stop ({stops.length}/8)
      </button>

      <div className={s.timeRow}>
        <label className={s.timeLabel} htmlFor="logistics-start"><i className="fa-solid fa-clock" aria-hidden="true" /> Start Time</label>
        <input id="logistics-start" className={s.timeInput} type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
      </div>

      <button className={s.optimizeBtn} onClick={handleOptimize} disabled={validCount < 2 || loading}>
        <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 8 }} aria-hidden="true" />
        {loading ? 'Optimizing…' : validCount < 2 ? `Select ${2 - validCount} more stop${2 - validCount > 1 ? 's' : ''} to optimize` : 'Optimize Route'}
      </button>

      {loading && (
        <div className={s.loading} role="status">
          <i className={`fa-solid fa-spinner ${s.loadingSpinner}`} aria-hidden="true" />
          <span>Analyzing weather at all stops…</span>
        </div>
      )}

      {error && !loading && (
        <div className={s.errorBox} role="alert">
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} aria-hidden="true" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && !loading && (
          <motion.div className={s.results} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className={s.briefing}>
              <i className={`fa-solid fa-wand-magic-sparkles ${s.briefingIcon}`} aria-hidden="true" />
              {result.ai_briefing}
            </div>

            <div className={s.comparison}>
              <div className={s.compCard}>
                <div className={s.compLabel}>Original Order</div>
                <div className={s.compPenalty}>{result.comparison.naive_penalty} penalty</div>
                <div className={s.compDistance}>{result.comparison.naive_distance_miles} mi</div>
              </div>
              <div className={`${s.compCard} ${s.compCardOptimized}`}>
                <div className={s.compLabel}>Optimized</div>
                <div className={s.compPenalty}>{result.comparison.optimized_penalty} penalty</div>
                <div className={s.compDistance}>{result.comparison.optimized_distance_miles} mi</div>
                {result.comparison.improvement_pct > 0 && <div className={s.compImprovement}>{result.comparison.improvement_pct}% less exposure</div>}
              </div>
            </div>

            <div className={s.sectionTitle}>
              <i className="fa-solid fa-route" style={{ color: '#16a34a' }} aria-hidden="true" /> Optimized Visit Order
            </div>
            <ol className={s.optimizedStops}>
              {result.stops_detail.map((stop, i) => {
                const badgeClass = scoreBadgeClass[stop.score_label] || s.scoreFair;
                const numColor = stop.penalty === 0 ? '#16a34a' : stop.penalty < 10 ? '#65a30d' : stop.penalty < 20 ? '#f59e0b' : '#dc2626';
                return (
                  <motion.li key={`${stop.index}-${i}`} className={s.optimizedStop} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className={s.optimizedStopNumber} style={{ background: `${numColor}22`, color: numColor }} aria-hidden="true">{i + 1}</div>
                    <div className={s.optimizedStopInfo}>
                      <div className={s.optimizedStopName}>{stop.name}</div>
                      <div className={s.optimizedStopTime}>Arrive {formatTime(stop.arrival)} · Depart {formatTime(stop.departure)}</div>
                    </div>
                    <div className={s.optimizedStopWeather}>
                      <div className={s.optimizedStopTemp}>{convertTemp(stop.weather.temp, unit)}&deg;{unit}</div>
                      <div className={s.optimizedStopDesc}>{stop.weather.description}</div>
                      <span className={`${s.scoreBadge} ${badgeClass}`}>{stop.score_label}</span>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
