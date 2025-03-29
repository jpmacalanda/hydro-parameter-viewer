
// Utility service for handling localStorage operations
export const LocalStorageService = {
  saveThresholds: (thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  }): boolean => {
    try {
      localStorage.setItem('hydroponics-thresholds', JSON.stringify(thresholds));
      return true;
    } catch (error) {
      console.error('Failed to save thresholds to localStorage', error);
      return false;
    }
  },
  
  saveCalibration: (calibration: {
    phCalibrationConstant: number;
    tdsCalibrationFactor: number;
  }): boolean => {
    try {
      localStorage.setItem('hydroponics-calibration', JSON.stringify(calibration));
      return true;
    } catch (error) {
      console.error('Failed to save calibration to localStorage', error);
      return false;
    }
  },
  
  loadThresholds: () => {
    try {
      const savedThresholds = localStorage.getItem('hydroponics-thresholds');
      if (savedThresholds) {
        return JSON.parse(savedThresholds);
      }
      return null;
    } catch (error) {
      console.error('Failed to load thresholds from localStorage', error);
      return null;
    }
  },
  
  loadCalibration: () => {
    try {
      const savedCalibration = localStorage.getItem('hydroponics-calibration');
      if (savedCalibration) {
        return JSON.parse(savedCalibration);
      }
      return null;
    } catch (error) {
      console.error('Failed to load calibration from localStorage', error);
      return null;
    }
  }
};

export default LocalStorageService;
