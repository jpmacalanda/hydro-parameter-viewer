
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from "sonner";

import Dashboard from './components/Dashboard';
import ConnectionControl from './components/ConnectionControl';
import { NotificationsProvider } from '@/context/NotificationsContext';
import serialService from '@/services/SerialService';
import { SerialData } from '@/services/types/serial.types';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SerialData>({
    ph: 7.0,
    temperature: 25.0,
    waterLevel: "medium" as "low" | "medium" | "high", // Type assertion to fix the TypeScript error
    tds: 650
  });
  const [dataHistory, setDataHistory] = useState<SerialData[]>([]);
  const [thresholds, setThresholds] = useState({
    phMin: 6.0,
    phMax: 7.0,
    temperatureMin: 20.0,
    temperatureMax: 30.0,
    tdsMin: 400,
    tdsMax: 800
  });
  const [dataReceived, setDataReceived] = useState(false);
  
  // Update features state to include useWebSocket
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true,
    useWebSocket: true // Default to using WebSocket
  });
  
  // Check which service is active on initial load
  useEffect(() => {
    const checkActiveService = async () => {
      try {
        const { useWebSocket } = await serialService.checkActiveService();
        setFeatures(prev => ({
          ...prev,
          useWebSocket
        }));
      } catch (error) {
        console.error("Error checking active service:", error);
      }
    };
    
    checkActiveService();
  }, []);
  
  const handleConnect = () => {
    setIsConnected(true);
    setDataReceived(false);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setDataReceived(false);
  };

  const handleSensorData = (data: SerialData) => {
    setSensorData(data);
    setDataHistory(prev => [...prev, data]);
    setDataReceived(true);
  };

  return (
    <NotificationsProvider>
      <Router>
        <div className="container mx-auto p-4">
          {/* Remove the header from here since it's already in Dashboard */}
          
          <ConnectionControl 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            isConnected={isConnected}
            dataReceived={dataReceived}
          />
          
          {/* Always render Dashboard, it will handle showing/hiding content based on connection state */}
          <Dashboard 
            features={features}
            sensorData={sensorData} 
            dataHistory={dataHistory}
            thresholds={thresholds}
            setThresholds={setThresholds}
            setFeatures={setFeatures}
            onSensorData={handleSensorData}
          />
          
          <Toaster />
        </div>
      </Router>
    </NotificationsProvider>
  );
}

export default App;
