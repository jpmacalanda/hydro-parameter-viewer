
import React from 'react';
import PHDisplay from '../PHDisplay';
import TemperatureDisplay from '../TemperatureDisplay';
import WaterLevelDisplay from '../WaterLevelDisplay';
import TDSDisplay from '../TDSDisplay';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MonitoringPanelProps {
  params: {
    ph: number;
    temperature: number;
    waterLevel: 'low' | 'medium' | 'high';
    tds: number;
  };
  phHistory: Array<{time: string; value: number}>;
  tempHistory: Array<{time: string; value: number}>;
  tdsHistory: Array<{time: string; value: number}>;
  showGraphs: boolean;
  setShowGraphs: React.Dispatch<React.SetStateAction<boolean>>;
  thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  };
}

const MonitoringPanel: React.FC<MonitoringPanelProps> = ({
  params,
  phHistory,
  tempHistory,
  tdsHistory,
  showGraphs,
  setShowGraphs,
  thresholds
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Switch 
          id="show-graphs" 
          checked={showGraphs} 
          onCheckedChange={setShowGraphs}
        />
        <Label htmlFor="show-graphs">Show Historical Graphs</Label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <PHDisplay 
          value={params.ph} 
          history={phHistory} 
          showGraph={showGraphs} 
          optimalMin={thresholds.phMin}
          optimalMax={thresholds.phMax}
        />
        <TemperatureDisplay 
          value={params.temperature} 
          history={tempHistory} 
          showGraph={showGraphs} 
          optimalMin={thresholds.temperatureMin}
          optimalMax={thresholds.temperatureMax}
        />
        <WaterLevelDisplay level={params.waterLevel} />
        <TDSDisplay 
          value={params.tds} 
          history={tdsHistory} 
          showGraph={showGraphs} 
          optimalMin={thresholds.tdsMin}
          optimalMax={thresholds.tdsMax}
        />
      </div>
    </div>
  );
};

export default MonitoringPanel;
