
export interface HydroParams {
  ph: number;
  temperature: number;
  waterLevel: 'low' | 'medium' | 'high';
  tds: number;
}

export interface Thresholds {
  phMin: number;
  phMax: number;
  temperatureMin: number;
  temperatureMax: number;
  tdsMin: number;
  tdsMax: number;
}

export interface Calibration {
  phCalibrationConstant: number;
  tdsCalibrationFactor: number;
}
