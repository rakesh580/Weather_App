import { useState } from 'react';
import { motion } from 'framer-motion';
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className={s.timelineScroll}>
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
          const isExpanded = expandedIdx === i;
          const pop = wp.weather.pop ?? 0;
          const windLabel = getWindLabel(wp.weather.wind_deg, wp.route_bearing);

          return (
            <motion.div
              key={i}
              className={`${s.wpCard} ${isExpanded ? s.wpCardExpanded : ''}`}
              variants={cardVariants}
              whileHover={{ y: -5 }}
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              style={{
                borderTop: `3px solid ${wp.color}`,
                cursor: 'pointer',
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

              {/* Precipitation bar */}
              {pop > 0 && (
                <div className={s.precipBar}>
                  <div className={s.precipFill} style={{ width: `${Math.round(pop * 100)}%` }} />
                  <span className={s.precipText}>{Math.round(pop * 100)}%</span>
                </div>
              )}

              {/* Wind arrow + badge */}
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

              {/* Expand chevron */}
              <div className={s.expandChevron}>
                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`} />
              </div>

              {/* Expandable detail card */}
              <JourneyDetailCard waypoint={wp} open={isExpanded} />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
