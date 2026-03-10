import { useState, useRef } from 'react';
import { planJourney } from '../../api/journey';
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

export default function JourneySection({ onJourneyData }: Props) {
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
  const [showCompare, setShowCompare] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handlePlan = async () => {
    if (!origin || !dest) { alert('Please select both an origin and destination city.'); return; }
    if (!departure) { alert('Please select a departure date and time.'); return; }

    setLoading(true);
    setData(null);

    try {
      const result = await planJourney({
        origin_lat: origin.lat, origin_lon: origin.lon, origin_name: origin.name,
        dest_lat: dest.lat, dest_lon: dest.lon, dest_name: dest.name,
        departure_time: departure,
      });
      setData(result);
      onJourneyData?.(result);
    } catch (e) {
      alert('Failed to plan journey. Please try again.');
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
    alert('Journey saved!');
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
      alert('Unable to capture screenshot.');
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

  const handleOriginSelect = (city: CityData) => { setOrigin(city); setOriginQuery(city.name); };
  const handleDestSelect = (city: CityData) => { setDest(city); setDestQuery(city.name); };

  return (
    <div className={`glass-card ${s.section}`}>
      <div className={s.sectionHeader ?? ''} style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          <i className="fa-solid fa-road" /> Journey Weather Corridor
        </h2>
      </div>
      <div className={s.form}>
        <div className={s.inputRow}>
          <JourneyCityInput label="Origin" onSelect={handleOriginSelect} value={originQuery} />
          <button className={s.swapBtn} onClick={handleSwap} title="Swap origin & destination" type="button">
            <i className="fa-solid fa-arrows-rotate" />
          </button>
          <JourneyCityInput label="Destination" onSelect={handleDestSelect} value={destQuery} />
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
        <div className={s.toolRow}>
          <button
            className={s.toolBtn}
            onClick={() => setShowCompare(!showCompare)}
          >
            <i className="fa-solid fa-arrows-split-up-and-left" /> {showCompare ? 'Hide' : 'Compare Departures'}
          </button>
        </div>
      </div>

      <JourneyHistory onReplan={handleReplan} />

      {showCompare && <JourneyComparison origin={origin} dest={dest} />}

      {loading && <div className={s.loadingSkeleton} />}

      {data && (
        <div className="fade-in-up" ref={resultsRef}>
          <div className={s.actionBar}>
            <button className={s.toolBtn} onClick={handleSave}>
              <i className="fa-solid fa-bookmark" /> Save Journey
            </button>
            <button className={s.toolBtn} onClick={handleShare}>
              <i className="fa-solid fa-share-nodes" /> Share
            </button>
          </div>
          <JourneySummary data={data} />
          <JourneyMap data={data} />
          <JourneySparkline data={data} />
          <JourneyTimeline data={data} />
        </div>
      )}
    </div>
  );
}
