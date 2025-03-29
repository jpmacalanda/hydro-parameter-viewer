import React, { useState, useEffect } from 'react';
import PHDisplay from './PHDisplay';
import TemperatureDisplay from './TemperatureDisplay';
import WaterLevelDisplay from './WaterLevelDisplay';
import TDSDisplay from './TDSDisplay';
import ThresholdSettings from './ThresholdSettings';
import CalibrationSettings from './CalibrationSettings';
import StatisticsView from './StatisticsView';
import ConnectionControl from './ConnectionControl';
import serialService from '@/services/SerialService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Activity, Gauge, Settings } from "lucide-react";

const initialParams = {
  ph: 6.0,
  temperature: 23.0,
  waterLevel: 'medium' as 'low' | 'medium' | 'high',
  tds: 650
};

const initialThresholds = {
  phMin: 5.5,
  phMax: 6.5,
  temperatureMin: 18,
  temperatureMax: 26,
  tdsMin: 500,
  tdsMax: 1000
};

const initialCalibration = {
  phCalibrationConstant: 1.0,
  tdsCalibrationFactor: 1.0
};

const MAX_HISTORY_LENGTH = 20;

const Dashboard: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [params, setParams] = useState(initialParams);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showGraphs, setShowGraphs] = useState(true);
  const [activeTab, setActiveTab] = useState("monitor");
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [calibration, setCalibration] = useState(initialCalibration);
  
  const [phHistory, setPhHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tempHistory, setTempHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tdsHistory, setTdsHistory] = useState<Array<{time: string; value: number}>>([]);
  
  useEffect(() => {
    serialService.onData((data) => {
      const calibratedData = {
        ...data,
        ph: parseFloat((data.ph * calibration.phCalibrationConstant).toFixed(1)),
        tds: Math.round(data.tds * calibration.tdsCalibrationFactor)
      };
      
      setParams(calibratedData);
      const now = new Date();
      setLastUpdate(now);
      
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setPhHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: calibratedData.ph }];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
      
      setTempHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: calibratedData.temperature }];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
      
      setTdsHistory(prev => {
        const newHistory = [...prev, { time: timeStr, value: calibratedData.tds }];
        return newHistory.slice(-MAX_HISTORY_LENGTH);
      });
    });
    
    return () => {
      serialService.disconnect();
    };
  }, [calibration]);
  
  const handleConnect = () => {
    setConnected(true);
  };
  
  const handleSaveThresholds = (newThresholds: typeof thresholds) => {
    setThresholds(newThresholds);
    
    try {
      localStorage.setItem('hydroponics-thresholds', JSON.stringify(newThresholds));
      toast.success("Threshold settings saved successfully");
    } catch (error) {
      console.error('Failed to save thresholds to localStorage', error);
      toast.error("Failed to save threshold settings");
    }
  };
  
  const handleSaveCalibration = (newCalibration: typeof calibration) => {
    setCalibration(newCalibration);
    
    try {
      localStorage.setItem('hydroponics-calibration', JSON.stringify(newCalibration));
    } catch (error) {
      console.error('Failed to save calibration to localStorage', error);
    }
  };
  
  useEffect(() => {
    try {
      const savedThresholds = localStorage.getItem('hydroponics-thresholds');
      if (savedThresholds) {
        setThresholds(JSON.parse(savedThresholds));
      }
      
      const savedCalibration = localStorage.getItem('hydroponics-calibration');
      if (savedCalibration) {
        setCalibration(JSON.parse(savedCalibration));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
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
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Gauge size={16} />
            <span>Monitoring</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            <span>Thresholds</span>
          </TabsTrigger>
          <TabsTrigger value="calibration" className="flex items-center gap-2">
            <Gauge size={16} />
            <span>Calibration</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Activity size={16} />
            <span>Statistics</span>
          </TabsTrigger>
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
        
        <TabsContent value="calibration">
          <CalibrationSettings 
            initialValues={calibration}
            onSaveCalibration={handleSaveCalibration}
          />
        </TabsContent>
        
        <TabsContent value="statistics">
          <StatisticsView />
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
