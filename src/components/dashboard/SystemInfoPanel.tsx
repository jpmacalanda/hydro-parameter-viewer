
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Flask, Ruler } from "lucide-react";

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
  calibration?: {
    phOffset: number;
    tdsCalibrationFactor: number;
  };
  dataResolution?: number;
}

const SystemInfoPanel: React.FC<SystemInfoPanelProps> = ({ 
  connected, 
  lastUpdate,
  thresholds,
  calibration = { phOffset: 0, tdsCalibrationFactor: 1.0 },
  dataResolution = 60000
}) => {
  const formatResolution = () => {
    if (dataResolution < 1000) return `${dataResolution}ms`;
    if (dataResolution === 1000) return "1 second";
    if (dataResolution === 30000) return "30 seconds";
    if (dataResolution === 60000) return "1 minute";
    return `${dataResolution / 1000} seconds`;
  };
  
  const isCalibrated = calibration.phOffset !== 0 || calibration.tdsCalibrationFactor !== 1.0;
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Information</span>
          {isCalibrated && (
            <Badge className="ml-2" variant="outline">Calibration Active</Badge>
          )}
        </CardTitle>
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
              {lastUpdate ? lastUpdate.toLocaleTimeString() : '-'}
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
        
        <div className="mt-4 border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Data Resolution */}
            <div className="p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-blue-600" />
                <h3 className="font-medium text-sm">Data Recording</h3>
              </div>
              <p className="text-sm mt-1">Every {formatResolution()}</p>
            </div>
            
            {/* pH Calibration */}
            <div className="p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <Ruler size={16} className="text-purple-600" />
                <h3 className="font-medium text-sm">pH Calibration</h3>
              </div>
              <p className="text-sm mt-1">
                Offset: {calibration.phOffset > 0 ? '+' : ''}{calibration.phOffset.toFixed(2)}
              </p>
            </div>
            
            {/* TDS Calibration */}
            <div className="p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <Flask size={16} className="text-green-600" />
                <h3 className="font-medium text-sm">TDS Calibration</h3>
              </div>
              <p className="text-sm mt-1">
                Factor: {calibration.tdsCalibrationFactor.toFixed(2)}x
              </p>
            </div>
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
