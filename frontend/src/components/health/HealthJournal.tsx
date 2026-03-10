import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeather } from '../../context/WeatherContext';
import { getPressureTrend } from '../../api/health';
import {
  getHealthLog, addHealthEntry, deleteHealthEntry,
  computeCorrelations, detectTriggers,
} from '../../utils/healthCorrelation';
import { SYMPTOM_TYPES, SEVERITY_LABELS } from '../../types/health';
import type { HealthLogEntry, CorrelationResult, TriggerAlert, PressureTrend } from '../../types/health';
import s from '../../styles/components/health.module.css';

const WEATHER_VAR_LABELS: Record<string, string> = {
  temp: 'Temp', humidity: 'Humidity', pressure: 'Pressure', clouds: 'Clouds', wind_speed: 'Wind',
};

export default function HealthJournal() {
  const { weather } = useWeather();
  const [log, setLog] = useState<HealthLogEntry[]>([]);
  const [severities, setSeverities] = useState<Record<string, number>>({});
  const [pressureTrend, setPressureTrend] = useState<PressureTrend | null>(null);

  useEffect(() => { setLog(getHealthLog()); }, []);

  useEffect(() => {
    if (!weather) return;
    getPressureTrend(weather.lat, weather.lon).then(setPressureTrend).catch(() => {});
  }, [weather?.lat, weather?.lon]);

  const correlations = useMemo(() => computeCorrelations(log), [log]);

  const alerts = useMemo(() => {
    if (!pressureTrend) return [];
    return detectTriggers(correlations, pressureTrend.delta_6h);
  }, [correlations, pressureTrend]);

  const cycleSeverity = (symptomId: string) => {
    setSeverities(prev => ({
      ...prev,
      [symptomId]: ((prev[symptomId] ?? 0) + 1) % 4,
    }));
  };

  const handleLog = () => {
    if (!weather) return;
    const symptoms = Object.entries(severities)
      .filter(([, sev]) => sev > 0)
      .map(([symptom, severity]) => ({ symptom, severity }));
    if (symptoms.length === 0) return;

    const entry: HealthLogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      symptoms,
      weather: {
        temp: weather.temperature,
        humidity: weather.humidity,
        pressure: weather.pressure ?? null,
        aqi: null,
        clouds: weather.clouds ?? 0,
        wind_speed: weather.wind_speed,
        description: weather.weather,
      },
    };

    const updated = addHealthEntry(entry);
    setLog(updated);
    setSeverities({});
  };

  const handleDelete = (id: string) => {
    setLog(deleteHealthEntry(id));
  };

  const hasActive = Object.values(severities).some(v => v > 0);

  // Build correlation matrix data
  const symptomNames = [...new Set(correlations.map(c => c.symptom))];
  const varNames = [...new Set(correlations.map(c => c.variable))];

  const getCorr = (symptom: string, variable: string): CorrelationResult | undefined =>
    correlations.find(c => c.symptom === symptom && c.variable === variable);

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.title}>Health Weather Journal</div>
        <div className={s.subtitle}>Track symptoms & discover your weather sensitivities</div>
      </div>

      {/* Trigger alerts */}
      <AnimatePresence>
        {alerts.map((alert: TriggerAlert, i: number) => (
          <motion.div
            key={i}
            className={`${s.alertBar} ${alert.risk_level === 'high' ? s.alertBarHigh : alert.risk_level === 'medium' ? s.alertBarMedium : s.alertBarLow}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <i className={`fa-solid fa-triangle-exclamation ${s.alertIcon}`} />
            {alert.message}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Symptom Logger */}
      <div className={s.loggerSection}>
        <div className={s.sectionTitle}>
          <i className="fa-solid fa-stethoscope" style={{ color: '#818cf8' }} />
          Log Today's Symptoms
        </div>
        <div className={s.symptomGrid}>
          {SYMPTOM_TYPES.map(sym => {
            const sev = severities[sym.id] ?? 0;
            const sevClass = sev === 1 ? s.symptomSev1 : sev === 2 ? s.symptomSev2 : sev === 3 ? s.symptomSev3 : '';
            return (
              <motion.button
                key={sym.id}
                className={`${s.symptomBtn} ${sev > 0 ? s.symptomBtnActive : ''} ${sevClass}`}
                onClick={() => cycleSeverity(sym.id)}
                whileTap={{ scale: 0.92 }}
              >
                <i className={`fa-solid ${sym.icon} ${s.symptomIcon}`} />
                {sym.name}
                {sev > 0 && <span className={s.sevLabel}>{SEVERITY_LABELS[sev]}</span>}
              </motion.button>
            );
          })}
        </div>
        <button
          className={s.logBtn}
          onClick={handleLog}
          disabled={!hasActive || !weather}
        >
          <i className="fa-solid fa-plus" style={{ marginRight: 8 }} />
          Log Symptoms with Current Weather
        </button>
      </div>

      {/* Correlation matrix */}
      {correlations.length > 0 && (
        <div className={s.matrixSection}>
          <div className={s.sectionTitle}>
            <i className="fa-solid fa-chart-simple" style={{ color: '#22c55e' }} />
            Your Correlations
          </div>
          {log.length < 14 && (
            <div className={s.minEntries}>
              {log.length}/14 days logged — more data improves accuracy
            </div>
          )}
          <div className={s.matrixWrap}>
            <table className={s.matrix}>
              <thead>
                <tr>
                  <th></th>
                  {varNames.map(v => <th key={v}>{WEATHER_VAR_LABELS[v] || v}</th>)}
                </tr>
              </thead>
              <tbody>
                {symptomNames.map(sym => (
                  <tr key={sym}>
                    <td className={s.matrixRowLabel}>{sym}</td>
                    {varNames.map(v => {
                      const c = getCorr(sym, v);
                      if (!c) return <td key={v} className={s.corrNeutral}>—</td>;
                      const abs = Math.abs(c.correlation);
                      const cellClass = abs < 0.15 ? s.corrNeutral
                        : c.correlation > 0 ? s.corrPositive : s.corrNegative;
                      const strong = abs > 0.3 ? s.corrStrong : '';
                      const opacity = Math.max(0.3, abs);
                      return (
                        <td key={v} className={`${cellClass} ${strong}`} style={{ opacity }}>
                          {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}
                          {c.significant && '*'}
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
          <div className={s.emptyIcon}><i className="fa-solid fa-heart-pulse" /></div>
          <div>No entries yet. Log your first symptoms above!</div>
          <div className={s.minEntries}>After 7+ days, we'll show your weather-symptom correlations</div>
        </div>
      )}

      {/* Log history */}
      {log.length > 0 && (
        <div className={s.historySection}>
          <div className={s.sectionTitle}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#f59e0b' }} />
            Recent Logs ({log.length})
          </div>
          {log.slice(-10).reverse().map(entry => (
            <div key={entry.id} className={s.historyItem}>
              <div>
                <div className={s.historyDate}>
                  {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' — '}{Math.round(entry.weather.temp)}&deg;F, {entry.weather.description}
                </div>
                <div className={s.historySymptoms}>
                  {entry.symptoms.map(sym => (
                    <span key={sym.symptom} className={s.historyChip}>
                      {sym.symptom} ({SEVERITY_LABELS[sym.severity]})
                    </span>
                  ))}
                </div>
              </div>
              <button className={s.historyDelete} onClick={() => handleDelete(entry.id)} title="Delete entry">
                <i className="fa-solid fa-trash" />
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
