import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWeatherIcon } from '../../utils/weatherIcons';
import JourneyDetailCard from './JourneyDetailCard';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props { data: JourneyResponse; }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function getWindLabel(windDeg: number | undefined, routeBearing: number | undefined): { label: string; color: string } | null {
  if (windDeg == null || routeBearing == null) return null;
  let diff = Math.abs(windDeg - routeBearing);
  if (diff > 180) diff = 360 - diff;
  if (diff > 135) return { label: 'Headwind', color: '#ef4444' };
  if (diff < 45) return { label: 'Tailwind', color: '#22c55e' };
  return { label: 'Crosswind', color: '#f59e0b' };
}

export default function JourneyTimeline({ data }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [fadeVisible, setFadeVisible] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setFadeVisible(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  return (
    <div>
      <div className={s.timelineScrollWrapper}>
        <div
          className={s.timelineScroll}
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <motion.div
            className={s.timeline}
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {data.waypoints.map((wp, i) => {
              const icon = getWeatherIcon(wp.weather.weather_id, wp.weather.weather_icon);
              const time = new Date(wp.estimated_arrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const date = new Date(wp.estimated_arrival).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const connColor = i < data.segments.length ? data.segments[i].color : 'transparent';
              const isSelected = selectedIdx === i;
              const pop = wp.weather.pop ?? 0;
              const windLabel = getWindLabel(wp.weather.wind_deg, wp.route_bearing);

              return (
                <motion.div
                  key={i}
                  className={`${s.wpCard} ${isSelected ? s.wpCardSelected : ''}`}
                  variants={cardVariants}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedIdx(isSelected ? null : i)}
                  style={{
                    borderTop: `3px solid ${wp.color}`,
                    ...(i < data.waypoints.length - 1 ? { '--conn-color': connColor } as React.CSSProperties : {}),
                  }}
                >
                  <div className={s.wpName}>{wp.name}</div>
                  <div className={s.wpTime}>{time} &middot; {date}</div>
                  <div className={s.wpIcon}><i className={`${icon.iconClass} ${icon.animClass}`} /></div>
                  <div className={s.wpTemp}>{Math.round(wp.weather.temperature)}&deg;F</div>
                  <div className={s.wpDesc}>
                    <span className={s.severityDot} style={{ background: wp.color }} />
                    {wp.weather.description}
                  </div>

                  {pop > 0 && (
                    <div className={s.precipBar}>
                      <div className={s.precipFill} style={{ width: `${Math.round(pop * 100)}%` }} />
                      <span className={s.precipText}>{Math.round(pop * 100)}%</span>
                    </div>
                  )}

                  {wp.weather.wind_deg != null && (
                    <div className={s.windIndicator}>
                      <i
                        className={`fa-solid fa-location-arrow ${s.windArrow}`}
                        style={{ transform: `rotate(${wp.weather.wind_deg}deg)` }}
                      />
                      <span>{Math.round(wp.weather.wind_speed)} mph</span>
                      {windLabel && (
                        <span className={s.windBadge} style={{ background: windLabel.color }}>
                          {windLabel.label}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={s.wpDist}>{Math.round(wp.distance_from_origin_miles)} mi</div>

                  <div className={s.expandChevron}>
                    <i className={`fa-solid fa-chevron-${isSelected ? 'up' : 'down'}`} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Scroll fade indicator */}
        <div className={`${s.timelineFade} ${!fadeVisible ? s.timelineFadeHidden : ''}`} />
      </div>

      {/* Detail panel below timeline */}
      <AnimatePresence>
        {selectedIdx !== null && data.waypoints[selectedIdx] && (
          <motion.div
            className={s.detailPanel}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={s.detailPanelHeader}>
              <span className={s.severityDot} style={{ background: data.waypoints[selectedIdx].color }} />
              {data.waypoints[selectedIdx].name} — Details
            </div>
            <JourneyDetailCard waypoint={data.waypoints[selectedIdx]} open={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
