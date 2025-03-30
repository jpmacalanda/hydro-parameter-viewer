
import React, { useState, useEffect } from 'react';
import PHDisplay from './PHDisplay';
import TemperatureDisplay from './TemperatureDisplay';
import WaterLevelDisplay from './WaterLevelDisplay';
import TDSDisplay from './TDSDisplay';
import MonitoringPanel from './dashboard/MonitoringPanel';
import SystemInfoPanel from './dashboard/SystemInfoPanel';
import ThresholdSettings from './ThresholdSettings';
import StatisticsView from './StatisticsView';
import SerialMonitor from './SerialMonitor';
import ConnectionControl from './ConnectionControl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SerialData } from '@/services/types/serial.types';
import serialService from '@/services/SerialService';
import SystemLogs from './SystemLogs';

const Dashboard: React.FC = () => {
  const [sensorData, setSensorData] = useState<SerialData>({
    ph: 7.0,
    temperature: 25.0,
    waterLevel: "medium",
    tds: 650,
  });
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [thresholds, setThresholds] = useState({
    phMin: 6.0,
    phMax: 7.0,
    temperatureMin: 20,
    temperatureMax: 30,
    tdsMin: 600,
    tdsMax: 700,
  });
  const [showGraphs, setShowGraphs] = useState(false);
  
  // Generate sample data for historical graphs
  const [phHistory, setPhHistory] = useState(Array.from({length: 24}, (_, i) => ({
    time: `${i}:00`,
    value: 6.5 + Math.random() * 1.0
  })));
  
  const [tempHistory, setTempHistory] = useState(Array.from({length: 24}, (_, i) => ({
    time: `${i}:00`,
    value: 22 + Math.random() * 6.0
  })));
  
  const [tdsHistory, setTdsHistory] = useState(Array.from({length: 24}, (_, i) => ({
    time: `${i}:00`,
    value: 600 + Math.random() * 150
  })));

  useEffect(() => {
    // Subscribe to data updates from the SerialService
    serialService.onData((data) => {
      setSensorData(data);
      setLastUpdate(new Date());
    });

    // Subscribe to connection status changes
    serialService.onError((error) => {
      setConnected(false);
    });

    // Initial connection status
    setConnected(!serialService.isMockData);

    return () => {
      // Clean up subscriptions
    };
  }, []);
  
  const handleConnect = () => {
    // Connect functionality would be implemented here
    setConnected(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Hydroponics Monitoring Dashboard</h1>
      
      <ConnectionControl 
        onConnect={handleConnect} 
        isConnected={connected} 
      />

      {/* Display current readings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PHDisplay value={sensorData.ph} optimalMin={thresholds.phMin} optimalMax={thresholds.phMax} />
        <TemperatureDisplay value={sensorData.temperature} optimalMin={thresholds.temperatureMin} optimalMax={thresholds.temperatureMax} />
        <WaterLevelDisplay level={sensorData.waterLevel} />
        <TDSDisplay value={sensorData.tds} optimalMin={thresholds.tdsMin} optimalMax={thresholds.tdsMax} />
      </div>

      {/* Monitoring panel with history chart */}
      <MonitoringPanel 
        params={sensorData}
        phHistory={phHistory}
        tempHistory={tempHistory}
        tdsHistory={tdsHistory}
        showGraphs={showGraphs}
        setShowGraphs={setShowGraphs}
        thresholds={thresholds}
      />
      
      {/* System information */}
      <SystemInfoPanel 
        connected={connected} 
        lastUpdate={lastUpdate}
        thresholds={thresholds}
      />
      
      {/* System Logs - New Component */}
      <div className="mt-6">
        <SystemLogs />
      </div>
      
      {/* Tabbed interface for advanced features */}
      <div className="mt-6">
        <Tabs defaultValue="statistics">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="serial">Serial Monitor</TabsTrigger>
          </TabsList>
          <TabsContent value="statistics" className="mt-6">
            <StatisticsView sensorData={sensorData} />
          </TabsContent>
          <TabsContent value="thresholds" className="mt-6">
            <ThresholdSettings thresholds={thresholds} setThresholds={setThresholds} />
          </TabsContent>
          <TabsContent value="serial" className="mt-6">
            <SerialMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
