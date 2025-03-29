
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SystemInfoPanelProps {
  connected: boolean;
  lastUpdate: Date | null;
  thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  };
}

const SystemInfoPanel: React.FC<SystemInfoPanelProps> = ({ 
  connected, 
  lastUpdate,
  thresholds
}) => {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>System Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-sm text-gray-500">Connection Status</h3>
            <p className="text-lg">{connected ? 'Connected' : 'Disconnected'}</p>
          </div>
          <div>
            <h3 className="font-medium text-sm text-gray-500">Last Update</h3>
            <p className="text-lg">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'No data received'}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-sm text-gray-500">Platform</h3>
            <p className="text-lg">Raspberry Pi</p>
          </div>
          <div>
            <h3 className="font-medium text-sm text-gray-500">Data Source</h3>
            <p className="text-lg">Arduino via Serial</p>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-1">• pH: Measures the acidity/alkalinity of your solution (optimal range: {thresholds.phMin}-{thresholds.phMax})</p>
          <p className="mb-1">• Temperature: Water temperature in Celsius (optimal range: {thresholds.temperatureMin}-{thresholds.temperatureMax}°C)</p>
          <p className="mb-1">• Water Level: Current reservoir water level</p>
          <p className="mb-1">• TDS: Total Dissolved Solids - indicates nutrient concentration (optimal: {thresholds.tdsMin}-{thresholds.tdsMax} PPM)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemInfoPanel;
