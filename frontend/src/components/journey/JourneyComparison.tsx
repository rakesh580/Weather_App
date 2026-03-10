import { useState } from 'react';
import { planJourney } from '../../api/journey';
import type { CityData, JourneyRequest, JourneyResponse } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props {
  origin: CityData | null;
  dest: CityData | null;
}

interface CompareResult {
  departure: string;
  data: JourneyResponse | null;
  error?: boolean;
}

export default function JourneyComparison({ origin, dest }: Props) {
  const [departures, setDepartures] = useState<string[]>(() => {
    const base = new Date();
    return [1, 3, 5].map(h => {
      const d = new Date(base);
      d.setHours(d.getHours() + h, 0, 0, 0);
      return d.toISOString().slice(0, 16);
    });
  });
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!origin || !dest) { alert('Select origin and destination first.'); return; }
    setLoading(true);
    setResults([]);

    const promises = departures.map(async (dep) => {
      try {
        const req: JourneyRequest = {
          origin_lat: origin.lat, origin_lon: origin.lon, origin_name: origin.name,
          dest_lat: dest.lat, dest_lon: dest.lon, dest_name: dest.name,
          departure_time: dep,
        };
        const data = await planJourney(req);
        return { departure: dep, data };
      } catch {
        return { departure: dep, data: null, error: true };
      }
    });

    const res = await Promise.all(promises);
    setResults(res);
    setLoading(false);
  };

  const severityRank: Record<string, number> = { clear: 0, clouds: 1, unknown: 2, fog: 3, rain: 4, snow: 5, storm: 6 };

  const getWorstSeverity = (data: JourneyResponse) => {
    let worst = 'clear';
    for (const wp of data.waypoints) {
      if ((severityRank[wp.severity] ?? 0) > (severityRank[worst] ?? 0)) worst = wp.severity;
    }
    return worst;
  };

  const getTempRange = (data: JourneyResponse) => {
    const temps = data.waypoints.map(w => w.weather.temperature);
    return `${Math.round(Math.min(...temps))}–${Math.round(Math.max(...temps))}°F`;
  };

  const getMaxPrecip = (data: JourneyResponse) => {
    const pops = data.waypoints.map(w => w.weather.pop ?? 0);
    return Math.round(Math.max(...pops) * 100);
  };

  // Find best departure (lowest severity rank)
  const bestIdx = results.length > 0
    ? results.reduce((best, r, i) => {
        if (!r.data) return best;
        const rank = severityRank[getWorstSeverity(r.data)] ?? 99;
        const bestRank = best === -1 ? 99 : severityRank[getWorstSeverity(results[best]!.data!)] ?? 99;
        return rank < bestRank ? i : best;
      }, -1)
    : -1;

  return (
    <div className={s.comparePanel}>
      <div className={s.compareHeader}>
        <i className="fa-solid fa-arrows-split-up-and-left" /> Compare Departures
      </div>
      <div className={s.compareInputs}>
        {departures.map((dep, i) => (
          <input
            key={i}
            className={s.fieldInput}
            type="datetime-local"
            value={dep}
            onChange={e => {
              const updated = [...departures];
              updated[i] = e.target.value;
              setDepartures(updated);
            }}
          />
        ))}
        <button className={s.goBtn} onClick={handleCompare} disabled={loading}>
          {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Comparing...</> : 'Compare'}
        </button>
      </div>

      {results.length > 0 && (
        <div className={s.compareTable}>
          <div className={s.compareRow} style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>
            <span>Departure</span>
            <span>Weather</span>
            <span>Temp Range</span>
            <span>Max Precip</span>
            <span>Duration</span>
          </div>
          {results.map((r, i) => {
            const isBest = i === bestIdx;
            if (!r.data) return (
              <div key={i} className={s.compareRow}>
                <span>{new Date(r.departure).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                <span style={{ color: '#ef4444' }}>Error</span>
                <span>—</span><span>—</span><span>—</span>
              </div>
            );
            const worst = getWorstSeverity(r.data);
            return (
              <div key={i} className={`${s.compareRow} ${isBest ? s.compareBest : ''}`}>
                <span>{new Date(r.departure).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                <span style={{ textTransform: 'capitalize' }}>{worst}</span>
                <span>{getTempRange(r.data)}</span>
                <span>{getMaxPrecip(r.data)}%</span>
                <span>{r.data.total_duration_hours} hrs</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
