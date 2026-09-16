#!/usr/bin/env node
/**
 * Renders every SkyPulse view with mocked API data and saves PNGs to ./screenshots.
 * Usage:  BASE=http://127.0.0.1:9000 node scripts/screenshot.mjs
 * Needs Playwright:  npx -y playwright@latest install chromium  (and `npm i -D playwright` or a global install)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:9000';
const OUT = process.env.OUT || 'screenshots';
mkdirSync(OUT, { recursive: true });

const now = Math.floor(Date.now() / 1000);
const h0 = Math.floor(now / 3600) * 3600;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const mocks = {
  '/api/health': { status: 'ok', version: '2.0.0', providers: { openweathermap: true, openrouteservice: false, ai: 'groq' }, cache: {} },
  '/api/weather/coords': { city: 'Seattle', country: 'US', lat: 47.6062, lon: -122.3321, temperature: 64.2, feels_like: 63.1, temp_min: 58, temp_max: 68, humidity: 71, pressure: 1014, visibility: 10000, weather: 'light rain', weather_id: 500, weather_icon: '10d', wind_speed: 9.4, wind_deg: 210, wind_gust: 18, clouds: 75, dt: now - 300, timezone_offset: -25200, sunrise: now - 20000, sunset: now + 20000 },
  '/api/forecast/coords': { city: 'Seattle', country: 'US', timezone_offset: -25200, forecast: Array.from({ length: 40 }, (_, i) => ({ dt: now + i * 10800, time: '', temperature: 55 + 10 * Math.sin(i / 4), feels_like: 54, humidity: 60 + (i % 20), pressure: 1010 + (i % 8), weather: i % 5 === 0 ? 'light rain' : 'few clouds', weather_id: i % 5 === 0 ? 500 : 801, weather_icon: i % 5 === 0 ? '10d' : '02d', wind_speed: 5 + (i % 10), pop: i % 5 === 0 ? 0.6 : 0.1 })) },
  '/api/hourly': { timezone: 'America/Los_Angeles', utc_offset_seconds: -25200, daily: [{ date: h0, sunrise: h0, sunset: h0 + 50000, uv_max: 5, high: 68, low: 54, pop_max: 0.6 }], hourly: Array.from({ length: 48 }, (_, i) => ({ dt: h0 + i * 3600, temperature: 56 + 8 * Math.sin((i - 3) / 5), feels_like: 55, pop: i > 4 && i < 9 ? 0.7 : i % 11 === 0 ? 0.3 : 0.05, precip_in: 0, weather_code: i > 4 && i < 9 ? 61 : i % 3 === 0 ? 2 : 1, wind_speed: 6 + (i % 7), wind_gust: 12, humidity: 65, uvi: i > 8 && i < 18 ? 4 : 0, is_day: !((i + 22) % 24 < 6 || (i + 22) % 24 > 20), clouds: 40 })) },
  '/api/alerts': { coverage: 'us', alerts: [{ id: 'a1', event: 'Wind Advisory', headline: 'Wind Advisory in effect until 10 PM PDT', severity: 'Moderate', urgency: 'Expected', certainty: 'Likely', onset: new Date().toISOString(), ends: new Date(Date.now() + 8 * 3600e3).toISOString(), sender: 'NWS Seattle WA', description: 'South winds 25 to 35 mph with gusts up to 50 mph expected.', instruction: 'Secure loose objects. Use extra caution when driving.', areas: 'Seattle and Vicinity' }] },
  '/api/airquality': { aqi: 2, aqi_label: 'Fair', components: {} },
  '/api/uv': { uvi: 4.2, source: 'open-meteo' },
  '/api/anomaly': { location: 'Seattle', date: '2026-09-16', current: { temp: 64, temp_high: 66, temp_low: 58 }, historical_avg: { temp_high: 71, temp_low: 55 }, historical_std: { temp_high: 5, temp_low: 4 }, anomaly: { z_score: -1.0, classification: 'Unusual', percentile: 18, degrees_diff: -5, direction: 'cooler' }, historical_range: { record_high: 92, record_low: 44 }, trend: { decade_avgs: { '1990s': 69, '2000s': 70, '2010s': 72 }, warming_rate_per_decade: 1.5 }, sample_years: 30 },
  '/api/microclimate': { station_temp: 64, estimated_temp: 62.5, total_correction: -1.5, corrections: { elevation: { correction_f: -1, details: '300ft above station' }, urban_heat: { correction_f: 1, details: '40% built-up' }, water_proximity: { correction_f: -1.5, details: 'Water within 1km' }, terrain_aspect: { correction_f: 0, details: 'Slope' } }, confidence: 'high', explanation: 'Close to station.', station_elevation_ft: 100, location_elevation_ft: 400 },
  '/api/briefing': { briefing: 'Expect a cool, showery afternoon in Seattle with highs near 68°F and a 70% chance of rain between 3 and 7 PM. Bring a rain shell and watch for gusts to 50 mph this evening under the Wind Advisory.', city: 'Seattle', generated_at: new Date().toISOString() },
  '/api/activity/types': [{ id: 'running', name: 'Running', icon: 'fa-person-running', description: '' }, { id: 'cycling', name: 'Cycling', icon: 'fa-bicycle', description: '' }],
};

const browser = await chromium.launch();
async function shoot(name, { width, height, theme }) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.addInitScript(t => localStorage.setItem('theme', t), theme);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    const hit = Object.keys(mocks).find(k => url.pathname.startsWith(k));
    if (hit) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mocks[hit]) });
    if (url.pathname.startsWith('/api/map-tile') || url.hostname.includes('cartocdn')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    return route.continue();
  });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-welcome.png`, fullPage: true });
  await page.goto(`${BASE}/?lat=47.6062&lon=-122.3321&name=Seattle`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/${name}-weather.png`, fullPage: true });
  for (const tab of ['Journey', 'Activity', 'Health', 'Logistics']) {
    await page.getByRole('tab', { name: new RegExp(tab) }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}-${tab.toLowerCase()}.png`, fullPage: true });
  }
  await ctx.close();
  console.log('✓', name);
}
await shoot('desktop-light', { width: 1280, height: 900, theme: 'light' });
await shoot('desktop-dark', { width: 1280, height: 900, theme: 'dark' });
await shoot('mobile-light', { width: 390, height: 844, theme: 'light' });
await browser.close();
