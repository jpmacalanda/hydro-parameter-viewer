
import { useEffect, useState } from 'react';
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
  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, number>>({});

  useEffect(() => {
    // To prevent notification spam, only send a notification for a parameter
    // if we haven't sent one in the last 30 seconds
    const now = Date.now();
    const notificationThreshold = 30000; // 30 seconds
    
    // Helper function to check if we can send a notification
    const canSendNotification = (key: string) => {
      if (!lastNotificationTime[key] || (now - lastNotificationTime[key]) > notificationThreshold) {
        setLastNotificationTime(prev => ({ ...prev, [key]: now }));
        return true;
      }
      return false;
    };

    // Check pH
    if (sensorData.ph < thresholds.phMin && canSendNotification('low-ph')) {
      addNotification('warning', 'Low pH Level', `pH level is below threshold: ${sensorData.ph.toFixed(1)} (min: ${thresholds.phMin})`);
    } else if (sensorData.ph > thresholds.phMax && canSendNotification('high-ph')) {
      addNotification('warning', 'High pH Level', `pH level is above threshold: ${sensorData.ph.toFixed(1)} (max: ${thresholds.phMax})`);
    }

    // Check temperature
    if (sensorData.temperature < thresholds.temperatureMin && canSendNotification('low-temp')) {
      addNotification('warning', 'Low Temperature', `Temperature is below threshold: ${sensorData.temperature.toFixed(1)}°C (min: ${thresholds.temperatureMin}°C)`);
    } else if (sensorData.temperature > thresholds.temperatureMax && canSendNotification('high-temp')) {
      addNotification('warning', 'High Temperature', `Temperature is above threshold: ${sensorData.temperature.toFixed(1)}°C (max: ${thresholds.temperatureMax}°C)`);
    }

    // Check TDS
    if (sensorData.tds < thresholds.tdsMin && canSendNotification('low-tds')) {
      addNotification('warning', 'Low TDS Level', `TDS level is below threshold: ${sensorData.tds} ppm (min: ${thresholds.tdsMin} ppm)`);
    } else if (sensorData.tds > thresholds.tdsMax && canSendNotification('high-tds')) {
      addNotification('warning', 'High TDS Level', `TDS level is above threshold: ${sensorData.tds} ppm (max: ${thresholds.tdsMax} ppm)`);
    }

    // Check water level
    if (sensorData.waterLevel === "low" && canSendNotification('low-water')) {
      addNotification('warning', 'Low Water Level', 'Water level is low, please refill the reservoir');
    }
  }, [sensorData, thresholds, addNotification, lastNotificationTime]);

  return null; // This component doesn't render anything
};

export default ThresholdChecker;
