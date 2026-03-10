import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JourneyCityInput from '../journey/JourneyCityInput';
import { optimizeLogistics } from '../../api/logistics';
import { convertTemp } from '../../utils/tempUtils';
import { useWeather } from '../../context/WeatherContext';
import type { LogisticsResponse } from '../../types/logistics';
import type { CityData } from '../../types/journey';
import s from '../../styles/components/logistics.module.css';

interface StopEntry {
  id: string;
  city: CityData | null;
  name: string;
  duration: number;
}

function makeStop(): StopEntry {
  return { id: crypto.randomUUID(), city: null, name: '', duration: 30 };
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

const scoreBadgeClass: Record<string, string> = {
  Clear: s.scoreClear, Good: s.scoreGood, Fair: s.scoreFair, Poor: s.scorePoor,
};

export default function LogisticsOptimizer() {
  const { unit } = useWeather();
  const [stops, setStops] = useState<StopEntry[]>([makeStop(), makeStop()]);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [result, setResult] = useState<LogisticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStop = (id: string, data: Partial<StopEntry>) => {
    setStops(prev => prev.map(st => st.id === id ? { ...st, ...data } : st));
  };

  const removeStop = (id: string) => {
    setStops(prev => prev.filter(st => st.id !== id));
  };

  const addStop = () => {
    if (stops.length >= 8) return;
    setStops(prev => [...prev, makeStop()]);
  };

  const handleOptimize = async () => {
    const validStops = stops.filter(st => st.city);
    if (validStops.length < 2) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await optimizeLogistics(
        validStops.map(st => ({
          lat: st.city!.lat,
          lon: st.city!.lon,
          name: st.city!.name,
          duration_minutes: st.duration,
        })),
        new Date(startTime).toISOString(),
      );
      setResult(res);
    } catch {
      setError('Optimization failed. Please check your stops and try again.');
    } finally {
      setLoading(false);
    }
  };

  const validCount = stops.filter(st => st.city).length;

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.title}>Logistics Optimizer</div>
        <div className={s.subtitle}>Optimize multi-stop visit order by weather conditions</div>
      </div>

      {/* Stops list */}
      <div className={s.stopsList}>
        {stops.map((stop, i) => (
          <div key={stop.id} className={s.stopRow}>
            <div className={s.stopNumber}>{i + 1}</div>
            <div className={s.stopInput}>
              <JourneyCityInput
                label=""
                value={stop.name}
                onSelect={(data: CityData) => updateStop(stop.id, { city: data, name: data.name })}
              />
            </div>
            <input
              className={s.stopDuration}
              type="number"
              min={5}
              max={480}
              value={stop.duration}
              onChange={e => updateStop(stop.id, { duration: Number(e.target.value) || 30 })}
              placeholder="min"
              title="Duration at stop (minutes)"
            />
            {stops.length > 2 && (
              <button className={s.stopRemove} onClick={() => removeStop(stop.id)}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button className={s.addStopBtn} onClick={addStop} disabled={stops.length >= 8}>
        <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
        Add Stop ({stops.length}/8)
      </button>

      {/* Start time */}
      <div className={s.timeRow}>
        <span className={s.timeLabel}><i className="fa-solid fa-clock" /> Start Time</span>
        <input
          className={s.timeInput}
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
        />
      </div>

      <button
        className={s.optimizeBtn}
        onClick={handleOptimize}
        disabled={validCount < 2 || loading}
      >
        <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 8 }} />
        {loading ? 'Optimizing...' : 'Optimize Route'}
      </button>

      {loading && (
        <div className={s.loading}>
          <i className={`fa-solid fa-spinner ${s.loadingSpinner}`} />
          <span>Analyzing weather at all stops...</span>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className={s.results}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* AI briefing */}
            <div className={s.briefing}>
              <i className={`fa-solid fa-wand-magic-sparkles ${s.briefingIcon}`} />
              {result.ai_briefing}
            </div>

            {/* Comparison */}
            <div className={s.comparison}>
              <div className={s.compCard}>
                <div className={s.compLabel}>Original Order</div>
                <div className={s.compPenalty}>
                  {result.comparison.naive_penalty} penalty
                </div>
              </div>
              <div className={`${s.compCard} ${s.compCardOptimized}`}>
                <div className={s.compLabel}>Optimized</div>
                <div className={s.compPenalty}>
                  {result.comparison.optimized_penalty} penalty
                </div>
                {result.comparison.improvement_pct > 0 && (
                  <div className={s.compImprovement}>
                    {result.comparison.improvement_pct}% better
                  </div>
                )}
              </div>
            </div>

            {/* Optimized stops */}
            <div className={s.sectionTitle}>
              <i className="fa-solid fa-route" style={{ color: '#22c55e' }} />
              Optimized Visit Order
            </div>
            <div className={s.optimizedStops}>
              {result.stops_detail.map((stop, i) => {
                const badgeClass = scoreBadgeClass[stop.score_label] || s.scoreFair;
                const numColor = stop.penalty === 0 ? '#22c55e'
                  : stop.penalty < 10 ? '#a3e635'
                  : stop.penalty < 20 ? '#f59e0b'
                  : '#ef4444';

                return (
                  <motion.div
                    key={i}
                    className={s.optimizedStop}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className={s.optimizedStopNumber} style={{ background: `${numColor}22`, color: numColor }}>
                      {i + 1}
                    </div>
                    <div className={s.optimizedStopInfo}>
                      <div className={s.optimizedStopName}>{stop.name}</div>
                      <div className={s.optimizedStopTime}>
                        Arrive: {formatTime(stop.arrival)} — Depart: {formatTime(stop.departure)}
                      </div>
                    </div>
                    <div className={s.optimizedStopWeather}>
                      <div className={s.optimizedStopTemp}>{convertTemp(stop.weather.temp, unit)}&deg;{unit}</div>
                      <div className={s.optimizedStopDesc}>{stop.weather.description}</div>
                      <span className={`${s.scoreBadge} ${badgeClass}`}>{stop.score_label}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
