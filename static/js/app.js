// ===== State =====
const API_BASE = window.location.origin;
let currentWeather = null;   // { city, country, lat, lon, ... }
let currentForecast = null;
let forecastView = 'cards';
let leafletMap = null;
let leafletMarker = null;
let searchTimeout = null;
let clockInterval = null;

// ===== Weather Icon Mapping =====
function getWeatherIcon(weatherId, icon) {
  const isNight = icon && icon.endsWith('n');
  if (weatherId >= 200 && weatherId < 300) return { html: '<i class="fa-solid fa-cloud-bolt wi-storm"></i>', cls: 'thunderstorm' };
  if (weatherId >= 300 && weatherId < 400) return { html: '<i class="fa-solid fa-cloud-rain wi-rain"></i>', cls: 'drizzle' };
  if (weatherId >= 500 && weatherId < 600) return { html: '<i class="fa-solid fa-cloud-showers-heavy wi-rain"></i>', cls: 'rain' };
  if (weatherId >= 600 && weatherId < 700) return { html: '<i class="fa-solid fa-snowflake wi-snow"></i>', cls: 'snow' };
  if (weatherId >= 700 && weatherId < 800) return { html: '<i class="fa-solid fa-smog wi-cloud"></i>', cls: 'mist' };
  if (weatherId === 800) {
    if (isNight) return { html: '<i class="fa-solid fa-moon"></i>', cls: 'night-clear' };
    return { html: '<i class="fa-solid fa-sun wi-sunny"></i>', cls: 'clear' };
  }
  if (weatherId > 800) {
    if (isNight) return { html: '<i class="fa-solid fa-cloud-moon wi-cloud"></i>', cls: 'night-clouds' };
    return { html: '<i class="fa-solid fa-cloud wi-cloud"></i>', cls: 'clouds' };
  }
  return { html: '<i class="fa-solid fa-cloud"></i>', cls: 'clouds' };
}

function getSmallIcon(weatherId, icon) {
  return getWeatherIcon(weatherId, icon).html;
}

// ===== Theme Toggle =====
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon = document.getElementById('themeIcon');
  icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  if (window.forecastChart) updateChartTheme();
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ===== Dynamic Weather Background =====
function setWeatherBackground(cls) {
  const body = document.body;
  body.className = body.className.replace(/weather-bg-\S+/g, '').trim();
  if (cls) body.classList.add('weather-bg-' + cls);
}

// ===== Search =====
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 2) { searchDropdown.classList.remove('active'); return; }
  searchTimeout = setTimeout(() => searchCity(q), 300);
});

searchInput.addEventListener('blur', () => {
  setTimeout(() => searchDropdown.classList.remove('active'), 200);
});

async function searchCity(q) {
  try {
    const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=5`);
    const results = await res.json();
    if (!results.length) { searchDropdown.classList.remove('active'); return; }

    searchDropdown.innerHTML = results.map(r => {
      const detail = [r.state, r.country].filter(Boolean).join(', ');
      return `<div class="search-result" onclick="selectCity(${r.lat}, ${r.lon}, '${r.name.replace(/'/g, "\\'")}', '${r.country || ''}')">
        <div class="search-result-name">${r.name}</div>
        <div class="search-result-detail">${detail}</div>
      </div>`;
    }).join('');
    searchDropdown.classList.add('active');
  } catch (e) {
    console.error('Search error:', e);
  }
}

async function selectCity(lat, lon, name, country) {
  searchDropdown.classList.remove('active');
  searchInput.value = name;
  await loadWeather(lat, lon, name);
}

// ===== Geolocation =====
document.getElementById('locationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { alert('Geolocation not supported'); return; }

  const btn = document.getElementById('locationBtn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
      await loadWeather(pos.coords.latitude, pos.coords.longitude, '');
    },
    (err) => {
      btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
      alert('Could not get your location. Please allow location access.');
    },
    { timeout: 10000 }
  );
});

// ===== Load Weather + Forecast =====
async function loadWeather(lat, lon, name) {
  document.getElementById('weatherSection').classList.add('hidden');
  document.getElementById('loadingSkeleton').classList.remove('hidden');

  try {
    const nameParam = name ? `&name=${encodeURIComponent(name)}` : '';
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`${API_BASE}/api/weather/coords?lat=${lat}&lon=${lon}${nameParam}`),
      fetch(`${API_BASE}/api/forecast/coords?lat=${lat}&lon=${lon}`)
    ]);

    const weather = await weatherRes.json();
    const forecast = await forecastRes.json();

    if (weather.error || forecast.error) {
      alert(weather.error || forecast.error);
      document.getElementById('loadingSkeleton').classList.add('hidden');
      return;
    }

    currentWeather = weather;
    currentForecast = forecast;

    renderWeather(weather);
    renderForecast(forecast);
    renderComfort(weather);
    renderSunBar(weather);
    startCityClock(weather.timezone_offset);
    renderDailyForecast(forecast);
    updateMap(lat, lon, weather.city);
    updateFavBtn();

    // Dynamic background + particles
    const iconInfo = getWeatherIcon(weather.weather_id, weather.weather_icon);
    setWeatherBackground(iconInfo.cls);
    renderParticles(iconInfo.cls);

    document.getElementById('loadingSkeleton').classList.add('hidden');
    document.getElementById('weatherSection').classList.remove('hidden');

  } catch (e) {
    console.error('Load weather error:', e);
    document.getElementById('loadingSkeleton').classList.add('hidden');
    alert('Failed to fetch weather. Please try again.');
  }
}

// ===== Render Weather =====
function renderWeather(w) {
  const iconInfo = getWeatherIcon(w.weather_id, w.weather_icon);
  document.getElementById('heroIcon').innerHTML = iconInfo.html;
  document.getElementById('heroTemp').innerHTML = `${Math.round(w.temperature)}<span class="unit">&deg;F</span>`;
  document.getElementById('heroDesc').textContent = w.weather;
  document.getElementById('heroCity').innerHTML = `${w.city}${w.country ? `<span class="country-badge">${w.country}</span>` : ''}`;

  // Pressure trend from forecast
  let pressureTrend = '';
  if (w.pressure && currentForecast && currentForecast.forecast && currentForecast.forecast.length > 2) {
    const futurePressure = currentForecast.forecast[2].pressure;
    if (futurePressure) {
      const diff = futurePressure - w.pressure;
      if (diff > 1) pressureTrend = '<span class="pressure-trend rising"><i class="fa-solid fa-arrow-up"></i> Rising</span>';
      else if (diff < -1) pressureTrend = '<span class="pressure-trend falling"><i class="fa-solid fa-arrow-down"></i> Falling</span>';
      else pressureTrend = '<span class="pressure-trend steady"><i class="fa-solid fa-arrow-right"></i> Steady</span>';
    }
  }

  const details = [
    { icon: 'fa-temperature-half', value: `${Math.round(w.feels_like || w.temperature)}&deg;F`, label: 'Feels Like' },
    { icon: 'fa-droplet', value: `${w.humidity}%`, label: 'Humidity' },
    { icon: 'fa-wind', value: `${w.wind_speed} mph`, label: 'Wind' },
    { icon: 'fa-gauge-high', value: `${w.pressure || '--'} hPa`, label: 'Pressure', extra: pressureTrend },
    { icon: 'fa-eye', value: w.visibility ? `${(w.visibility / 1000).toFixed(1)} km` : '--', label: 'Visibility' },
  ];

  document.getElementById('weatherDetails').innerHTML = details.map(d =>
    `<div class="detail-card">
      <div class="detail-icon"><i class="fa-solid ${d.icon}"></i></div>
      <div class="detail-value">${d.value}</div>
      <div class="detail-label">${d.label}</div>
      ${d.extra ? d.extra : ''}
    </div>`
  ).join('');
}

// ===== Comfort Score + Clothing Advisor =====
function renderComfort(w) {
  const temp = w.temperature;
  const humidity = w.humidity;
  const wind = w.wind_speed;
  const visibility = w.visibility ? w.visibility / 1000 : 10; // km

  // Calculate comfort score (0-100)
  // Ideal: 68-77°F, 30-50% humidity, <10 mph wind, >10 km visibility
  let tempScore = 0;
  if (temp >= 68 && temp <= 77) tempScore = 100;
  else if (temp >= 60 && temp < 68) tempScore = 70 + (temp - 60) * 3.75;
  else if (temp > 77 && temp <= 85) tempScore = 100 - (temp - 77) * 3.75;
  else if (temp >= 50 && temp < 60) tempScore = 40 + (temp - 50) * 3;
  else if (temp > 85 && temp <= 95) tempScore = 70 - (temp - 85) * 4;
  else if (temp < 50) tempScore = Math.max(0, 40 - (50 - temp) * 2);
  else tempScore = Math.max(0, 30 - (temp - 95) * 3);

  let humidityScore = 0;
  if (humidity >= 30 && humidity <= 50) humidityScore = 100;
  else if (humidity < 30) humidityScore = 60 + humidity * 1.33;
  else if (humidity > 50 && humidity <= 70) humidityScore = 100 - (humidity - 50) * 2;
  else humidityScore = Math.max(0, 60 - (humidity - 70) * 2);

  let windScore = 0;
  if (wind <= 5) windScore = 100;
  else if (wind <= 15) windScore = 100 - (wind - 5) * 4;
  else if (wind <= 25) windScore = 60 - (wind - 15) * 3;
  else windScore = Math.max(0, 30 - (wind - 25) * 2);

  let visScore = visibility >= 10 ? 100 : visibility * 10;

  const score = Math.round(tempScore * 0.4 + humidityScore * 0.25 + windScore * 0.2 + visScore * 0.15);

  // Determine color + status
  let color, status;
  if (score >= 80) { color = '#48bb78'; status = 'Excellent'; }
  else if (score >= 60) { color = '#ecc94b'; status = 'Good'; }
  else if (score >= 40) { color = '#ed8936'; status = 'Fair'; }
  else if (score >= 20) { color = '#fc8181'; status = 'Poor'; }
  else { color = '#f56565'; status = 'Harsh'; }

  // Animate arc
  const circumference = 301.6; // 2 * PI * 48
  const offset = circumference - (score / 100) * circumference;
  const arc = document.getElementById('comfortArc');
  arc.style.stroke = color;
  // Use timeout for animation
  setTimeout(() => { arc.setAttribute('stroke-dashoffset', offset); }, 100);

  document.getElementById('comfortScoreText').textContent = score;
  document.getElementById('comfortStatus').textContent = status;
  document.getElementById('comfortStatus').style.color = color;

  // Clothing chips
  const chips = [];
  if (temp < 40) chips.push({ icon: 'fa-mitten', text: 'Heavy Coat' });
  else if (temp < 55) chips.push({ icon: 'fa-vest-patches', text: 'Jacket' });
  else if (temp < 68) chips.push({ icon: 'fa-shirt', text: 'Light Layer' });
  else chips.push({ icon: 'fa-shirt', text: 'T-Shirt' });

  if (humidity > 60 || (w.weather_id >= 300 && w.weather_id < 600)) chips.push({ icon: 'fa-umbrella', text: 'Umbrella' });
  if (w.weather_id === 800 && temp > 75) chips.push({ icon: 'fa-glasses', text: 'Sunglasses' });
  if (wind > 15) chips.push({ icon: 'fa-wind', text: 'Windbreaker' });
  if (temp > 85) chips.push({ icon: 'fa-bottle-water', text: 'Hydrate' });
  if (w.weather_id >= 600 && w.weather_id < 700) chips.push({ icon: 'fa-hat-wizard', text: 'Warm Hat' });
  if (visibility < 3) chips.push({ icon: 'fa-triangle-exclamation', text: 'Low Visibility' });

  document.getElementById('clothingChips').innerHTML = chips.map(c =>
    `<span class="clothing-chip"><i class="fa-solid ${c.icon}"></i> ${c.text}</span>`
  ).join('');
}

// ===== Live City Clock =====
function startCityClock(timezoneOffset) {
  if (clockInterval) clearInterval(clockInterval);

  function updateClock() {
    const now = new Date();
    // UTC time in ms + offset in seconds → local time
    const localMs = now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffset * 1000;
    const localDate = new Date(localMs);
    const timeStr = localDate.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const dateStr = localDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    });
    const el = document.getElementById('heroTime');
    if (el) el.innerHTML = `<i class="fa-regular fa-clock"></i> ${timeStr} &mdash; ${dateStr}`;
  }

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

// ===== Sunrise / Sunset Bar =====
function renderSunBar(w) {
  const bar = document.getElementById('sunBar');
  if (!w.sunrise || !w.sunset) { bar.style.display = 'none'; return; }

  bar.style.display = 'block';
  const timezoneOffset = w.timezone_offset || 0;

  // Convert sunrise/sunset to local time strings
  const sunriseLocal = new Date((w.sunrise + timezoneOffset) * 1000);
  const sunsetLocal = new Date((w.sunset + timezoneOffset) * 1000);

  document.getElementById('sunriseLabel').innerHTML =
    `<i class="fa-solid fa-sun"></i> ${sunriseLocal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}`;
  document.getElementById('sunsetLabel').innerHTML =
    `<i class="fa-solid fa-moon"></i> ${sunsetLocal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })}`;

  // Calculate sun position (0-100%)
  const now = new Date();
  const nowUtc = Math.floor(now.getTime() / 1000) + now.getTimezoneOffset() * 60;
  const nowLocal = nowUtc + timezoneOffset;

  const sunriseTs = w.sunrise + timezoneOffset;
  const sunsetTs = w.sunset + timezoneOffset;
  const dayLength = sunsetTs - sunriseTs;

  let percent = 0;
  if (nowLocal < sunriseTs) percent = 0;
  else if (nowLocal > sunsetTs) percent = 100;
  else percent = ((nowLocal - sunriseTs) / dayLength) * 100;

  const dot = document.getElementById('sunDot');
  dot.style.left = `${Math.min(100, Math.max(0, percent))}%`;
}

// ===== 5-Day Daily Forecast =====
function aggregateDailyForecast(entries) {
  const days = {};
  entries.forEach(e => {
    const date = new Date(e.dt * 1000);
    const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!days[key]) {
      days[key] = {
        key,
        weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
        temps: [],
        humidities: [],
        weatherIds: [],
        weatherIcons: [],
        weatherDescs: [],
        winds: []
      };
    }
    days[key].temps.push(e.temperature);
    days[key].humidities.push(e.humidity);
    days[key].weatherIds.push(e.weather_id);
    days[key].weatherIcons.push(e.weather_icon);
    days[key].weatherDescs.push(e.weather);
    days[key].winds.push(e.wind_speed);
  });

  return Object.values(days).slice(0, 5).map(d => {
    // Dominant weather: most frequent weather_id
    const idCounts = {};
    d.weatherIds.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
    const dominantId = Object.keys(idCounts).reduce((a, b) => idCounts[a] > idCounts[b] ? a : b);
    const dominantIdx = d.weatherIds.indexOf(Number(dominantId));

    return {
      date: d.key,
      weekday: d.weekday,
      high: Math.round(Math.max(...d.temps)),
      low: Math.round(Math.min(...d.temps)),
      humidity: Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length),
      wind: Math.round(d.winds.reduce((a, b) => a + b, 0) / d.winds.length),
      weather_id: Number(dominantId),
      weather_icon: d.weatherIcons[dominantIdx] || d.weatherIcons[0],
      weather: d.weatherDescs[dominantIdx] || d.weatherDescs[0]
    };
  });
}

function renderDailyForecast(fc) {
  const container = document.getElementById('forecastDaily');
  if (!fc || !fc.forecast) return;

  const dailyData = aggregateDailyForecast(fc.forecast);
  container.innerHTML = dailyData.map(d => {
    const icon = getSmallIcon(d.weather_id, d.weather_icon);
    return `<div class="daily-card">
      <div class="daily-day">${d.weekday}</div>
      <div class="daily-date">${d.date}</div>
      <div class="daily-icon">${icon}</div>
      <div class="daily-temps">
        <span class="daily-high">${d.high}&deg;</span>
        <span class="daily-low">${d.low}&deg;</span>
      </div>
      <div class="daily-desc">${d.weather}</div>
      <div class="daily-meta">
        <span><i class="fa-solid fa-droplet"></i> ${d.humidity}%</span>
        <span><i class="fa-solid fa-wind"></i> ${d.wind} mph</span>
      </div>
    </div>`;
  }).join('');
}

// ===== Render Forecast (cards) =====
function renderForecast(fc) {
  const cards = document.getElementById('forecastCards');
  cards.innerHTML = fc.forecast.slice(0, 12).map(entry => {
    const date = new Date(entry.dt * 1000);
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    const day = date.toLocaleDateString('en-US', { weekday: 'short' });
    const icon = getSmallIcon(entry.weather_id, entry.weather_icon);

    return `<div class="forecast-item">
      <div class="fc-time">${day} ${time}</div>
      <div class="fc-icon">${icon}</div>
      <div class="fc-temp">${Math.round(entry.temperature)}&deg;F</div>
      <div class="fc-desc">${entry.weather}</div>
    </div>`;
  }).join('');

  // Store for chart
  window.currentForecast = fc;

  // Update chart
  renderForecastChart(fc.forecast.slice(0, 12));
}

// ===== Forecast View Toggle =====
function setForecastView(view) {
  forecastView = view;
  document.getElementById('cardViewBtn').classList.toggle('active', view === 'cards');
  document.getElementById('chartViewBtn').classList.toggle('active', view === 'chart');
  document.getElementById('dailyViewBtn').classList.toggle('active', view === 'daily');
  document.getElementById('forecastCards').classList.toggle('hidden', view !== 'cards');
  document.getElementById('forecastChart').classList.toggle('hidden', view !== 'chart');
  document.getElementById('forecastDaily').classList.toggle('hidden', view !== 'daily');
}

// ===== Weather Ambient Particles =====
function renderParticles(weatherClass) {
  const canvas = document.getElementById('particleCanvas');
  canvas.innerHTML = '';

  let count = 0;
  let type = '';

  switch (weatherClass) {
    case 'rain':
      count = 25; type = 'rain'; break;
    case 'drizzle':
      count = 18; type = 'drizzle'; break;
    case 'snow':
      count = 20; type = 'snow'; break;
    case 'thunderstorm':
      count = 15; type = 'thunderstorm'; break;
    case 'clear':
      count = 8; type = 'clear'; break;
    case 'night-clear':
      count = 12; type = 'star'; break;
    case 'clouds': case 'night-clouds':
      count = 6; type = 'cloud'; break;
    case 'mist':
      count = 10; type = 'mist'; break;
    default:
      count = 5; type = 'cloud';
  }

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = `particle particle-${type}`;
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDelay = `${Math.random() * 5}s`;
    el.style.animationDuration = `${3 + Math.random() * 4}s`;

    if (type === 'snow' || type === 'star') {
      el.style.width = `${2 + Math.random() * 4}px`;
      el.style.height = el.style.width;
    }
    if (type === 'rain') {
      el.style.height = `${10 + Math.random() * 15}px`;
    }

    canvas.appendChild(el);
  }
}

// ===== Leaflet Map =====
function initMap() {
  leafletMap = L.map('weatherMap', { zoomControl: false }).setView([39.8, -98.5], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(leafletMap);
  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
}

function updateMap(lat, lon, cityName) {
  if (!leafletMap) initMap();
  leafletMap.setView([lat, lon], 10, { animate: true });
  if (leafletMarker) leafletMap.removeLayer(leafletMarker);
  leafletMarker = L.marker([lat, lon]).addTo(leafletMap).bindPopup(cityName).openPopup();
  setTimeout(() => leafletMap.invalidateSize(), 300);
}

// ===== Favorites =====
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('favorites') || '[]'); }
  catch { return []; }
}

function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}

function isFavorite(lat, lon) {
  return getFavorites().some(f => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01);
}

function toggleFavorite() {
  if (!currentWeather) return;
  const favs = getFavorites();
  const { city, country, lat, lon } = currentWeather;
  const idx = favs.findIndex(f => Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01);

  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ name: city, country, lat, lon });
  }

  saveFavorites(favs);
  renderFavorites();
  updateFavBtn();
}

function updateFavBtn() {
  if (!currentWeather) return;
  const btn = document.getElementById('favBtn');
  const fav = isFavorite(currentWeather.lat, currentWeather.lon);
  btn.classList.toggle('active', fav);
  btn.innerHTML = fav ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
}

function renderFavorites() {
  const bar = document.getElementById('favoritesBar');
  const favs = getFavorites();

  bar.innerHTML = favs.map(f =>
    `<div class="fav-chip" onclick="selectCity(${f.lat}, ${f.lon}, '${f.name.replace(/'/g, "\\'")}', '${f.country || ''}')">
      <span>${f.name}</span>
      <span class="fav-remove" onclick="event.stopPropagation(); removeFavorite(${f.lat}, ${f.lon})">&times;</span>
    </div>`
  ).join('');
}

function removeFavorite(lat, lon) {
  const favs = getFavorites().filter(f => !(Math.abs(f.lat - lat) < 0.01 && Math.abs(f.lon - lon) < 0.01));
  saveFavorites(favs);
  renderFavorites();
  updateFavBtn();
}

document.getElementById('favBtn').addEventListener('click', toggleFavorite);

// ===== Chat =====
function toggleChat() {
  const container = document.getElementById('chatContainer');
  const toggle = document.getElementById('chatToggle');
  if (container.style.display === 'flex') {
    container.style.display = 'none';
    toggle.style.display = 'flex';
  } else {
    container.style.display = 'flex';
    toggle.style.display = 'none';
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addChat(message, 'user');
  input.value = '';
  showTyping();

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        timezone: 'America/New_York',
        journey_context: currentJourneyData ? {
          from: currentJourneyData.waypoints[0]?.name,
          to: currentJourneyData.waypoints[currentJourneyData.waypoints.length - 1]?.name,
          distance_miles: currentJourneyData.total_distance_miles,
          duration_hours: currentJourneyData.total_duration_hours,
          waypoints: currentJourneyData.waypoints.map(w => ({
            name: w.name, severity: w.severity,
            temp: w.weather.temperature, desc: w.weather.description
          }))
        } : null
      })
    });
    const data = await response.json();
    hideTyping();
    if (response.ok) {
      addChat(data.response, 'ai');
    } else {
      const detail = data.detail || 'Sorry, I encountered an error.';
      addChat(detail, 'ai');
    }
  } catch (e) {
    hideTyping();
    addChat('Sorry, I\'m having trouble connecting.', 'ai');
  }
}

function addChat(text, sender) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${sender}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  const t = document.getElementById('typingIndicator');
  const msgs = document.getElementById('chatMessages');
  msgs.appendChild(t);
  t.style.display = 'block';
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
  document.getElementById('typingIndicator').style.display = 'none';
}

// ===== Journey Weather Corridor =====
let journeyMap = null;
let journeyLayers = [];
let journeyOriginData = null;
let journeyDestData = null;
let journeySearchTimeout = null;
let currentJourneyData = null;

function setupJourneySearch(inputId, dropdownId, setData) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);

  input.addEventListener('input', () => {
    clearTimeout(journeySearchTimeout);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.classList.remove('active'); return; }
    journeySearchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=5`);
        const results = await res.json();
        if (!results.length) { dropdown.classList.remove('active'); return; }
        dropdown.innerHTML = results.map(r => {
          const detail = [r.state, r.country].filter(Boolean).join(', ');
          return `<div class="search-result" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.name}">
            <div class="search-result-name">${r.name}</div>
            <div class="search-result-detail">${detail}</div>
          </div>`;
        }).join('');
        dropdown.classList.add('active');
        // Attach click handlers
        dropdown.querySelectorAll('.search-result').forEach(el => {
          el.addEventListener('click', () => {
            const data = { lat: parseFloat(el.dataset.lat), lon: parseFloat(el.dataset.lon), name: el.dataset.name };
            input.value = data.name;
            setData(data);
            dropdown.classList.remove('active');
          });
        });
      } catch (e) { console.error('Journey search error:', e); }
    }, 300);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('active'), 200);
  });
}

async function planJourney() {
  if (!journeyOriginData || !journeyDestData) {
    alert('Please select both an origin and destination city.');
    return;
  }
  const departure = document.getElementById('journeyDeparture').value;
  if (!departure) {
    alert('Please select a departure date and time.');
    return;
  }

  const btn = document.getElementById('journeyGoBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Planning...';
  document.getElementById('journeyResults').classList.add('hidden');
  document.getElementById('journeyLoading').classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/api/journey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_lat: journeyOriginData.lat,
        origin_lon: journeyOriginData.lon,
        origin_name: journeyOriginData.name,
        dest_lat: journeyDestData.lat,
        dest_lon: journeyDestData.lon,
        dest_name: journeyDestData.name,
        departure_time: departure
      })
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    currentJourneyData = data;
    renderJourneySummary(data);
    renderJourneyMap(data);
    renderJourneyTimeline(data);

    document.getElementById('journeyLoading').classList.add('hidden');
    document.getElementById('journeyResults').classList.remove('hidden');
  } catch (e) {
    console.error('Journey error:', e);
    alert('Failed to plan journey. Please try again.');
    document.getElementById('journeyLoading').classList.add('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-road"></i> Plan Route';
  }
}

function renderJourneySummary(data) {
  const el = document.getElementById('journeySummary');
  const hasStorm = data.waypoints.some(w => w.severity === 'storm');
  const hasRain = data.waypoints.some(w => w.severity === 'rain');
  const hasSnow = data.waypoints.some(w => w.severity === 'snow');

  let statusIcon, statusText, statusColor;
  if (hasStorm) { statusIcon = 'fa-triangle-exclamation'; statusText = 'Severe weather on route'; statusColor = '#ef4444'; }
  else if (hasSnow) { statusIcon = 'fa-snowflake'; statusText = 'Snow expected on route'; statusColor = '#f97316'; }
  else if (hasRain) { statusIcon = 'fa-cloud-rain'; statusText = 'Rain expected on route'; statusColor = '#f59e0b'; }
  else { statusIcon = 'fa-circle-check'; statusText = 'Clear conditions'; statusColor = '#22c55e'; }

  el.innerHTML = `<div class="journey-summary-row">
    <span class="journey-status" style="color:${statusColor}"><i class="fa-solid ${statusIcon}"></i> ${statusText}</span>
    <span class="journey-stat"><i class="fa-solid fa-road"></i> ${Math.round(data.total_distance_miles)} mi</span>
    <span class="journey-stat"><i class="fa-solid fa-clock"></i> ${data.total_duration_hours} hrs</span>
    <span class="journey-stat"><i class="fa-solid fa-location-dot"></i> ${data.waypoints.length} waypoints</span>
  </div>`;
}

function renderJourneyMap(data) {
  if (!journeyMap) {
    journeyMap = L.map('journeyMap', { zoomControl: false }).setView([39.8, -98.5], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(journeyMap);
    L.control.zoom({ position: 'bottomright' }).addTo(journeyMap);
  }

  // Clear previous layers
  journeyLayers.forEach(l => journeyMap.removeLayer(l));
  journeyLayers = [];

  // Draw full route as a faint background line
  if (data.route_coords && data.route_coords.length > 1) {
    const bgLine = L.polyline(data.route_coords, { color: 'rgba(255,255,255,0.15)', weight: 6 });
    bgLine.addTo(journeyMap);
    journeyLayers.push(bgLine);
  }

  // Draw colored segments
  data.segments.forEach(seg => {
    const line = L.polyline(seg.coords, {
      color: seg.color,
      weight: 5,
      opacity: 0.9
    });
    line.addTo(journeyMap);
    journeyLayers.push(line);
  });

  // Add waypoint markers
  data.waypoints.forEach((wp, i) => {
    const isEnd = i === 0 || i === data.waypoints.length - 1;
    const markerOpts = {
      radius: isEnd ? 8 : 5,
      fillColor: wp.color,
      color: '#fff',
      weight: 2,
      fillOpacity: 1
    };
    const marker = L.circleMarker([wp.lat, wp.lon], markerOpts);

    const time = new Date(wp.estimated_arrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    marker.bindPopup(`
      <strong>${wp.name}</strong><br>
      <em>${time}</em><br>
      ${Math.round(wp.weather.temperature)}&deg;F — ${wp.weather.description}<br>
      <small>${Math.round(wp.distance_from_origin_miles)} mi from start</small>
    `);

    marker.addTo(journeyMap);
    journeyLayers.push(marker);
  });

  // Fit bounds
  const allCoords = data.waypoints.map(w => [w.lat, w.lon]);
  journeyMap.fitBounds(allCoords, { padding: [40, 40] });
  setTimeout(() => journeyMap.invalidateSize(), 300);
}

function renderJourneyTimeline(data) {
  const container = document.getElementById('journeyTimeline');
  container.innerHTML = data.waypoints.map((wp, i) => {
    const icon = getSmallIcon(wp.weather.weather_id, wp.weather.weather_icon);
    const time = new Date(wp.estimated_arrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const date = new Date(wp.estimated_arrival).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    // Connector color uses the next segment's color
    const connColor = i < data.segments.length ? data.segments[i].color : 'transparent';

    return `<div class="journey-wp-card" style="border-top: 3px solid ${wp.color}; ${i < data.waypoints.length - 1 ? '--conn-color:' + connColor : ''}">
      <div class="journey-wp-name">${wp.name}</div>
      <div class="journey-wp-time">${time} &middot; ${date}</div>
      <div class="journey-wp-icon">${icon}</div>
      <div class="journey-wp-temp">${Math.round(wp.weather.temperature)}&deg;F</div>
      <div class="journey-wp-desc"><span class="journey-severity-dot" style="background:${wp.color}"></span>${wp.weather.description}</div>
      <div class="journey-wp-dist">${Math.round(wp.distance_from_origin_miles)} mi</div>
    </div>`;
  }).join('');
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderFavorites();

  // Journey search setup
  setupJourneySearch('journeyOrigin', 'journeyOriginDropdown', (d) => { journeyOriginData = d; });
  setupJourneySearch('journeyDest', 'journeyDestDropdown', (d) => { journeyDestData = d; });

  // Default departure time: now + 1 hour
  const now = new Date();
  now.setHours(now.getHours() + 1, 0, 0, 0);
  document.getElementById('journeyDeparture').value = now.toISOString().slice(0, 16);

  // Load default city (New York)
  loadWeather(40.7128, -74.0060, 'New York');
});
