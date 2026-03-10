export interface SymptomEntry {
  symptom: string;
  severity: number;  // 0-3
}

export interface HealthLogEntry {
  id: string;
  timestamp: string;  // ISO
  symptoms: SymptomEntry[];
  weather: {
    temp: number;
    humidity: number;
    pressure: number | null;
    aqi: number | null;
    clouds: number;
    wind_speed: number;
    description: string;
  };
}

export interface CorrelationResult {
  symptom: string;
  variable: string;
  correlation: number;  // -1 to 1
  p_value: number;
  significant: boolean;
}

export interface TriggerAlert {
  symptom: string;
  trigger: string;
  risk_level: 'low' | 'medium' | 'high';
  message: string;
}

export interface PressureTrend {
  hours: number[];
  pressures: number[];
  delta_3h: number;
  delta_6h: number;
  delta_12h: number;
  rapid_change: boolean;
}

export const SYMPTOM_TYPES = [
  { id: 'migraine', name: 'Migraine', icon: 'fa-head-side-virus' },
  { id: 'joint_pain', name: 'Joint Pain', icon: 'fa-bone' },
  { id: 'fatigue', name: 'Fatigue', icon: 'fa-battery-quarter' },
  { id: 'mood', name: 'Low Mood', icon: 'fa-cloud-rain' },
  { id: 'allergies', name: 'Allergies', icon: 'fa-flower-tulip' },
  { id: 'breathing', name: 'Breathing', icon: 'fa-lungs' },
  { id: 'sinus', name: 'Sinus', icon: 'fa-face-tired' },
  { id: 'sleep', name: 'Sleep Issues', icon: 'fa-moon' },
] as const;

export const SEVERITY_LABELS = ['None', 'Mild', 'Moderate', 'Severe'] as const;
