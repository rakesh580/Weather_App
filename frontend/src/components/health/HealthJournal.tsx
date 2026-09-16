import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeather } from '../../hooks/useWeather';
import { locationKey } from '../../utils/location';
import { getPressureTrend } from '../../api/health';
import { getHealthLog, addHealthEntry, deleteHealthEntry, computeCorrelations, detectTriggers } from '../../utils/healthCorrelation';
import { convertTemp } from '../../utils/tempUtils';
import { SYMPTOM_TYPES, SEVERITY_LABELS } from '../../types/health';
import type { HealthLogEntry, CorrelationResult, TriggerAlert } from '../../types/health';
import s from '../../styles/components/health.module.css';

const WEATHER_VAR_LABELS: Record<string, string> = {
  temp: 'Temp', humidity: 'Humidity', pressure: 'Pressure', clouds: 'Clouds', wind_speed: 'Wind',
};

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function HealthJournal() {
  const { weather, location, unit } = useWeather();
  const [log, setLog] = useState<HealthLogEntry[]>(getHealthLog);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const key = locationKey(location);

  const pressure = useQuery({
    queryKey: ['pressure-trend', key],
    queryFn: ({ signal }) => getPressureTrend(location!.lat, location!.lon, { signal }),
    enabled: !!location,
    staleTime: 15 * 60 * 1000,
  });

  const correlations = useMemo(() => computeCorrelations(log), [log]);
  const alerts = useMemo(() => (pressure.data ? detectTriggers(correlations, pressure.data.delta_6h) : []), [correlations, pressure.data]);
  const daysLogged = useMemo(() => new Set(log.map(e => e.timestamp.slice(0, 10))).size, [log]);

  const cycleSeverity = (symptomId: string) => {
    setSeverities(prev => ({ ...prev, [symptomId]: ((prev[symptomId] ?? 0) + 1) % 4 }));
  };

  const handleLog = () => {
    if (!weather) return;
    const symptoms = Object.entries(severities).filter(([, sev]) => sev > 0).map(([symptom, severity]) => ({ symptom, severity }));
    if (symptoms.length === 0) return;
    const entry: HealthLogEntry = {
      id: newId(),
      timestamp: new Date().toISOString(),
      symptoms,
      weather: {
        temp: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure ?? null,
        aqi: weather.aqi ?? null,
        clouds: weather.clouds ?? 0,
        wind_speed: weather.wind_speed,
        description: weather.weather,
      },
    };
    setLog(addHealthEntry(entry));
    setSeverities({});
  };

  const hasActive = Object.values(severities).some(v => v > 0);
  const symptomNames = [...new Set(correlations.map(c => c.symptom))];
  const varNames = [...new Set(correlations.map(c => c.variable))];
  const getCorr = (symptom: string, variable: string): CorrelationResult | undefined =>
    correlations.find(c => c.symptom === symptom && c.variable === variable);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <h2 className={s.title}>Health Weather Journal</h2>
        <div className={s.subtitle}>Track symptoms & discover your weather sensitivities. Data stays in this browser.</div>
      </div>

      {pressure.data && (
        <div className={s.pressureStrip} aria-label="Pressure outlook">
          <i className="fa-solid fa-gauge-high" aria-hidden="true" />
          <span>
            Pressure {pressure.data.delta_6h > 0 ? 'rising' : pressure.data.delta_6h < 0 ? 'falling' : 'steady'} {Math.abs(pressure.data.delta_6h)} hPa over the next 6h
            {pressure.data.rapid_change && <strong> — rapid change</strong>}
          </span>
        </div>
      )}

      <AnimatePresence>
        {alerts.map((alert: TriggerAlert) => (
          <motion.div
            key={`${alert.symptom}-${alert.trigger}`}
            role="alert"
            className={`${s.alertBar} ${alert.risk_level === 'high' ? s.alertBarHigh : alert.risk_level === 'medium' ? s.alertBarMedium : s.alertBarLow}`}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <i className={`fa-solid fa-triangle-exclamation ${s.alertIcon}`} aria-hidden="true" />
            {alert.message}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className={s.loggerSection}>
        <div className={s.sectionTitle}>
          <i className="fa-solid fa-stethoscope" style={{ color: 'var(--accent)' }} aria-hidden="true" /> Log Today's Symptoms
        </div>
        <div className={s.symptomGrid} role="group" aria-label="Symptoms (click to cycle severity)">
          {SYMPTOM_TYPES.map(sym => {
            const sev = severities[sym.id] ?? 0;
            const sevClass = sev === 1 ? s.symptomSev1 : sev === 2 ? s.symptomSev2 : sev === 3 ? s.symptomSev3 : '';
            return (
              <motion.button
                key={sym.id}
                type="button"
                className={`${s.symptomBtn} ${sev > 0 ? s.symptomBtnActive : ''} ${sevClass}`}
                onClick={() => cycleSeverity(sym.id)}
                whileTap={{ scale: 0.92 }}
                aria-pressed={sev > 0}
                aria-label={`${sym.name}: ${SEVERITY_LABELS[sev]}`}
              >
                <i className={`fa-solid ${sym.icon} ${s.symptomIcon}`} aria-hidden="true" />
                {sym.name}
                {sev > 0 && <span className={s.sevLabel}>{SEVERITY_LABELS[sev]}</span>}
              </motion.button>
            );
          })}
        </div>
        <button className={s.logBtn} onClick={handleLog} disabled={!hasActive || !weather}>
          <i className="fa-solid fa-plus" style={{ marginRight: 8 }} aria-hidden="true" />
          {weather ? 'Log Symptoms with Current Weather' : 'Search a city first to log symptoms'}
        </button>
      </div>

      {correlations.length > 0 && (
        <div className={s.matrixSection}>
          <div className={s.sectionTitle}>
            <i className="fa-solid fa-chart-simple" style={{ color: '#16a34a' }} aria-hidden="true" /> Your Correlations
          </div>
          {daysLogged < 14 && <div className={s.minEntries}>{daysLogged}/14 days logged — more days improve accuracy</div>}
          <div className={s.matrixWrap}>
            <table className={s.matrix}>
              <caption className={s.srOnly}>Correlation between logged symptoms and weather variables (* = statistically significant)</caption>
              <thead>
                <tr>
                  <th scope="col">Symptom</th>
                  {varNames.map(v => <th key={v} scope="col">{WEATHER_VAR_LABELS[v] || v}</th>)}
                </tr>
              </thead>
              <tbody>
                {symptomNames.map(sym => (
                  <tr key={sym}>
                    <th scope="row" className={s.matrixRowLabel}>{sym}</th>
                    {varNames.map(v => {
                      const c = getCorr(sym, v);
                      if (!c) return <td key={v} className={s.corrNeutral}>—</td>;
                      const abs = Math.abs(c.correlation);
                      const cellClass = abs < 0.15 ? s.corrNeutral : c.correlation > 0 ? s.corrPositive : s.corrNegative;
                      return (
                        <td key={v} className={`${cellClass} ${abs > 0.3 ? s.corrStrong : ''}`} style={{ opacity: Math.max(0.55, abs) }}>
                          {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}{c.significant && '*'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {log.length === 0 && (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}><i className="fa-solid fa-heart-pulse" aria-hidden="true" /></div>
          <div>No entries yet. Log your first symptoms above!</div>
          <div className={s.minEntries}>After 7+ entries, we'll show your weather-symptom correlations</div>
        </div>
      )}

      {log.length > 0 && (
        <div className={s.historySection}>
          <div className={s.sectionTitle}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#f59e0b' }} aria-hidden="true" /> Recent Logs ({log.length})
          </div>
          {log.slice(-10).reverse().map(entry => (
            <div key={entry.id} className={s.historyItem}>
              <div>
                <div className={s.historyDate}>
                  {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' — '}{convertTemp(entry.weather.temp, unit)}&deg;{unit}, {entry.weather.description}
                </div>
                <div className={s.historySymptoms}>
                  {entry.symptoms.map(sym => (
                    <span key={sym.symptom} className={s.historyChip}>{sym.symptom} ({SEVERITY_LABELS[sym.severity]})</span>
                  ))}
                </div>
              </div>
              <button className={s.historyDelete} onClick={() => setLog(deleteHealthEntry(entry.id))} aria-label="Delete entry" title="Delete entry">
                <i className="fa-solid fa-trash" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={s.disclaimer}>
        This is not medical advice. Correlations shown are statistical observations from your logged data only.
        Consult a healthcare provider for medical decisions.
      </div>
    </div>
  );
}
