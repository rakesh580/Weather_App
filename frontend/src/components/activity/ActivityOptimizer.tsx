import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { locationKey } from '../../utils/location';
import { getActivityTypes, optimizeActivity } from '../../api/activity';
import { errorMessage } from '../../api/client';
import { convertTemp } from '../../utils/tempUtils';
import { formatWind } from '../../utils/units';
import { cityTime, cityDateLabel, cityWeekday } from '../../utils/time';
import type { ActivityWindow } from '../../types/activity';
import s from '../../styles/components/activity.module.css';

const WINDOW_SECONDS = 3 * 3600;

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#f59e0b' : '#dc2626';
  return (
    <div className={s.scoreRing} role="img" aria-label={`Score ${Math.round(score)} out of 100`}>
      <svg className={s.scoreRingSvg} viewBox="0 0 56 56" aria-hidden="true">
        <circle className={s.scoreRingBg} cx="28" cy="28" r={r} />
        <circle className={s.scoreRingFg} cx="28" cy="28" r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className={s.scoreValue}>{Math.round(score)}</div>
    </div>
  );
}

function barColor(score: number): string {
  if (score >= 70) return '#16a34a';
  if (score >= 50) return '#65a30d';
  if (score >= 40) return '#f59e0b';
  return '#dc2626';
}

export default function ActivityOptimizer() {
  const { weather, location, unit } = useWeather();
  const [selected, setSelected] = useState<string | null>(null);
  const key = locationKey(location);
  const tz = weather?.timezone_offset ?? 0;

  const types = useQuery({ queryKey: ['activity-types'], queryFn: ({ signal }) => getActivityTypes({ signal }), staleTime: Infinity });
  const result = useQuery({
    queryKey: ['activity', key, selected],
    queryFn: ({ signal }) => optimizeActivity(location!.lat, location!.lon, selected!, { signal }),
    enabled: !!location && !!selected,
    staleTime: 15 * 60 * 1000,
  });

  const fmtWindow = (w: ActivityWindow) => `${cityWeekday(w.dt, tz)} ${cityDateLabel(w.dt, tz)}, ${cityTime(w.dt, tz)}`;

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Activity Optimizer</h2>
        <div className={s.subtitle}>Find the best 3-hour windows for your outdoor plans over the next 5 days</div>
      </div>

      {!weather && (
        <div className={s.noResults}>
          <div className={s.noResultsIcon}><i className="fa-solid fa-magnifying-glass-location" aria-hidden="true" /></div>
          <div>Search for a city on the Weather tab first to use the Activity Optimizer</div>
        </div>
      )}

      {weather && (
        <>
          <div className={s.grid} role="group" aria-label="Choose an activity">
            {(types.data ?? []).map(t => (
              <motion.button
                key={t.id}
                type="button"
                className={`${s.activityCard} ${selected === t.id ? s.activityCardActive : ''}`}
                onClick={() => setSelected(t.id)}
                whileTap={{ scale: 0.95 }}
                aria-pressed={selected === t.id}
              >
                <i className={`fa-solid ${t.icon} ${s.activityIcon}`} aria-hidden="true" />
                <span className={s.activityName}>{t.name}</span>
              </motion.button>
            ))}
          </div>

          {result.isFetching && (
            <div className={s.loading} role="status">
              <i className={`fa-solid fa-spinner ${s.loadingSpinner}`} aria-hidden="true" />
              <span>Analyzing weather windows for {weather.city}…</span>
            </div>
          )}
          {result.isError && !result.isFetching && (
            <div className={s.noResults} role="alert">
              <div className={s.noResultsIcon}><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /></div>
              <div>{errorMessage(result.error, 'Could not score activity windows.')}</div>
            </div>
          )}

          <AnimatePresence>
            {result.data && !result.isFetching && (
              <motion.div className={s.results} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}>
                <div className={s.aiSummary}>
                  <i className={`fa-solid fa-wand-magic-sparkles ${s.aiSummaryIcon}`} aria-hidden="true" />
                  {result.data.ai_summary}
                </div>

                {result.data.best_windows.length > 0 ? (
                  <>
                    <div className={s.sectionTitle}>
                      <i className={`fa-solid fa-crown ${s.sectionTitleIcon}`} aria-hidden="true" /> Best Windows
                    </div>
                    <div className={s.goldenCards}>
                      {result.data.best_windows.slice(0, 3).map((gw, i) => {
                        const firstW = gw.windows[0];
                        const lastW = gw.windows[gw.windows.length - 1];
                        return (
                          <motion.div key={firstW.dt} className={s.goldenCard} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                            <ScoreRing score={gw.avg_score} />
                            <div className={s.goldenInfo}>
                              <div className={s.goldenTime}>
                                {fmtWindow(firstW)} — {cityTime(lastW.dt + WINDOW_SECONDS, tz)}
                              </div>
                              <div className={s.goldenConditions}>{gw.conditions}</div>
                              <div className={s.goldenMeta}>
                                <span className={s.goldenMetaItem}><i className="fa-solid fa-temperature-half" aria-hidden="true" /> {convertTemp(firstW.temp, unit)}&deg;{unit}</span>
                                <span className={s.goldenMetaItem}><i className="fa-solid fa-wind" aria-hidden="true" /> {formatWind(firstW.wind, unit)}</span>
                                <span className={s.goldenMetaItem}><i className="fa-solid fa-droplet" aria-hidden="true" /> {Math.round(firstW.pop * 100)}%</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className={s.noResults}>
                    <div className={s.noResultsIcon}><i className="fa-solid fa-cloud-rain" aria-hidden="true" /></div>
                    <div>No ideal windows found in the next 5 days</div>
                  </div>
                )}

                <div className={s.sectionTitle}>
                  <i className="fa-solid fa-chart-bar" style={{ color: 'var(--accent)' }} aria-hidden="true" /> 5-Day Timeline
                </div>
                <div className={s.timeline} role="list" aria-label="Score for each 3-hour window">
                  {result.data.all_windows.map((w, i, all) => {
                    const height = Math.max(8, (w.score / 100) * 80);
                    const curDate = cityDateLabel(w.dt, tz);
                    const showDate = i === 0 || curDate !== cityDateLabel(all[i - 1].dt, tz);
                    return (
                      <div key={w.dt} className={s.timelineBar} role="listitem" title={`${fmtWindow(w)}: ${w.score}/100 · ${w.description}`} aria-label={`${fmtWindow(w)}: score ${Math.round(w.score)}`}>
                        <div className={s.timelineScore}>{Math.round(w.score)}</div>
                        <div className={s.timelineBarFill} style={{ height: `${height}px`, background: barColor(w.score) }} />
                        <div className={s.timelineLabel}>{cityTime(w.dt, tz).replace(':00', '')}</div>
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
