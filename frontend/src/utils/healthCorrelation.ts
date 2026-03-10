import type { HealthLogEntry, CorrelationResult, TriggerAlert } from '../types/health';

const STORAGE_KEY = 'skypulse-health-log';

// Simple obfuscation for health data in localStorage (#7)
// Uses base64 encoding to prevent casual plaintext exposure
// For true encryption, a server-side solution with auth would be needed
function encode(data: string): string {
  try { return btoa(unescape(encodeURIComponent(data))); } catch { return data; }
}

function decode(data: string): string {
  try { return decodeURIComponent(escape(atob(data))); } catch { return data; }
}

export function getHealthLog(): HealthLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // Try decoding (encoded format) first, fall back to raw JSON (legacy)
    try {
      return JSON.parse(decode(raw));
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return [];
  }
}

export function saveHealthLog(entries: HealthLogEntry[]): void {
  localStorage.setItem(STORAGE_KEY, encode(JSON.stringify(entries)));
}

export function addHealthEntry(entry: HealthLogEntry): HealthLogEntry[] {
  const log = getHealthLog();
  log.push(entry);
  // Keep max 365 entries
  const trimmed = log.slice(-365);
  saveHealthLog(trimmed);
  return trimmed;
}

export function deleteHealthEntry(id: string): HealthLogEntry[] {
  const log = getHealthLog().filter(e => e.id !== id);
  saveHealthLog(log);
  return log;
}

/**
 * Compute Pearson correlation between two arrays.
 */
function pearson(x: number[], y: number[]): { r: number; p: number } {
  const n = x.length;
  if (n < 5) return { r: 0, p: 1 };

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  if (sumX2 === 0 || sumY2 === 0) return { r: 0, p: 1 };

  const r = sumXY / Math.sqrt(sumX2 * sumY2);

  // Approximate p-value using t-distribution (2-tailed)
  const t = r * Math.sqrt((n - 2) / (1 - r * r + 1e-10));
  // Rough p-value approximation
  const absT = Math.abs(t);
  let p = 1;
  if (absT > 3.5) p = 0.001;
  else if (absT > 2.5) p = 0.01;
  else if (absT > 2.0) p = 0.05;
  else if (absT > 1.5) p = 0.15;
  else p = 0.5;

  return { r: Math.round(r * 1000) / 1000, p };
}

const WEATHER_VARS = ['temp', 'humidity', 'pressure', 'clouds', 'wind_speed'] as const;

/**
 * Compute correlations between each symptom and each weather variable.
 */
export function computeCorrelations(log: HealthLogEntry[]): CorrelationResult[] {
  if (log.length < 7) return [];

  const symptoms = new Set<string>();
  log.forEach(e => e.symptoms.forEach(s => { if (s.severity > 0) symptoms.add(s.symptom); }));

  const results: CorrelationResult[] = [];

  symptoms.forEach(symptom => {
    const symptomValues: number[] = [];
    const weatherValues: Record<string, number[]> = {};
    WEATHER_VARS.forEach(v => { weatherValues[v] = []; });

    log.forEach(entry => {
      const sym = entry.symptoms.find(s => s.symptom === symptom);
      const severity = sym ? sym.severity : 0;
      symptomValues.push(severity);

      WEATHER_VARS.forEach(v => {
        const val = entry.weather[v as keyof typeof entry.weather];
        weatherValues[v].push(typeof val === 'number' ? val : 0);
      });
    });

    WEATHER_VARS.forEach(variable => {
      const { r, p } = pearson(symptomValues, weatherValues[variable]);
      results.push({
        symptom,
        variable,
        correlation: r,
        p_value: p,
        significant: p < 0.05,
      });
    });
  });

  return results;
}

/**
 * Detect trigger alerts based on historical patterns and current/forecast conditions.
 */
export function detectTriggers(
  correlations: CorrelationResult[],
  pressureDelta6h: number,
): TriggerAlert[] {
  const alerts: TriggerAlert[] = [];

  const pressureCorrelations = correlations.filter(
    c => c.variable === 'pressure' && c.significant && c.correlation < -0.3
  );

  pressureCorrelations.forEach(c => {
    if (Math.abs(pressureDelta6h) > 5) {
      const risk = Math.abs(pressureDelta6h) > 10 ? 'high' : 'medium';
      alerts.push({
        symptom: c.symptom,
        trigger: 'pressure_drop',
        risk_level: risk,
        message: `${c.symptom} risk elevated — pressure ${pressureDelta6h > 0 ? 'rising' : 'dropping'} ${Math.abs(Math.round(pressureDelta6h))} hPa over 6h`,
      });
    }
  });

  return alerts;
}
