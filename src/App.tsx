
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from "sonner";

import Dashboard from './components/Dashboard';
import ConnectionControl from './components/ConnectionControl';
import { NotificationsProvider } from '@/context/NotificationsContext';
import serialService from '@/services/SerialService';
import logParserService from '@/services/LogParserService';
import { SerialData } from '@/services/types/serial.types';
import { toast } from 'sonner';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SerialData>({
    ph: 7.0,
    temperature: 25.0,
    waterLevel: "medium",
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
  
  // Update features state to remove useWebSocket
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true
  });
  
  // Effect to start/stop log parsing based on connection
  useEffect(() => {
    console.log("[DOCKER-LOG][App] Connection state changed:", isConnected);
    
    if (isConnected) {
      // Start log parsing
      console.log("[DOCKER-LOG][App] Starting to read data from Serial Monitor logs");
      toast.info("Reading data from Serial Monitor logs", {
        description: "Parsing logs for sensor data"
      });
      
      logParserService.onData(handleSensorData);
      logParserService.startPolling();
      
      return () => {
        console.log("[DOCKER-LOG][App] Cleaning up log parser (connected state cleanup)");
        logParserService.stopPolling();
      };
    }
    
    return () => {
      // Cleanup
      console.log("[DOCKER-LOG][App] Cleaning up log parser (general cleanup)");
      logParserService.stopPolling();
    };
  }, [isConnected]);
  
  // Log current state values
  useEffect(() => {
    console.log("[DOCKER-LOG][App] Current state - connected:", isConnected, "dataReceived:", dataReceived);
    console.log("[DOCKER-LOG][App] Current sensor data:", JSON.stringify(sensorData));
    console.log("[DOCKER-LOG][App] Data history length:", dataHistory.length);
  }, [isConnected, dataReceived, sensorData, dataHistory]);
  
  const handleConnect = () => {
    console.log("[DOCKER-LOG][App] handleConnect called");
    setIsConnected(true);
    setDataReceived(false);
  };

  const handleDisconnect = () => {
    console.log("[DOCKER-LOG][App] handleDisconnect called");
    setIsConnected(false);
    setDataReceived(false);
  };

  const handleSensorData = (data: SerialData) => {
    console.log("[DOCKER-LOG][App] Received new sensor data:", JSON.stringify(data));
    setSensorData(data);
    setDataHistory(prev => {
      const newHistory = [...prev, data];
      console.log("[DOCKER-LOG][App] Updated data history, new length:", newHistory.length);
      return newHistory;
    });
    setDataReceived(true);
  };

  return (
    <NotificationsProvider>
      <Router>
        <div className="container mx-auto p-4">
          <ConnectionControl 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect}
            isConnected={isConnected}
            dataReceived={dataReceived}
          />
          
          {isConnected && (
            <Dashboard 
              features={features}
              sensorData={sensorData} 
              dataHistory={dataHistory}
              thresholds={thresholds}
              setThresholds={setThresholds}
              setFeatures={setFeatures}
              onSensorData={handleSensorData}
            />
          )}
          
          <Toaster />
        </div>
      </Router>
    </NotificationsProvider>
  );
}

export default App;
