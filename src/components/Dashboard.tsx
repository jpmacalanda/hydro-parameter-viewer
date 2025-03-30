
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
import FeatureSettings from './FeatureSettings';
import ArchiveSettings from './ArchiveSettings';
import NotificationsPanel, { Notification, NotificationType } from './NotificationsPanel';
import { Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

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
  
  // Feature toggles
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true,
  });
  
  // Track data history for CSV export (limited to last 100 readings)
  const [dataHistory, setDataHistory] = useState<SerialData[]>([]);
  const MAX_HISTORY_LENGTH = 100;
  
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

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to data updates from the SerialService
    serialService.onData((data) => {
      setSensorData(data);
      setLastUpdate(new Date());
      
      // Update data history for CSV export (keep last 100 items)
      setDataHistory(prevHistory => {
        const newHistory = [...prevHistory, data];
        if (newHistory.length > MAX_HISTORY_LENGTH) {
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        }
        return newHistory;
      });

      // Check for threshold violations and create notifications
      checkThresholds(data);
    });

    // Subscribe to connection status changes
    serialService.onError((error) => {
      setConnected(false);
      addNotification('error', 'Connection Error', error || 'Could not connect to device');
    });

    // Initial connection status
    setConnected(!serialService.isMockData);

    return () => {
      // Clean up subscriptions
    };
  }, [thresholds]); // Add thresholds to dependencies
  
  useEffect(() => {
    // Update unread count whenever notifications change
    const count = notifications.filter(notif => !notif.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleConnect = () => {
    // Connect functionality would be implemented here
    setConnected(true);
    addNotification('success', 'Connected', 'Successfully connected to the device');
  };

  // Check if sensor data exceeds thresholds and create notifications
  const checkThresholds = (data: SerialData) => {
    if (data.ph < thresholds.phMin) {
      addNotification('warning', 'Low pH Level', `pH level is below threshold: ${data.ph} (min: ${thresholds.phMin})`);
    } else if (data.ph > thresholds.phMax) {
      addNotification('warning', 'High pH Level', `pH level is above threshold: ${data.ph} (max: ${thresholds.phMax})`);
    }

    if (data.temperature < thresholds.temperatureMin) {
      addNotification('warning', 'Low Temperature', `Temperature is below threshold: ${data.temperature}°C (min: ${thresholds.temperatureMin}°C)`);
    } else if (data.temperature > thresholds.temperatureMax) {
      addNotification('warning', 'High Temperature', `Temperature is above threshold: ${data.temperature}°C (max: ${thresholds.temperatureMax}°C)`);
    }

    if (data.tds < thresholds.tdsMin) {
      addNotification('warning', 'Low TDS Level', `TDS level is below threshold: ${data.tds} ppm (min: ${thresholds.tdsMin} ppm)`);
    } else if (data.tds > thresholds.tdsMax) {
      addNotification('warning', 'High TDS Level', `TDS level is above threshold: ${data.tds} ppm (max: ${thresholds.tdsMax} ppm)`);
    }

    if (data.waterLevel === "low") {
      addNotification('warning', 'Low Water Level', 'Water level is low, please refill the reservoir');
    }
  };

  // Add a new notification
  const addNotification = (type: NotificationType, title: string, message: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      // Check if a similar notification already exists in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const similarExists = prev.some(
        notif => 
          notif.title === title && 
          notif.message === message && 
          notif.timestamp > fiveMinutesAgo
      );

      // Only add if no similar notification exists
      if (!similarExists) {
        return [newNotification, ...prev];
      }
      return prev;
    });
  };

  // Mark a notification as read
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Hydroponics Monitoring Dashboard</h1>
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-gray-100 relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 p-0 text-xs bg-red-500 text-white rounded-full" 
                variant="destructive"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </button>
        </div>
      </div>
      
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
      
      {/* Tabbed interface for advanced features */}
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
    </div>
  );
};

export default Dashboard;
