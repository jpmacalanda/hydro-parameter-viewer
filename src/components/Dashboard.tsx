
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { toast } from "sonner";

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
  
  // New state for data resolution and recording
  const [dataResolution, setDataResolution] = useState<number>(60000); // Default: every minute
  const lastRecordTime = useRef<number>(0);
  
  // New state for calibration
  const [calibration, setCalibration] = useState({
    phOffset: 0,
    tdsCalibrationFactor: 1.0
  });
  
  // Apply calibration to sensor data
  const getAdjustedSensorData = (data: SerialData): SerialData => {
    if (!data) return data;
    
    return {
      ...data,
      ph: data.ph !== 0 ? data.ph + calibration.phOffset : 0,
      tds: data.tds !== 0 ? Math.round(data.tds * calibration.tdsCalibrationFactor) : 0
    };
  };
  
  // Handle clearing data history
  const handleClearData = useCallback(() => {
    setPhHistory([]);
    setTempHistory([]);
    setTdsHistory([]);
    console.log("Dashboard: Cleared historical data");
    
    // Also clear parent's data history
    onSensorData({...sensorData});
  }, [sensorData, onSensorData]);

  // Force update data history when sensor data changes
  useEffect(() => {
    console.log("Dashboard: Sensor data updated:", sensorData);
    
    if (sensorData && (sensorData.ph !== 0 || sensorData.temperature !== 0 || sensorData.tds !== 0)) {
      const calibratedData = getAdjustedSensorData(sensorData);
      setLastUpdate(new Date());
      setLastDataReceived(new Date());
      
      // Check if it's time to record a data point based on resolution
      const now = Date.now();
      if (now - lastRecordTime.current >= dataResolution) {
        lastRecordTime.current = now;
        
        // Update histories with new data point
        const currentTime = new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        });
        
        // Only update histories with valid data
        if (calibratedData.ph !== 0) {
          setPhHistory(prev => {
            const newHistory = [...prev];
            newHistory.push({ time: currentTime, value: calibratedData.ph });
            if (newHistory.length > 24) newHistory.shift();
            return newHistory;
          });
        }
        
        if (calibratedData.temperature !== 0) {
          setTempHistory(prev => {
            const newHistory = [...prev];
            newHistory.push({ time: currentTime, value: calibratedData.temperature });
            if (newHistory.length > 24) newHistory.shift();
            return newHistory;
          });
        }
        
        if (calibratedData.tds !== 0) {
          setTdsHistory(prev => {
            const newHistory = [...prev];
            newHistory.push({ time: currentTime, value: calibratedData.tds });
            if (newHistory.length > 24) newHistory.shift();
            return newHistory;
          });
        }
        
        console.log("Dashboard: Recorded data point with resolution:", dataResolution);
      } else {
        console.log("Dashboard: Skipping data recording, waiting for next interval");
      }
    }
  }, [sensorData, dataResolution]);

  // Handle calibration changes
  useEffect(() => {
    console.log("Dashboard: Calibration values updated:", calibration);
  }, [calibration]);
  
  // Handle data resolution changes
  useEffect(() => {
    console.log("Dashboard: Data resolution changed to", dataResolution, "ms");
    // Reset the timer when resolution changes to avoid long waits
    lastRecordTime.current = 0;
  }, [dataResolution]);

  useEffect(() => {
    console.log("Dashboard: Setting up serial data listeners");
    
    serialService.onData((data) => {
      console.log("Dashboard: Received data from serial service:", data);
      setLastUpdate(new Date());
      setLastDataReceived(new Date());
      
      // Apply calibration and pass the data up to the parent
      const calibratedData = getAdjustedSensorData(data);
      console.log("Dashboard: Forwarding calibrated data to parent component:", calibratedData);
      onSensorData(calibratedData);
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

  // Effect for displaying toast notification when calibration changes
  useEffect(() => {
    if (calibration.phOffset !== 0 || calibration.tdsCalibrationFactor !== 1.0) {
      toast.info("Calibration Active", {
        description: `pH Offset: ${calibration.phOffset.toFixed(2)}, TDS Factor: ${calibration.tdsCalibrationFactor.toFixed(2)}`
      });
    }
  }, [calibration]);

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader title="Hydroponics Monitoring Dashboard" />
      
      {/* Always render content */}
      <>
        {/* Display either SensorGrid or MonitoringPanel based on showGraphs */}
        {showGraphs ? (
          <MonitoringPanel 
            params={getAdjustedSensorData(sensorData)}
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
            <SensorGrid sensorData={getAdjustedSensorData(sensorData)} thresholds={thresholds} />
          </div>
        )}
        
        <SystemInfoPanel 
          connected={connected} 
          lastUpdate={lastUpdate}
          thresholds={thresholds}
          calibration={calibration}
          dataResolution={dataResolution}
        />
        
        <DashboardTabs 
          features={features}
          sensorData={getAdjustedSensorData(sensorData)}
          dataHistory={dataHistory}
          thresholds={thresholds}
          dataResolution={dataResolution}
          calibration={calibration}
          setThresholds={setThresholds}
          setDataResolution={setDataResolution}
          setCalibration={setCalibration}
          setFeatures={setFeatures}
          onClearData={handleClearData}
        />

        {/* Non-visual components for side effects */}
        <ThresholdChecker sensorData={getAdjustedSensorData(sensorData)} thresholds={thresholds} />
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
