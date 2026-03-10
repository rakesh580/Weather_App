import { useState } from 'react';
import { useWeather } from '../../context/WeatherContext';
import ForecastCards from './ForecastCards';
import ForecastChart from './ForecastChart';
import DailyForecast from './DailyForecast';
import s from '../../styles/components/forecast.module.css';

type View = 'cards' | 'chart' | 'daily';

export default function ForecastSection() {
  const [view, setView] = useState<View>('cards');
  const { forecast } = useWeather();

  if (!forecast) return null;

  return (
    <div>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>Forecast</h2>
        <div className={s.viewToggle}>
          {(['cards', 'chart', 'daily'] as View[]).map(v => (
            <button
              key={v}
              className={`${s.viewBtn} ${view === v ? s.viewBtnActive : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'cards' ? 'Cards' : v === 'chart' ? 'Chart' : '5-Day'}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' && <ForecastCards entries={forecast.forecast.slice(0, 12)} />}
      {view === 'chart' && <ForecastChart entries={forecast.forecast.slice(0, 12)} />}
      {view === 'daily' && <DailyForecast entries={forecast.forecast} />}
    </div>
  );
}
