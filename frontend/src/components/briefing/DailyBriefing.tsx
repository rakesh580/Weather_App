import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getBriefing, getServerHealth } from '../../api/weather';
import { useWeather } from '../../hooks/useWeather';
import { locationKey } from '../../utils/location';
import s from '../../styles/components/briefing.module.css';

/** AI-written 3-sentence briefing. Renders nothing when the server has no AI provider configured. */
export default function DailyBriefing() {
  const { location, weather } = useWeather();
  const key = locationKey(location);

  const health = useQuery({ queryKey: ['server-health'], queryFn: ({ signal }) => getServerHealth({ signal }), staleTime: Infinity });
  const aiEnabled = !!health.data?.providers.ai;

  const briefing = useQuery({
    queryKey: ['briefing', key],
    queryFn: ({ signal }) => getBriefing(location!.lat, location!.lon, weather?.city, { signal }),
    enabled: aiEnabled && !!location && !!weather,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  if (!aiEnabled || !location || !weather) return null;

  return (
    <motion.section className={s.card} aria-label="AI daily briefing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={s.head}>
        <span className={s.badge}><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> AI briefing</span>
        {briefing.data && <span className={s.meta}>{weather.city} · {new Date(briefing.data.generated_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>}
        <button className={s.refresh} onClick={() => briefing.refetch()} disabled={briefing.isFetching} aria-label="Regenerate briefing">
          <i className={`fa-solid fa-arrows-rotate ${briefing.isFetching ? 'fa-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {briefing.isPending && <div className={s.skeleton}><span /><span /><span /></div>}
      {briefing.isError && <p className={s.error}>The briefing isn't available right now.</p>}
      {briefing.data && <p className={s.text}>{briefing.data.briefing}</p>}
    </motion.section>
  );
}
