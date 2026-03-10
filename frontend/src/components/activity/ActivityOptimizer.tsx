import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { getActivityTypes, optimizeActivity } from '../../api/activity';
import { convertTemp } from '../../utils/tempUtils';
import type { ActivityType, ActivityResponse, ActivityWindow } from '../../types/activity';
import s from '../../styles/components/activity.module.css';

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className={s.scoreRing}>
      <svg className={s.scoreRingSvg} viewBox="0 0 56 56">
        <circle className={s.scoreRingBg} cx="28" cy="28" r={r} />
        <circle
          className={s.scoreRingFg}
          cx="28" cy="28" r={r}
          stroke={color}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={s.scoreValue}>{Math.round(score)}</div>
    </div>
  );
}

function formatWindowTime(dtStr: string): string {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return dtStr;
  }
}

function formatShortTime(dtStr: string): string {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatShortDate(dtStr: string): string {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function barColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#a3e635';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function ActivityOptimizer() {
  const { weather, unit } = useWeather();
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getActivityTypes().then(setTypes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected || !weather) { setResult(null); return; }
    setLoading(true);
    optimizeActivity(weather.lat, weather.lon, selected)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [selected, weather?.lat, weather?.lon]);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.title}>Activity Optimizer</div>
        <div className={s.subtitle}>Find the best time for your outdoor activities</div>
      </div>

      {!weather && (
        <div className={s.noResults}>
          <div className={s.noResultsIcon}><i className="fa-solid fa-magnifying-glass-location" /></div>
          <div>Search for a city on the Weather tab first to use the Activity Optimizer</div>
        </div>
      )}

      {!weather ? null : (
        <>

      {/* Activity selector */}
      <div className={s.grid}>
        {types.map(t => (
          <motion.div
            key={t.id}
            className={`${s.activityCard} ${selected === t.id ? s.activityCardActive : ''}`}
            onClick={() => setSelected(t.id)}
            whileTap={{ scale: 0.95 }}
          >
            <i className={`fa-solid ${t.icon} ${s.activityIcon}`} />
            <span className={s.activityName}>{t.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className={s.loading}>
          <i className={`fa-solid fa-spinner ${s.loadingSpinner}`} />
          <span>Analyzing weather windows...</span>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            className={s.results}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
          >
            {/* AI Summary */}
            <div className={s.aiSummary}>
              <i className={`fa-solid fa-wand-magic-sparkles ${s.aiSummaryIcon}`} />
              {result.ai_summary}
            </div>

            {/* Golden windows */}
            {result.best_windows.length > 0 && (
              <>
                <div className={s.sectionTitle}>
                  <i className={`fa-solid fa-crown ${s.sectionTitleIcon}`} />
                  Best Windows
                </div>
                <div className={s.goldenCards}>
                  {result.best_windows.slice(0, 3).map((gw, i) => {
                    const firstW = gw.windows[0];
                    return (
                      <motion.div
                        key={i}
                        className={s.goldenCard}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <ScoreRing score={gw.avg_score} />
                        <div className={s.goldenInfo}>
                          <div className={s.goldenTime}>
                            {formatWindowTime(gw.start)}
                            {gw.windows.length > 1 && ` — ${formatShortTime(gw.end)}`}
                          </div>
                          <div className={s.goldenConditions}>{gw.conditions}</div>
                          <div className={s.goldenMeta}>
                            <span className={s.goldenMetaItem}>
                              <i className="fa-solid fa-temperature-half" />
                              {convertTemp(firstW.temp, unit)}&deg;{unit}
                            </span>
                            <span className={s.goldenMetaItem}>
                              <i className="fa-solid fa-wind" />
                              {Math.round(firstW.wind)} mph
                            </span>
                            <span className={s.goldenMetaItem}>
                              <i className="fa-solid fa-droplet" />
                              {Math.round(firstW.pop * 100)}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {result.best_windows.length === 0 && (
              <div className={s.noResults}>
                <div className={s.noResultsIcon}><i className="fa-solid fa-cloud-rain" /></div>
                <div>No ideal windows found in the next 5 days</div>
              </div>
            )}

            {/* Timeline */}
            <div className={s.sectionTitle}>
              <i className="fa-solid fa-chart-bar" style={{ color: '#818cf8' }} />
              5-Day Timeline
            </div>
            <div className={s.timeline}>
              {result.all_windows.map((w: ActivityWindow, i: number) => {
                const height = Math.max(8, (w.score / 100) * 80);
                const prevDate = i > 0 ? formatShortDate(result.all_windows[i - 1].start) : '';
                const curDate = formatShortDate(w.start);
                const showDate = curDate !== prevDate;
                return (
                  <div key={i} className={s.timelineBar} title={`${formatWindowTime(w.start)}: ${w.score}/100`}>
                    <div className={s.timelineScore}>{Math.round(w.score)}</div>
                    <div
                      className={s.timelineBarFill}
                      style={{ height: `${height}px`, background: barColor(w.score) }}
                    />
                    <div className={s.timelineLabel}>{formatShortTime(w.start)}</div>
                    {showDate && <div className={s.timelineDateLabel}>{curDate}</div>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
}
