
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThresholdSettings from '@/components/ThresholdSettings';
import StatisticsView from '@/components/StatisticsView';
import SystemLogs from '@/components/SystemLogs';
import SerialMonitor from '@/components/SerialMonitor';
import FeatureSettings from '@/components/FeatureSettings';
import { SerialData } from '@/services/types/serial.types';
import DatabaseManagement from '../DatabaseManagement';

interface DashboardTabsProps {
  features: {
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
  };
  sensorData: SerialData;
  dataHistory: SerialData[];
  thresholds: {
    phMin: number;
    phMax: number;
    temperatureMin: number;
    temperatureMax: number;
    tdsMin: number;
    tdsMax: number;
  };
  setThresholds: (thresholds: any) => void;
  setFeatures: React.Dispatch<React.SetStateAction<{
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
  }>>;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({
  features,
  sensorData,
  dataHistory,
  thresholds,
  setThresholds,
  setFeatures
}) => {
  return (
    <Tabs defaultValue="statistics" className="mt-8 bg-white rounded-lg border shadow p-4">
      <TabsList className="grid grid-cols-6 w-full">
        <TabsTrigger value="statistics">Statistics</TabsTrigger>
        <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
        <TabsTrigger value="logs">System Logs</TabsTrigger>
        <TabsTrigger value="serialMonitor">Serial Monitor</TabsTrigger>
        <TabsTrigger value="database">Database</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="statistics" className="pt-4">
        {features.showStatistics && (
          <StatisticsView sensorData={sensorData} dataHistory={dataHistory} />
        )}
      </TabsContent>
      <TabsContent value="thresholds" className="pt-4">
        {features.showThresholds && (
          <ThresholdSettings thresholds={thresholds} setThresholds={setThresholds} />
        )}
      </TabsContent>
      <TabsContent value="logs" className="pt-4">
        {features.showSystemLogs && (
          <SystemLogs />
        )}
      </TabsContent>
      <TabsContent value="serialMonitor" className="pt-4">
        {features.showSerialMonitor && (
          <SerialMonitor />
        )}
      </TabsContent>
      <TabsContent value="database" className="pt-4">
        <DatabaseManagement />
      </TabsContent>
      <TabsContent value="settings" className="pt-4">
        <FeatureSettings features={features} setFeatures={setFeatures} />
      </TabsContent>
    </Tabs>
  );
};

export default DashboardTabs;
