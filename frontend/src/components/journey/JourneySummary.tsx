import { useQuery } from '@tanstack/react-query';
import { sendChatMessage } from '../../api/chat';
import type { JourneyResponse } from '../../types/journey';
import { useWeather } from '../../hooks/useWeather';
import { convertTemp } from '../../utils/tempUtils';
import s from '../../styles/components/journey.module.css';

interface Props { data: JourneyResponse; aiEnabled?: boolean; }

function journeyKey(data: JourneyResponse): string {
  const first = data.waypoints[0];
  const last = data.waypoints[data.waypoints.length - 1];
  return `${first?.lat},${first?.lon}|${last?.lat},${last?.lon}|${first?.estimated_arrival}`;
}

export default function JourneySummary({ data, aiEnabled = true }: Props) {
  const { unit } = useWeather();
  const hasStorm = data.waypoints.some(w => w.severity === 'storm');
  const hasRain = data.waypoints.some(w => w.severity === 'rain');
  const hasSnow = data.waypoints.some(w => w.severity === 'snow');
  const noData = data.waypoints.filter(w => w.weather.description === 'no data').length;

  let statusIcon: string, statusText: string, statusColor: string;
  if (hasStorm)     { statusIcon = 'fa-triangle-exclamation'; statusText = 'Severe weather on route'; statusColor = '#dc2626'; }
  else if (hasSnow) { statusIcon = 'fa-snowflake';            statusText = 'Snow expected on route';   statusColor = '#ea580c'; }
  else if (hasRain) { statusIcon = 'fa-cloud-rain';           statusText = 'Rain expected on route';   statusColor = '#d97706'; }
  else              { statusIcon = 'fa-circle-check';         statusText = 'Clear conditions';         statusColor = '#16a34a'; }

  const briefing = useQuery({
    queryKey: ['journey-briefing', journeyKey(data)],
    queryFn: async () => {
      const wpSummary = data.waypoints.slice(0, 12).map(wp =>
        `${wp.name}: ${Math.round(wp.weather.temperature)}°F, ${wp.weather.description}, severity=${wp.severity}`
      ).join('; ');
      const prompt = `Give a 2-3 sentence driver briefing for a ${Math.round(data.total_distance_miles)} mile trip with ${data.waypoints.length} waypoints. Weather along route: ${wpSummary}. Focus on safety and what to expect.`;
      const origin = data.waypoints[0];
      const res = await sendChatMessage({ message: prompt, lat: origin?.lat, lon: origin?.lon, city: origin?.name });
      return res.response;
    },
    enabled: aiEnabled && data.waypoints.length > 0,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const temps = data.waypoints.filter(w => w.weather.description !== 'no data').map(w => w.weather.temperature);

  return (
    <div className={s.summary}>
      <div className={s.summaryRow}>
        <span className={s.status} style={{ color: statusColor }}>
          <i className={`fa-solid ${statusIcon}`} aria-hidden="true" /> {statusText}
        </span>
        <span className={s.stat}><i className="fa-solid fa-road" aria-hidden="true" /> {Math.round(data.total_distance_miles)} mi</span>
        <span className={s.stat}><i className="fa-solid fa-clock" aria-hidden="true" /> {data.total_duration_hours} hrs</span>
        <span className={s.stat}><i className="fa-solid fa-location-dot" aria-hidden="true" /> {data.waypoints.length} waypoints</span>
        {temps.length > 0 && (
          <span className={s.stat}><i className="fa-solid fa-temperature-half" aria-hidden="true" /> {convertTemp(Math.min(...temps), unit)}–{convertTemp(Math.max(...temps), unit)}°{unit}</span>
        )}
      </div>
      {(!data.used_real_route || noData > 0) && (
        <p className={s.summaryNote}>
          {!data.used_real_route && 'Route is a straight-line estimate (no routing provider configured). '}
          {noData > 0 && `${noData} waypoint${noData > 1 ? 's are' : ' is'} beyond the 5-day forecast window.`}
        </p>
      )}

      {aiEnabled && (
        <div className={s.aiBriefing}>
          <div className={s.briefingHeader}>
            <i className="fa-solid fa-robot" aria-hidden="true" /> AI Trip Briefing
            <button className={s.regenerateBtn} onClick={() => briefing.refetch()} disabled={briefing.isFetching} aria-label="Regenerate briefing" title="Regenerate">
              <i className={`fa-solid fa-arrows-rotate ${briefing.isFetching ? 'fa-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
          {briefing.isPending ? (
            <div className={s.briefingSkeleton} />
          ) : (
            <p className={s.briefingText}>{briefing.isError ? 'Unable to generate AI briefing right now.' : briefing.data}</p>
          )}
        </div>
      )}
    </div>
  );
}
