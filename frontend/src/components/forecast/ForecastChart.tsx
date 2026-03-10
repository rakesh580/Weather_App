import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { useTheme } from '../../context/ThemeContext';
import { useWeather } from '../../context/WeatherContext';
import { convertTemp } from '../../utils/tempUtils';
import type { ForecastEntry } from '../../types/weather';
import s from '../../styles/components/forecast.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type ChartType = 'temperature' | 'wind' | 'humidity';

const configs: Record<ChartType, { key: keyof ForecastEntry; label: string; light: { color: string; fill: string }; dark: { color: string; fill: string } }> = {
  temperature: { key: 'temperature', label: 'Temperature (°F)', light: { color: '#ff6348', fill: 'rgba(255,99,72,0.15)' }, dark: { color: '#00d4ff', fill: 'rgba(0,212,255,0.10)' } },
  wind:        { key: 'wind_speed',  label: 'Wind Speed (mph)',  light: { color: '#63b3ed', fill: 'rgba(99,179,237,0.15)' }, dark: { color: '#63b3ed', fill: 'rgba(99,179,237,0.10)' } },
  humidity:    { key: 'humidity',     label: 'Humidity (%)',      light: { color: '#48bb78', fill: 'rgba(72,187,120,0.15)' }, dark: { color: '#48bb78', fill: 'rgba(72,187,120,0.10)' } },
};

interface Props { entries: ForecastEntry[]; }

export default function ForecastChart({ entries }: Props) {
  const [chartType, setChartType] = useState<ChartType>('temperature');
  const { theme } = useTheme();
  const { unit } = useWeather();
  const isDark = theme === 'dark';

  const cfg = configs[chartType];
  const themeColors = isDark ? cfg.dark : cfg.light;
  const textColor = isDark ? 'rgba(240,240,240,0.7)' : 'rgba(255,255,255,0.8)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';

  const data = useMemo(() => ({
    labels: entries.map(e => {
      const d = new Date(e.dt * 1000);
      return d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
    }),
    datasets: [{
      label: chartType === 'temperature' ? `Temperature (°${unit})` : cfg.label,
      data: entries.map(e => {
        const v = e[cfg.key] as number;
        return cfg.key === 'temperature' ? convertTemp(v, unit) : v;
      }),
      borderColor: themeColors.color,
      backgroundColor: themeColors.fill,
      borderWidth: 3,
      pointRadius: 4,
      pointBackgroundColor: themeColors.color,
      pointBorderColor: isDark ? '#111' : '#fff',
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  }), [entries, cfg, themeColors, isDark, chartType, unit]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { labels: { color: textColor, font: { size: 12 } } },
      tooltip: {
        backgroundColor: isDark ? 'rgba(12,12,12,0.95)' : 'rgba(30,60,114,0.90)',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.85)',
        borderColor: isDark ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
      },
    },
    scales: {
      x: { ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 }, grid: { color: gridColor } },
      y: { title: { display: true, text: chartType === 'temperature' ? `Temperature (°${unit})` : cfg.label, color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
    },
  }), [cfg.label, textColor, gridColor, isDark, chartType, unit]);

  return (
    <div>
      <div className={s.chartTabs}>
        {(['temperature', 'wind', 'humidity'] as ChartType[]).map(t => (
          <button
            key={t}
            className={`${s.chartTab} ${chartType === t ? s.chartTabActive : ''}`}
            onClick={() => setChartType(t)}
          >
            {t === 'temperature' ? 'Temp' : t === 'wind' ? 'Wind' : 'Humidity'}
          </button>
        ))}
      </div>
      <div className={s.chartContainer}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
