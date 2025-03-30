
import React, { useState, useEffect } from 'react';
import MonitoringPanel from './dashboard/MonitoringPanel';
import SystemInfoPanel from './dashboard/SystemInfoPanel';
import serialService from '@/services/SerialService';
import { SerialData } from '@/services/types/serial.types';
import SensorGrid from './dashboard/SensorGrid';
import DashboardHeader from './dashboard/DashboardHeader';
import ConnectionControl from './ConnectionControl';
import DashboardTabs from './dashboard/DashboardTabs';
import { NotificationsProvider, useNotifications } from '@/context/NotificationsContext';
import ThresholdChecker from './dashboard/ThresholdChecker';
import ConnectionDetection from './dashboard/ConnectionDetection';

const DashboardContent: React.FC = () => {
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
  
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true,
  });
  
  const [dataHistory, setDataHistory] = useState<SerialData[]>([]);
  const MAX_HISTORY_LENGTH = 100;
  
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

  const [lastDataReceived, setLastDataReceived] = useState<Date | null>(null);
  const [isRemoteAccess, setIsRemoteAccess] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    serialService.onData((data) => {
      setSensorData(data);
      setLastUpdate(new Date());
      setLastDataReceived(new Date());
      
      setDataHistory(prevHistory => {
        const newHistory = [...prevHistory, data];
        if (newHistory.length > MAX_HISTORY_LENGTH) {
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        }
        return newHistory;
      });
    });

    serialService.onError((error) => {
      setConnected(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addNotification('error', 'Connection Error', errorMessage);
    });

    setConnected(!serialService.isMockData);
    
    const hostname = window.location.hostname;
    const isRemote = hostname !== 'localhost' && hostname !== '127.0.0.1';
    setIsRemoteAccess(isRemote);

    return () => {
      // Cleanup function (empty since the service handles this)
    };
  }, [addNotification]);

  const handleConnect = () => {
    setConnected(true);
    addNotification('success', 'Connected', 'Successfully connected to the device');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader title="Hydroponics Monitoring Dashboard" />
      
      <ConnectionControl 
        onConnect={handleConnect} 
        isConnected={connected} 
        dataReceived={lastDataReceived !== null}
      />

      <SensorGrid sensorData={sensorData} thresholds={thresholds} />

      <MonitoringPanel 
        params={sensorData}
        phHistory={phHistory}
        tempHistory={tempHistory}
        tdsHistory={tdsHistory}
        showGraphs={showGraphs}
        setShowGraphs={setShowGraphs}
        thresholds={thresholds}
      />
      
      <SystemInfoPanel 
        connected={connected} 
        lastUpdate={lastUpdate}
        thresholds={thresholds}
      />
      
      <DashboardTabs 
        features={features}
        sensorData={sensorData}
        dataHistory={dataHistory}
        thresholds={thresholds}
        setThresholds={setThresholds}
        setFeatures={setFeatures}
      />

      {/* Non-visual components for side effects */}
      <ThresholdChecker sensorData={sensorData} thresholds={thresholds} />
      <ConnectionDetection 
        connected={connected} 
        lastDataReceived={lastDataReceived} 
        isRemoteAccess={isRemoteAccess} 
      />
    </div>
  );
};

// Wrapper component to provide context
const Dashboard: React.FC = () => {
  return (
    <NotificationsProvider>
      <DashboardContent />
    </NotificationsProvider>
  );
};

export default Dashboard;
