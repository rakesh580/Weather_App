import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { planJourney } from '../../api/journey';
import { useToast } from '../ui/Toast';
import JourneyCityInput from './JourneyCityInput';
import JourneySummary from './JourneySummary';
import JourneyMap from './JourneyMap';
import JourneySparkline from './JourneySparkline';
import JourneyTimeline from './JourneyTimeline';
import JourneyHistory, { saveToHistory } from './JourneyHistory';
import JourneyComparison from './JourneyComparison';
import type { CityData, JourneyResponse, SavedJourney } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  onJourneyData?: (data: JourneyResponse | null) => void;
}

type ResultTab = 'overview' | 'timeline' | 'compare';

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function JourneySection({ onJourneyData }: Props) {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState<CityData | null>(null);
  const [dest, setDest] = useState<CityData | null>(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [departure, setDeparture] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resultTab, setResultTab] = useState<ResultTab>('overview');
  const resultsRef = useRef<HTMLDivElement>(null);

  const handlePlan = async () => {
    const newErrors: Record<string, string> = {};
    if (!origin) newErrors.origin = 'Select an origin location';
    if (!dest) newErrors.dest = 'Select a destination location';
    if (!departure) newErrors.departure = 'Select a departure time';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    setData(null);

    try {
      const result = await planJourney({
        origin_lat: origin!.lat, origin_lon: origin!.lon, origin_name: origin!.name,
        dest_lat: dest!.lat, dest_lon: dest!.lon, dest_name: dest!.name,
        departure_time: departure,
      });
      setData(result);
      setResultTab('overview');
      onJourneyData?.(result);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      showToast('Failed to plan journey. Please try again.', 'error');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    const tmpOrigin = origin;
    const tmpOriginQ = originQuery;
    setOrigin(dest);
    setOriginQuery(destQuery);
    setDest(tmpOrigin);
    setDestQuery(tmpOriginQ);
    setErrors(prev => { const n = { ...prev }; delete n.origin; delete n.dest; return n; });
  };

  const handleSave = () => {
    if (!data || !origin || !dest) return;
    const severityRank: Record<string, number> = { clear: 0, clouds: 1, unknown: 2, fog: 3, rain: 4, snow: 5, storm: 6 };
    let worst = 'clear';
    for (const wp of data.waypoints) {
      if ((severityRank[wp.severity] ?? 0) > (severityRank[worst] ?? 0)) worst = wp.severity;
    }
    const saved: SavedJourney = {
      id: Date.now().toString(36),
      origin_name: origin.name,
      dest_name: dest.name,
      departure_time: departure,
      saved_at: new Date().toISOString(),
      request: {
        origin_lat: origin.lat, origin_lon: origin.lon, origin_name: origin.name,
        dest_lat: dest.lat, dest_lon: dest.lon, dest_name: dest.name,
        departure_time: departure,
      },
      summary: {
        distance_miles: data.total_distance_miles,
        duration_hours: data.total_duration_hours,
        worst_severity: worst,
      },
    };
    saveToHistory(saved);
    showToast('Journey saved!', 'success');
  };

  const handleShare = async () => {
    if (!resultsRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(resultsRef.current, { useCORS: true, scale: 2 });
      canvas.toBlob(blob => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], 'journey-weather.png', { type: 'image/png' });
          navigator.share({ files: [file], title: 'Journey Weather Corridor' }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'journey-weather.png'; a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch {
      showToast('Unable to capture screenshot.', 'error');
    }
  };

  const handleReplan = (saved: SavedJourney) => {
    const req = saved.request;
    setOrigin({ lat: req.origin_lat, lon: req.origin_lon, name: req.origin_name || '' });
    setDest({ lat: req.dest_lat, lon: req.dest_lon, name: req.dest_name || '' });
    setOriginQuery(req.origin_name || '');
    setDestQuery(req.dest_name || '');
    setDeparture(req.departure_time);
  };

  const handleOriginSelect = (city: CityData) => {
    setOrigin(city);
    setOriginQuery(city.name);
    setErrors(prev => { const n = { ...prev }; delete n.origin; return n; });
  };
  const handleDestSelect = (city: CityData) => {
    setDest(city);
    setDestQuery(city.name);
    setErrors(prev => { const n = { ...prev }; delete n.dest; return n; });
  };

  const resultTabs: { key: ResultTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'fa-solid fa-map' },
    { key: 'timeline', label: 'Timeline', icon: 'fa-solid fa-timeline' },
    { key: 'compare', label: 'Compare', icon: 'fa-solid fa-arrows-split-up-and-left' },
  ];

  return (
    <div className={`glass-card ${s.section}`}>
      {/* Header with premium badge */}
      <div className={s.sectionHeader}>
        <div>
          <h2 className={s.sectionTitle}>
            <i className="fa-solid fa-road" /> Journey Weather Corridor
            <span className={s.premiumBadge}>NEW</span>
          </h2>
          <p className={s.sectionSubtitle}>Time-shifted weather along your driving route</p>
        </div>
      </div>

      {/* Form: two-row layout */}
      <div className={s.form}>
        <div className={s.routeRow}>
          <JourneyCityInput label="Origin" onSelect={handleOriginSelect} value={originQuery} error={errors.origin} />
          <motion.button
            className={s.swapBtn}
            onClick={handleSwap}
            title="Swap origin & destination"
            type="button"
            whileTap={{ rotate: 180, scale: 0.9 }}
          >
            <i className="fa-solid fa-arrows-rotate" />
          </motion.button>
          <JourneyCityInput label="Destination" onSelect={handleDestSelect} value={destQuery} error={errors.dest} />
        </div>
        <div className={s.actionRow}>
          <div className={`${s.field} ${s.fieldTime}`}>
            <label className={s.fieldLabel}>Departure</label>
            <input
              className={s.fieldInput}
              type="datetime-local"
              value={departure}
              onChange={e => setDeparture(e.target.value)}
            />
          </div>
          <button className={s.goBtn} onClick={handlePlan} disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin" /> Planning...</>
              : <><i className="fa-solid fa-road" /> Plan Route</>
            }
          </button>
        </div>
      </div>

      <JourneyHistory onReplan={handleReplan} />

      {/* Loading skeleton */}
      {loading && (
        <div className={s.skeletonWrap}>
          <div className={`${s.skeletonBar} ${s.skeletonSummary}`} />
          <div className={`${s.skeletonBar} ${s.skeletonMap}`}>
            <i className={`fa-solid fa-location-dot ${s.skeletonMapPin}`} />
          </div>
          <div className={s.skeletonCards}>
            {[...Array(5)].map((_, i) => <div key={i} className={s.skeletonCard} />)}
          </div>
        </div>
      )}

      {/* Onboarding empty state */}
      {!data && !loading && (
        <div className={s.onboarding}>
          <div className={s.onboardingIcon}><i className="fa-solid fa-road" /></div>
          <div className={s.onboardingTitle}>Plan your route to see weather along the way</div>
          <div className={s.onboardingSubtitle}>Enter origin, destination, and departure time above</div>
          <div className={s.onboardingPills}>
            <span className={s.onboardingPill}><i className="fa-solid fa-cloud-sun" /> Real-time forecasts</span>
            <span className={s.onboardingPill}><i className="fa-solid fa-robot" /> AI briefing</span>
            <span className={s.onboardingPill}><i className="fa-solid fa-car" /> Driving tips</span>
            <span className={s.onboardingPill}><i className="fa-solid fa-moon" /> Night detection</span>
          </div>
        </div>
      )}

      {/* Results with staggered entrance */}
      {data && (
        <motion.div
          ref={resultsRef}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Action bar */}
          <motion.div className={s.actionBar} variants={staggerItem}>
            <button className={s.toolBtn} onClick={handleSave}>
              <i className="fa-solid fa-bookmark" /> Save Journey
            </button>
            <button className={s.toolBtn} onClick={handleShare}>
              <i className="fa-solid fa-share-nodes" /> Share
            </button>
          </motion.div>

          {/* Result tabs */}
          <motion.div className={s.resultTabs} variants={staggerItem}>
            {resultTabs.map(tab => (
              <button
                key={tab.key}
                className={`${s.resultTab} ${resultTab === tab.key ? s.resultTabActive : ''}`}
                onClick={() => setResultTab(tab.key)}
              >
                <i className={tab.icon} /> {tab.label}
                {resultTab === tab.key && (
                  <motion.div
                    className={s.resultTabIndicator}
                    layoutId="result-tab-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </motion.div>

          {/* Tab content */}
          <motion.div variants={staggerItem}>
            <AnimatePresence mode="wait">
              {resultTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <JourneySummary data={data} />
                  <JourneyMap data={data} />
                </motion.div>
              )}
              {resultTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <JourneySparkline data={data} />
                  <JourneyTimeline data={data} />
                </motion.div>
              )}
              {resultTab === 'compare' && (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <JourneyComparison origin={origin} dest={dest} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
