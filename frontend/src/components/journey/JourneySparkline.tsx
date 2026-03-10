import { Line } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';
import type { JourneyResponse } from '../../types/journey';
import s from '../../styles/components/journey.module.css';

interface Props { data: JourneyResponse; }

export default function JourneySparkline({ data }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const labels = data.waypoints.map(wp => wp.name.split(',')[0].slice(0, 10));
  const temps = data.waypoints.map(wp => Math.round(wp.weather.temperature));
  const colors = data.waypoints.map(wp => wp.color);

  const chartData = {
    labels,
    datasets: [{
      data: temps,
      borderColor: isDark ? '#00f5ff' : '#ff6b35',
      borderWidth: 2,
      pointBackgroundColor: colors,
      pointBorderColor: '#fff',
      pointBorderWidth: 1,
      pointRadius: 4,
      tension: 0.4,
      fill: true,
      backgroundColor: isDark
        ? 'rgba(0, 245, 255, 0.08)'
        : 'rgba(255, 107, 53, 0.1)',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => `${ctx.raw}°F`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          font: { size: 9 },
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
          maxRotation: 0,
        },
        grid: { display: false },
      },
      y: { display: false },
    },
  };

  return (
    <div className={s.sparklineContainer}>
      <div className={s.sparklineHeader}>
        <i className="fa-solid fa-temperature-half" /> Temperature Along Route
      </div>
      <div className={s.sparklineChart}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
