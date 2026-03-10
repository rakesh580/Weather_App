import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnomaly } from '../../api/anomaly';
import { useWeather } from '../../context/WeatherContext';
import { convertTemp } from '../../utils/tempUtils';
import type { AnomalyData } from '../../types/anomaly';
import s from '../../styles/components/anomaly.module.css';

export default function AnomalyBadge() {
  const { weather, unit } = useWeather();
  const [data, setData] = useState<AnomalyData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!weather) { setData(null); return; }
    getAnomaly(weather.lat, weather.lon).then(setData).catch(() => setData(null));
  }, [weather?.lat, weather?.lon]);

  if (!data || !data.anomaly) return null;

  const { anomaly, historical_avg, historical_range, trend } = data;
  const absDiff = Math.abs(anomaly.degrees_diff);
  const diffDisplay = unit === 'C' ? Math.round(absDiff * 5 / 9) : Math.round(absDiff);
  const isWarm = anomaly.direction === 'warmer';
  const isNormal = Math.abs(anomaly.z_score) < 0.5;

  const badgeClass = isNormal ? s.badgeNormal : isWarm ? s.badgeWarm : s.badgeCool;
  const badgeIcon = isNormal ? 'fa-check' : isWarm ? 'fa-arrow-up' : 'fa-arrow-down';
  const markerColor = isNormal ? '#22c55e' : isWarm ? '#ef4444' : '#3b82f6';

  // Range bar position (0% = record low, 100% = record high)
  const rLow = historical_range.record_low ?? historical_avg.temp_low - 20;
  const rHigh = historical_range.record_high;
  const range = rHigh - rLow || 1;
  const currentPos = Math.min(100, Math.max(0, ((data.current.temp_high - rLow) / range) * 100));
  const avgPos = Math.min(100, Math.max(0, ((historical_avg.temp_high - rLow) / range) * 100));

  // Decade trend bars
  const decadeEntries = Object.entries(trend.decade_avgs);
  const minDecade = decadeEntries.length > 0 ? Math.min(...decadeEntries.map(([, v]) => v)) : 0;
  const maxDecade = decadeEntries.length > 0 ? Math.max(...decadeEntries.map(([, v]) => v)) : 1;
  const decadeRange = maxDecade - minDecade || 1;

  return (
    <>
      <motion.button
        className={`${s.badge} ${badgeClass}`}
        onClick={() => setExpanded(!expanded)}
        whileTap={{ scale: 0.95 }}
        title="Weather anomaly — click for details"
      >
        <i className={`fa-solid ${badgeIcon} ${s.badgeIcon}`} />
        {diffDisplay}&deg;{unit} {anomaly.direction} than normal
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className={s.card}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={s.cardHeader}>
              <div>
                <div className={s.cardTitle}>Historical Weather Comparison</div>
                <div className={s.cardSubtitle}>{data.date} &middot; {data.sample_years}-year analysis</div>
              </div>
              <span className={`${s.classificationBadge} ${badgeClass}`}>
                {anomaly.classification}
              </span>
            </div>

            {/* Stats */}
            <div className={s.statsRow}>
              <div className={s.stat}>
                <div className={s.statValue}>{convertTemp(data.current.temp_high, unit)}&deg;{unit}</div>
                <div className={s.statLabel}>Today's High</div>
              </div>
              <div className={s.stat}>
                <div className={s.statValue}>{convertTemp(historical_avg.temp_high, unit)}&deg;{unit}</div>
                <div className={s.statLabel}>30yr Average</div>
              </div>
              <div className={s.stat}>
                <div className={s.statValue}>
                  {anomaly.percentile != null ? `${anomaly.percentile}%` : '—'}
                </div>
                <div className={s.statLabel}>Percentile</div>
              </div>
            </div>

            {/* Range bar */}
            <div className={s.rangeBar}>
              <div className={s.rangeBarLabel}>
                <span>{convertTemp(rLow, unit)}&deg; Record Low</span>
                <span>Record High {convertTemp(rHigh, unit)}&deg;</span>
              </div>
              <div className={s.rangeTrack}>
                <div className={s.rangeAvgLine} style={{ left: `${avgPos}%` }} />
                <div className={s.rangeAvgLabel} style={{ left: `${avgPos}%` }}>
                  Avg {convertTemp(historical_avg.temp_high, unit)}&deg;
                </div>
                <motion.div
                  className={s.rangeMarker}
                  style={{ left: `${currentPos}%`, background: markerColor }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                />
              </div>
            </div>

            {/* Decade trend */}
            {decadeEntries.length > 1 && (
              <div className={s.trendSection}>
                <div className={s.trendTitle}>
                  Decade Trend
                  {trend.warming_rate_per_decade != null && (
                    <> &middot; {trend.warming_rate_per_decade > 0 ? '+' : ''}{
                      unit === 'C'
                        ? Math.round(trend.warming_rate_per_decade * 5 / 9 * 10) / 10
                        : trend.warming_rate_per_decade
                    }&deg;{unit}/decade</>
                  )}
                </div>
                <div className={s.trendBars}>
                  {decadeEntries.map(([label, val]) => {
                    const height = ((val - minDecade) / decadeRange) * 100;
                    return (
                      <div
                        key={label}
                        className={s.trendBar}
                        style={{ height: `${Math.max(15, height)}%` }}
                      >
                        <span className={s.trendBarValue}>{convertTemp(val, unit)}&deg;</span>
                        <span className={s.trendBarLabel}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
