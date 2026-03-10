import { useState, useEffect, useCallback } from 'react';
import { sendChatMessage } from '../../api/chat';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props { data: JourneyResponse; }

export default function JourneySummary({ data }: Props) {
  const hasStorm = data.waypoints.some(w => w.severity === 'storm');
  const hasRain = data.waypoints.some(w => w.severity === 'rain');
  const hasSnow = data.waypoints.some(w => w.severity === 'snow');

  let statusIcon: string, statusText: string, statusColor: string;
  if (hasStorm)     { statusIcon = 'fa-triangle-exclamation'; statusText = 'Severe weather on route'; statusColor = '#ef4444'; }
  else if (hasSnow) { statusIcon = 'fa-snowflake';            statusText = 'Snow expected on route';   statusColor = '#f97316'; }
  else if (hasRain) { statusIcon = 'fa-cloud-rain';           statusText = 'Rain expected on route';   statusColor = '#f59e0b'; }
  else              { statusIcon = 'fa-circle-check';         statusText = 'Clear conditions';         statusColor = '#22c55e'; }

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const generateBriefing = useCallback(async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const wpSummary = data.waypoints.map(wp =>
        `${wp.name}: ${Math.round(wp.weather.temperature)}°F, ${wp.weather.description}, severity=${wp.severity}`
      ).join('; ');

      const prompt = `Give a 2-3 sentence driver briefing for a ${Math.round(data.total_distance_miles)} mile trip with ${data.waypoints.length} waypoints. Weather along route: ${wpSummary}. Focus on safety and what to expect.`;

      const res = await sendChatMessage({ message: prompt, timezone: 'America/New_York' });
      setBriefing(res.response);
    } catch {
      setBriefing('Unable to generate AI briefing.');
    } finally {
      setBriefingLoading(false);
    }
  }, [data]);

  useEffect(() => {
    generateBriefing();
  }, [generateBriefing]);

  return (
    <div className={s.summary}>
      <div className={s.summaryRow}>
        <span className={s.status} style={{ color: statusColor }}>
          <i className={`fa-solid ${statusIcon}`} /> {statusText}
        </span>
        <span className={s.stat}><i className="fa-solid fa-road" /> {Math.round(data.total_distance_miles)} mi</span>
        <span className={s.stat}><i className="fa-solid fa-clock" /> {data.total_duration_hours} hrs</span>
        <span className={s.stat}><i className="fa-solid fa-location-dot" /> {data.waypoints.length} waypoints</span>
      </div>

      <div className={s.aiBriefing}>
        <div className={s.briefingHeader}>
          <i className="fa-solid fa-robot" /> AI Trip Briefing
          {!briefingLoading && (
            <button className={s.regenerateBtn} onClick={generateBriefing} title="Regenerate">
              <i className="fa-solid fa-arrows-rotate" />
            </button>
          )}
        </div>
        {briefingLoading ? (
          <div className={s.briefingSkeleton} />
        ) : (
          <p className={s.briefingText}>{briefing}</p>
        )}
      </div>
    </div>
  );
}
