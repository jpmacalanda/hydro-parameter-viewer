
import { useEffect } from 'react';
import { SerialData } from '@/services/types/serial.types';
import { useNotifications } from '@/context/NotificationsContext';

interface ThresholdCheckerProps {
  sensorData: SerialData;
  thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  };
}

const ThresholdChecker: React.FC<ThresholdCheckerProps> = ({ sensorData, thresholds }) => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (sensorData.ph < thresholds.phMin) {
      addNotification('warning', 'Low pH Level', `pH level is below threshold: ${sensorData.ph} (min: ${thresholds.phMin})`);
    } else if (sensorData.ph > thresholds.phMax) {
      addNotification('warning', 'High pH Level', `pH level is above threshold: ${sensorData.ph} (max: ${thresholds.phMax})`);
    }

    if (sensorData.temperature < thresholds.temperatureMin) {
      addNotification('warning', 'Low Temperature', `Temperature is below threshold: ${sensorData.temperature}°C (min: ${thresholds.temperatureMin}°C)`);
    } else if (sensorData.temperature > thresholds.temperatureMax) {
      addNotification('warning', 'High Temperature', `Temperature is above threshold: ${sensorData.temperature}°C (max: ${thresholds.temperatureMax}°C)`);
    }

    if (sensorData.tds < thresholds.tdsMin) {
      addNotification('warning', 'Low TDS Level', `TDS level is below threshold: ${sensorData.tds} ppm (min: ${thresholds.tdsMin} ppm)`);
    } else if (sensorData.tds > thresholds.tdsMax) {
      addNotification('warning', 'High TDS Level', `TDS level is above threshold: ${sensorData.tds} ppm (max: ${thresholds.tdsMax} ppm)`);
    }

    if (sensorData.waterLevel === "low") {
      addNotification('warning', 'Low Water Level', 'Water level is low, please refill the reservoir');
    }
  }, [sensorData, thresholds, addNotification]);

  return null; // This component doesn't render anything
};

export default ThresholdChecker;
