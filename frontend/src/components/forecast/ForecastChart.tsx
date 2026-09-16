import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { useTheme } from '../../hooks/useTheme';
import { useWeather } from '../../hooks/useWeather';
import { convertTemp } from '../../utils/tempUtils';
import { cityHour, cityWeekday } from '../../utils/time';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type ChartType = 'temperature' | 'wind' | 'humidity' | 'pop';

const SERIES: Record<ChartType, { label: (unit: 'F' | 'C') => string; color: string; fill: string }> = {
  temperature: { label: u => `Temperature (°${u})`, color: '#e0703a', fill: 'rgba(224,112,58,0.18)' },
  wind:        { label: u => (u === 'C' ? 'Wind (km/h)' : 'Wind (mph)'), color: '#3b82f6', fill: 'rgba(59,130,246,0.15)' },
  humidity:    { label: () => 'Humidity (%)', color: '#16a34a', fill: 'rgba(22,163,74,0.15)' },
  pop:         { label: () => 'Chance of precipitation (%)', color: '#0ea5e9', fill: 'rgba(14,165,233,0.18)' },
};

interface Props { entries: ForecastEntry[]; timezoneOffset: number; }

export default function ForecastChart({ entries, timezoneOffset }: Props) {
  const [chartType, setChartType] = useState<ChartType>('temperature');
  const { theme } = useTheme();
  const { unit } = useWeather();
  const isDark = theme === 'dark';
  const cfg = SERIES[chartType];
  const textColor = isDark ? 'rgba(232,226,214,0.75)' : 'rgba(45,36,24,0.7)';
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(45,36,24,0.08)';

  const data = useMemo(() => ({
    labels: entries.map(e => `${cityWeekday(e.dt, timezoneOffset)} ${cityHour(e.dt, timezoneOffset)}`),
    datasets: [{
      label: cfg.label(unit),
      data: entries.map(e => {
        if (chartType === 'temperature') return convertTemp(e.temperature, unit);
        if (chartType === 'wind') return unit === 'C' ? Math.round(e.wind_speed * 1.609344) : Math.round(e.wind_speed);
        if (chartType === 'pop') return Math.round((e.pop ?? 0) * 100);
        return e.humidity;
      }),
      borderColor: cfg.color,
      backgroundColor: cfg.fill,
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: cfg.color,
      pointBorderColor: isDark ? '#111' : '#fff',
      pointBorderWidth: 1.5,
      tension: 0.4,
      fill: true,
    }],
  }), [entries, cfg, isDark, chartType, unit, timezoneOffset]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: textColor, font: { size: 12 } } },
      tooltip: {
        backgroundColor: isDark ? 'rgba(20,22,18,0.95)' : 'rgba(45,36,24,0.92)',
        titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.85)', cornerRadius: 10, padding: 12,
      },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 }, grid: { color: gridColor } },
      y: {
        title: { display: true, text: cfg.label(unit), color: textColor },
        ticks: { color: textColor }, grid: { color: gridColor },
        ...(chartType === 'pop' || chartType === 'humidity' ? { min: 0, max: 100 } : {}),
      },
    },
  }), [cfg, textColor, gridColor, isDark, chartType, unit]);

  return (
    <div>
      <div className={s.chartTabs} role="group" aria-label="Chart series">
        {(Object.keys(SERIES) as ChartType[]).map(t => (
          <button key={t} className={`${s.chartTab} ${chartType === t ? s.chartTabActive : ''}`} onClick={() => setChartType(t)} aria-pressed={chartType === t}>
            {t === 'temperature' ? 'Temp' : t === 'wind' ? 'Wind' : t === 'humidity' ? 'Humidity' : 'Rain %'}
          </button>
        ))}
      </div>
      <div className={s.chartContainer} role="img" aria-label={`${cfg.label(unit)} over the next ${entries.length * 3} hours`}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
