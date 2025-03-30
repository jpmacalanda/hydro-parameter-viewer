import React, { useState, useEffect } from 'react';
import PHDisplay from './dashboard/PHDisplay';
import TemperatureDisplay from './dashboard/TemperatureDisplay';
import WaterLevelDisplay from './dashboard/WaterLevelDisplay';
import TDSDisplay from './dashboard/TDSDisplay';
import MonitoringPanel from './dashboard/MonitoringPanel';
import SystemInfoPanel from './dashboard/SystemInfoPanel';
import ThresholdSettings from './dashboard/ThresholdSettings';
import StatisticsView from './dashboard/StatisticsView';
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Hydroponics Monitoring Dashboard</h1>
      
      <ConnectionControl />

      {/* Display current readings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PHDisplay ph={sensorData.ph} thresholds={thresholds} />
        <TemperatureDisplay temperature={sensorData.temperature} thresholds={thresholds} />
        <WaterLevelDisplay waterLevel={sensorData.waterLevel} />
        <TDSDisplay tds={sensorData.tds} thresholds={thresholds} />
      </div>

      {/* Monitoring panel with history chart */}
      <MonitoringPanel />
      
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
