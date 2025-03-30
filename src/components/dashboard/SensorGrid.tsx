
import React from 'react';
import PHDisplay from '../PHDisplay';
import TemperatureDisplay from '../TemperatureDisplay';
import WaterLevelDisplay from '../WaterLevelDisplay';
import TDSDisplay from '../TDSDisplay';
import { SerialData } from '@/services/types/serial.types';

interface SensorGridProps {
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

const SensorGrid: React.FC<SensorGridProps> = ({ sensorData, thresholds }) => {
  // Check if data is valid (non-zero values indicate actual readings)
  const hasValidPh = sensorData.ph !== 0 && sensorData.ph !== undefined;
  const hasValidTemp = sensorData.temperature !== 0 && sensorData.temperature !== undefined;
  const hasValidTds = sensorData.tds !== 0 && sensorData.tds !== undefined;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <PHDisplay 
        value={hasValidPh ? sensorData.ph : null} 
        optimalMin={thresholds.phMin} 
        optimalMax={thresholds.phMax} 
      />
      <TemperatureDisplay 
        value={hasValidTemp ? sensorData.temperature : null} 
        optimalMin={thresholds.temperatureMin} 
        optimalMax={thresholds.temperatureMax} 
      />
      <WaterLevelDisplay 
        level={sensorData.waterLevel || null} 
      />
      <TDSDisplay 
        value={hasValidTds ? sensorData.tds : null} 
        optimalMin={thresholds.tdsMin} 
        optimalMax={thresholds.tdsMax} 
      />
    </div>
  );
};

export default SensorGrid;
