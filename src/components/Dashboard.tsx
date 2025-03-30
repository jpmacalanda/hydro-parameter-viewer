
import React, { useEffect, useState } from 'react';
import MonitoringPanel from './dashboard/MonitoringPanel';
import SystemInfoPanel from './dashboard/SystemInfoPanel';
import serialService from '@/services/SerialService';
import { SerialData } from '@/services/types/serial.types';
import SensorGrid from './dashboard/SensorGrid';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardTabs from './dashboard/DashboardTabs';
import { NotificationsProvider, useNotifications } from '@/context/NotificationsContext';
import ThresholdChecker from './dashboard/ThresholdChecker';
import ConnectionDetection from './dashboard/ConnectionDetection';

interface DashboardProps {
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
  onSensorData: (data: SerialData) => void;
}

const DashboardContent: React.FC<DashboardProps> = ({
  features,
  sensorData,
  dataHistory,
  thresholds,
  setThresholds,
  setFeatures,
  onSensorData
}) => {
  const [connected, setConnected] = useState(true); // Always show as connected
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showGraphs, setShowGraphs] = useState(false);
  
  const [phHistory, setPhHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tempHistory, setTempHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tdsHistory, setTdsHistory] = useState<Array<{time: string; value: number}>>([]);

  const [lastDataReceived, setLastDataReceived] = useState<Date | null>(null);
  const [isRemoteAccess, setIsRemoteAccess] = useState(false);
  const { addNotification } = useNotifications();

  // Force update data history when sensor data changes
  useEffect(() => {
    console.log("Dashboard: Sensor data updated:", sensorData);
    
    if (sensorData && (sensorData.ph !== 0 || sensorData.temperature !== 0 || sensorData.tds !== 0)) {
      setLastUpdate(new Date());
      setLastDataReceived(new Date());
      
      // Update histories with new data point
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const timeString = `${currentHour}:${currentMinute < 10 ? '0' : ''}${currentMinute}`;
      
      // Only update histories with valid data
      if (sensorData.ph !== 0) {
        setPhHistory(prev => {
          const newHistory = [...prev];
          newHistory.push({ time: timeString, value: sensorData.ph });
          if (newHistory.length > 24) newHistory.shift();
          return newHistory;
        });
      }
      
      if (sensorData.temperature !== 0) {
        setTempHistory(prev => {
          const newHistory = [...prev];
          newHistory.push({ time: timeString, value: sensorData.temperature });
          if (newHistory.length > 24) newHistory.shift();
          return newHistory;
        });
      }
      
      if (sensorData.tds !== 0) {
        setTdsHistory(prev => {
          const newHistory = [...prev];
          newHistory.push({ time: timeString, value: sensorData.tds });
          if (newHistory.length > 24) newHistory.shift();
          return newHistory;
        });
      }
    }
  }, [sensorData]);

  useEffect(() => {
    console.log("Dashboard: Setting up serial data listeners");
    
    serialService.onData((data) => {
      console.log("Dashboard: Received data from serial service:", data);
      setLastUpdate(new Date());
      setLastDataReceived(new Date());
      
      // Pass the received data up to the parent
      console.log("Dashboard: Forwarding data to parent component");
      onSensorData(data);
    });

    serialService.onError((error) => {
      console.error("Dashboard: Serial service error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      addNotification('error', 'Connection Error', errorMessage);
    });

    setConnected(true); // Always connected
    console.log("Dashboard: Connection status: true");
    
    const hostname = window.location.hostname;
    const isRemote = hostname !== 'localhost' && hostname !== '127.0.0.1';
    setIsRemoteAccess(isRemote);
    console.log("Dashboard: Remote access:", isRemote);

    return () => {
      // Cleanup function
      console.log("Dashboard: Cleanup effect");
    };
  }, [addNotification, onSensorData]);

  useEffect(() => {
    console.log("Dashboard: Data history updated, length:", dataHistory.length);
  }, [dataHistory]);

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader title="Hydroponics Monitoring Dashboard" />
      
      {/* Always render content */}
      <>
        {/* Display either SensorGrid or MonitoringPanel based on showGraphs */}
        {showGraphs ? (
          <MonitoringPanel 
            params={sensorData}
            phHistory={phHistory}
            tempHistory={tempHistory}
            tdsHistory={tdsHistory}
            showGraphs={showGraphs}
            setShowGraphs={setShowGraphs}
            thresholds={thresholds}
          />
        ) : (
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-4">
              <label htmlFor="show-graphs" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    id="show-graphs"
                    type="checkbox"
                    className="sr-only"
                    checked={showGraphs}
                    onChange={e => setShowGraphs(e.target.checked)}
                  />
                  <div className="block bg-gray-300 w-14 h-8 rounded-full"></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${showGraphs ? 'transform translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-3 text-gray-700 font-medium">Show Historical Graphs</div>
              </label>
            </div>
            <SensorGrid sensorData={sensorData} thresholds={thresholds} />
          </div>
        )}
        
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
      </>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <NotificationsProvider>
      <DashboardContent {...props} />
    </NotificationsProvider>
  );
};

export default Dashboard;
