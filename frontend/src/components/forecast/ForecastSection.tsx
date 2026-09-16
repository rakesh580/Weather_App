import { useState, lazy, Suspense } from 'react';
import { useWeather } from '../../hooks/useWeather';
import ForecastCards from './ForecastCards';
import DailyForecast from './DailyForecast';
import s from '../../styles/components/forecast.module.css';

const ForecastChart = lazy(() => import('./ForecastChart'));

type View = 'cards' | 'chart' | 'daily';
const VIEWS: { key: View; label: string }[] = [
  { key: 'cards', label: 'Next 36h' },
  { key: 'chart', label: 'Chart' },
  { key: 'daily', label: '5-Day' },
];

export default function ForecastSection() {
  const [view, setView] = useState<View>('cards');
  const { forecast } = useWeather();

  if (!forecast) return null;
  const tz = forecast.timezone_offset ?? 0;

  return (
    <section aria-label="Forecast">
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>Forecast</h2>
        <div className={s.viewToggle} role="group" aria-label="Forecast view">
          {VIEWS.map(v => (
            <button key={v.key} className={`${s.viewBtn} ${view === v.key ? s.viewBtnActive : ''}`} onClick={() => setView(v.key)} aria-pressed={view === v.key}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' && <ForecastCards entries={forecast.forecast.slice(0, 12)} timezoneOffset={tz} />}
      {view === 'chart' && (
        <Suspense fallback={<div className="skeleton" style={{ height: 280 }} />}>
          <ForecastChart entries={forecast.forecast.slice(0, 16)} timezoneOffset={tz} />
        </Suspense>
      )}
      {view === 'daily' && <DailyForecast entries={forecast.forecast} timezoneOffset={tz} />}
    </section>
  );
}
