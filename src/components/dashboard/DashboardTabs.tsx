
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatisticsView from '../StatisticsView';
import ThresholdSettings from '../ThresholdSettings';
import SystemLogs from '../SystemLogs';
import SerialMonitor from '../SerialMonitor';
import FeatureSettings from '../FeatureSettings';
import ArchiveSettings from '../ArchiveSettings';
import { Badge } from "@/components/ui/badge";
import NotificationsPanel from '../NotificationsPanel';
import { useNotifications } from '@/context/NotificationsContext';
import { SerialData } from '@/services/types/serial.types';

interface DashboardTabsProps {
  features: {
    showStatistics: boolean;
    showThresholds: boolean;
    showSystemLogs: boolean;
    showSerialMonitor: boolean;
    useWebSocket: boolean;
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
    useWebSocket: boolean;
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
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead, handleClearAll } = useNotifications();

  return (
    <div className="mt-6">
      <Tabs defaultValue="statistics">
        <TabsList className="grid w-full grid-cols-6">
          {features.showStatistics && <TabsTrigger value="statistics">Statistics</TabsTrigger>}
          {features.showThresholds && <TabsTrigger value="thresholds">Thresholds</TabsTrigger>}
          {(features.showSystemLogs || features.showSerialMonitor) && 
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          }
          <TabsTrigger value="notifications">
            Notifications
            {unreadCount > 0 && (
              <Badge 
                className="ml-2 flex items-center justify-center w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full" 
                variant="destructive"
              >
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>
        
        {features.showStatistics && (
          <TabsContent value="statistics" className="mt-6">
            <StatisticsView sensorData={sensorData} />
          </TabsContent>
        )}
        
        {features.showThresholds && (
          <TabsContent value="thresholds" className="mt-6">
            <ThresholdSettings thresholds={thresholds} setThresholds={setThresholds} />
          </TabsContent>
        )}
        
        {(features.showSystemLogs || features.showSerialMonitor) && (
          <TabsContent value="diagnostics" className="mt-6">
            <Tabs defaultValue={features.showSystemLogs ? "logs" : "serial"}>
              <TabsList>
                {features.showSystemLogs && <TabsTrigger value="logs">System Logs</TabsTrigger>}
                {features.showSerialMonitor && <TabsTrigger value="serial">Serial Monitor</TabsTrigger>}
              </TabsList>
              
              {features.showSystemLogs && (
                <TabsContent value="logs" className="mt-4">
                  <SystemLogs />
                </TabsContent>
              )}
              
              {features.showSerialMonitor && (
                <TabsContent value="serial" className="mt-4">
                  <SerialMonitor />
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
        )}
        
        <TabsContent value="notifications" className="mt-6">
          <NotificationsPanel
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onClearAll={handleClearAll}
          />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <FeatureSettings features={features} setFeatures={setFeatures} />
        </TabsContent>
        
        <TabsContent value="archive" className="mt-6">
          <ArchiveSettings sensorData={sensorData} dataHistory={dataHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardTabs;
