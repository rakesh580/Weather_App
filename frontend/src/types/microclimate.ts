export interface MicroclimateCorrectionDetail {
  correction_f: number;
  details: string;
}

export interface MicroclimateData {
  station_temp: number;
  estimated_temp: number;
  total_correction: number;
  corrections: {
    elevation: MicroclimateCorrectionDetail;
    urban_heat: MicroclimateCorrectionDetail;
    water_proximity: MicroclimateCorrectionDetail;
    terrain_aspect: MicroclimateCorrectionDetail;
  };
  confidence: string;
  explanation: string;
  station_elevation_ft: number;
  location_elevation_ft: number;
}
