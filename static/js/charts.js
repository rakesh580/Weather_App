// ===== Forecast Chart (Chart.js) — Multi-type with tabs =====
let forecastChart = null;
let currentChartType = 'temperature';

const chartConfigs = {
  temperature: { key: 'temperature', label: 'Temperature (°F)', unit: '°F',
    light: { color: '#ff6348', fill: 'rgba(255,99,72,0.15)' },
    dark:  { color: '#00d4ff', fill: 'rgba(0,212,255,0.10)' }
  },
  wind: { key: 'wind_speed', label: 'Wind Speed (mph)', unit: ' mph',
    light: { color: '#63b3ed', fill: 'rgba(99,179,237,0.15)' },
    dark:  { color: '#63b3ed', fill: 'rgba(99,179,237,0.10)' }
  },
  humidity: { key: 'humidity', label: 'Humidity (%)', unit: '%',
    light: { color: '#48bb78', fill: 'rgba(72,187,120,0.15)' },
    dark:  { color: '#48bb78', fill: 'rgba(72,187,120,0.10)' }
  }
};

function switchChart(type) {
  currentChartType = type;
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  if (window.currentForecast && window.currentForecast.forecast) {
    renderForecastChart(window.currentForecast.forecast.slice(0, 12));
  }
}

function renderForecastChart(forecastData) {
  const ctx = document.getElementById('tempChart');
  if (!ctx) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? 'rgba(240,240,240,0.7)' : 'rgba(255,255,255,0.8)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
  const config = chartConfigs[currentChartType];
  const theme = isDark ? config.dark : config.light;

  const labels = forecastData.map(entry => {
    const date = new Date(entry.dt * 1000);
    return date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
  });

  const values = forecastData.map(e => {
    const v = e[config.key];
    return config.key === 'temperature' ? Math.round(v) : v;
  });

  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: config.label,
        data: values,
        borderColor: theme.color,
        backgroundColor: theme.fill,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: theme.color,
        pointBorderColor: isDark ? '#111' : '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: textColor, font: { size: 12 } } },
        tooltip: {
          backgroundColor: isDark ? 'rgba(12,12,12,0.95)' : 'rgba(30,60,114,0.90)',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.85)',
          borderColor: isDark ? 'rgba(0,212,255,0.25)' : 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
          grid: { color: gridColor }
        },
        y: {
          title: { display: true, text: config.label, color: textColor },
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    }
  });

  window.forecastChart = forecastChart;
}

function updateChartTheme() {
  if (window.currentForecast && window.currentForecast.forecast) {
    renderForecastChart(window.currentForecast.forecast.slice(0, 12));
  }
}
