import React, { useState, useEffect } from 'react';
import PHDisplay from './PHDisplay';
import TemperatureDisplay from './TemperatureDisplay';
import WaterLevelDisplay from './WaterLevelDisplay';
import TDSDisplay from './TDSDisplay';
import ThresholdSettings from './ThresholdSettings';
import ConnectionControl from './ConnectionControl';
import serialService from '@/services/SerialService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Default initial values
const initialParams = {
  ph: 6.0,
  temperature: 23.0,
  waterLevel: 'medium' as 'low' | 'medium' | 'high',
  tds: 650
};

// Default threshold values
const initialThresholds = {
  phMin: 5.5,
  phMax: 6.5,
  temperatureMin: 18,
  temperatureMax: 26,
  tdsMin: 500,
  tdsMax: 1000
};

// Maximum number of data points to keep in history
const MAX_HISTORY_LENGTH = 20;

const Dashboard: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [params, setParams] = useState(initialParams);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showGraphs, setShowGraphs] = useState(true);
  const [activeTab, setActiveTab] = useState("monitor");
  const [thresholds, setThresholds] = useState(initialThresholds);
  
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
  
  const handleSaveThresholds = (newThresholds: typeof thresholds) => {
    setThresholds(newThresholds);
    
    // In a real application, you might want to save these to localStorage or a backend
    try {
      localStorage.setItem('hydroponics-thresholds', JSON.stringify(newThresholds));
    } catch (error) {
      console.error('Failed to save thresholds to localStorage', error);
    }
  };
  
  // Load thresholds from localStorage on component mount
  useEffect(() => {
    try {
      const savedThresholds = localStorage.getItem('hydroponics-thresholds');
      if (savedThresholds) {
        setThresholds(JSON.parse(savedThresholds));
      }
    } catch (error) {
      console.error('Failed to load thresholds from localStorage', error);
    }
  }, []);
  
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="monitor">Monitoring</TabsTrigger>
          <TabsTrigger value="settings">Threshold Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitor" className="space-y-4">
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
        </TabsContent>
        
        <TabsContent value="settings">
          <ThresholdSettings 
            phMin={thresholds.phMin}
            phMax={thresholds.phMax}
            temperatureMin={thresholds.temperatureMin}
            temperatureMax={thresholds.temperatureMax}
            tdsMin={thresholds.tdsMin}
            tdsMax={thresholds.tdsMax}
            onSave={handleSaveThresholds}
          />
        </TabsContent>
      </Tabs>
      
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
            <p className="mb-1">• pH: Measures the acidity/alkalinity of your solution (optimal range: {thresholds.phMin}-{thresholds.phMax})</p>
            <p className="mb-1">• Temperature: Water temperature in Celsius (optimal range: {thresholds.temperatureMin}-{thresholds.temperatureMax}°C)</p>
            <p className="mb-1">• Water Level: Current reservoir water level</p>
            <p className="mb-1">• TDS: Total Dissolved Solids - indicates nutrient concentration (optimal: {thresholds.tdsMin}-{thresholds.tdsMax} PPM)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
