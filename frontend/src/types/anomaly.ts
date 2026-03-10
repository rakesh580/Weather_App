export interface AnomalyData {
  location: string;
  date: string;
  current: { temp: number; temp_high: number; temp_low: number };
  historical_avg: { temp_high: number; temp_low: number };
  historical_std: { temp_high: number; temp_low: number };
  anomaly: {
    z_score: number;
    classification: string;
    percentile: number | null;
    degrees_diff: number;
    direction: 'warmer' | 'cooler';
  };
  historical_range: {
    record_high: number;
    record_low: number | null;
  };
  trend: {
    decade_avgs: Record<string, number>;
    warming_rate_per_decade: number | null;
  };
  sample_years: number;
}
