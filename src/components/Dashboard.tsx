import React, { useState, useEffect } from 'react';
import PHDisplay from './PHDisplay';
import TemperatureDisplay from './TemperatureDisplay';
import WaterLevelDisplay from './WaterLevelDisplay';
import TDSDisplay from './TDSDisplay';
import ConnectionControl from './ConnectionControl';
import serialService from '@/services/SerialService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Default initial values
const initialParams = {
  ph: 6.0,
  temperature: 23.0,
  waterLevel: 'medium' as 'low' | 'medium' | 'high',
  tds: 650
};

// Maximum number of data points to keep in history
const MAX_HISTORY_LENGTH = 20;

const Dashboard: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [params, setParams] = useState(initialParams);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showGraphs, setShowGraphs] = useState(true);
  
  // Historical data for graphs
  const [phHistory, setPhHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tempHistory, setTempHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tdsHistory, setTdsHistory] = useState<Array<{time: string; value: number}>>([]);
  
  useEffect(() => {
    // Set up the callback to receive data
    serialService.onData((data) => {
      setParams(data);
      const now = new Date();
      setLastUpdate(now);
      
      // Update historical data
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Update pH history
      setPhHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: data.ph }];
        return newHistory.slice(-MAX_HISTORY_LENGTH); // Keep only the latest entries
      });
      
      // Update temperature history
      setTempHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: data.temperature }];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
      
      // Update TDS history
      setTdsHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: data.tds }];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
    });
    
    // Clean up on unmount
    return () => {
      serialService.disconnect();
    };
  }, []);
  
  const handleConnect = () => {
    setConnected(true);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-hydro-dark">Hydroponics Monitoring System</h1>
        <p className="text-gray-600">Real-time parameter dashboard for your hydroponic system</p>
        
        <ConnectionControl 
          onConnect={handleConnect} 
          isConnected={connected} 
        />
      </header>
      
      <div className="flex items-center space-x-2 mb-4">
        <Switch 
          id="show-graphs" 
          checked={showGraphs} 
          onCheckedChange={setShowGraphs}
        />
        <Label htmlFor="show-graphs">Show Historical Graphs</Label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <PHDisplay value={params.ph} history={phHistory} showGraph={showGraphs} />
        <TemperatureDisplay value={params.temperature} history={tempHistory} showGraph={showGraphs} />
        <WaterLevelDisplay level={params.waterLevel} />
        <TDSDisplay value={params.tds} history={tdsHistory} showGraph={showGraphs} />
      </div>
      
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
          
          {/* Quick info about the parameters */}
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-1">• pH: Measures the acidity/alkalinity of your solution (optimal range: 5.5-6.5)</p>
            <p className="mb-1">• Temperature: Water temperature in Celsius (optimal range: 18-26°C)</p>
            <p className="mb-1">• Water Level: Current reservoir water level</p>
            <p className="mb-1">• TDS: Total Dissolved Solids - indicates nutrient concentration (optimal: 500-1000 PPM)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
