
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <PHDisplay value={sensorData.ph} optimalMin={thresholds.phMin} optimalMax={thresholds.phMax} />
      <TemperatureDisplay value={sensorData.temperature} optimalMin={thresholds.temperatureMin} optimalMax={thresholds.temperatureMax} />
      <WaterLevelDisplay level={sensorData.waterLevel} />
      <TDSDisplay value={sensorData.tds} optimalMin={thresholds.tdsMin} optimalMax={thresholds.tdsMax} />
    </div>
  );
};

export default SensorGrid;
