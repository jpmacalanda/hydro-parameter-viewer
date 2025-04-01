import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from "sonner";

import Dashboard from './components/Dashboard';
import ConnectionControl from './components/ConnectionControl';
import { NotificationsProvider } from '@/context/NotificationsContext';
import serialService from '@/services/SerialService';
import mockDataService from '@/services/MockDataService';
import logParserService from '@/services/LogParserService';
import databaseService from '@/services/DatabaseService';
import { SerialData } from '@/services/types/serial.types';
import { toast } from 'sonner';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [sensorData, setSensorData] = useState<SerialData>({
    ph: 0,
    temperature: 0,
    waterLevel: "medium",
    tds: 0
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
  
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true
  });
  
  // Load historical data from database on startup
  useEffect(() => {
    async function loadDatabaseData() {
      try {
        // Get the last 24 hours of data
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const historicalData = await databaseService.getReadingsInRange(oneDayAgo, Date.now());
        
        if (historicalData.length > 0) {
          console.log("[DOCKER-LOG][App] Loaded historical data from database:", historicalData.length, "records");
          
          // Sort by timestamp and convert to SerialData array
          const sortedData = historicalData
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(item => ({
              ph: item.ph,
              temperature: item.temperature,
              waterLevel: item.waterLevel,
              tds: item.tds
            }));
          
          // Update data history with historical data
          setDataHistory(sortedData);
          
          // Set current sensor data to the most recent reading
          if (sortedData.length > 0) {
            setSensorData(sortedData[sortedData.length - 1]);
          }
          
          toast.info(`Loaded ${historicalData.length} historical readings`, {
            description: "Retrieved from local database"
          });
        } else {
          console.log("[DOCKER-LOG][App] No historical data found in database");
        }
      } catch (error) {
        console.error("[DOCKER-LOG][App] Error loading data from database:", error);
      }
    }
    
    loadDatabaseData();
  }, []);
  
  // Effect to handle data source changes based on mock toggle
  useEffect(() => {
    if (isConnected) {
      if (useMockData) {
        // Switch to mock data
        console.log("[DOCKER-LOG][App] Switching to mock data");
        logParserService.stopPolling(); // Stop real data parsing
        
        // Set up mock data service
        mockDataService.clearCallbacks();
        mockDataService.onData(handleSensorData);
        mockDataService.startGeneratingData();
        
        toast.info("Using mock data", {
          description: "Generating simulated sensor readings"
        });
      } else {
        // Switch to real data
        console.log("[DOCKER-LOG][App] Switching to real data");
        mockDataService.stopGeneratingData(); // Stop mock data generation
        
        // Set up log parser for real data
        logParserService.onData(handleSensorData);
        logParserService.startPolling();
        
        toast.info("Using real data", {
          description: "Reading from Arduino serial connection"
        });
      }
    }
    
    // Cleanup function
    return () => {
      console.log("[DOCKER-LOG][App] Cleaning up data services");
      mockDataService.stopGeneratingData();
      logParserService.stopPolling();
    };
  }, [isConnected, useMockData]);
  
  // Effect to start/stop log parsing based on connection
  useEffect(() => {
    console.log("[DOCKER-LOG][App] Connection state changed:", isConnected);
    
    if (isConnected) {
      console.log("[DOCKER-LOG][App] Is now connected, using mock data:", useMockData);
      setDataReceived(false);
      
      if (!useMockData) {
        // Start real data parsing
        console.log("[DOCKER-LOG][App] Starting to read data from Serial Monitor logs");
        toast.info("Reading data from Serial Monitor logs", {
          description: "Parsing logs for sensor data"
        });
        
        logParserService.onData(handleSensorData);
        logParserService.startPolling();
      }
    } else {
      // If disconnected, stop both data sources
      console.log("[DOCKER-LOG][App] Disconnected, stopping all data sources");
      mockDataService.stopGeneratingData();
      logParserService.stopPolling();
      setDataReceived(false);
    }
    
    return () => {
      // Cleanup
      console.log("[DOCKER-LOG][App] Cleaning up data sources (general cleanup)");
      mockDataService.stopGeneratingData();
      logParserService.stopPolling();
    };
  }, [isConnected]);
  
  // Log current state values
  useEffect(() => {
    console.log("[DOCKER-LOG][App] Current state - connected:", isConnected, "useMockData:", useMockData, "dataReceived:", dataReceived);
    console.log("[DOCKER-LOG][App] Current sensor data:", JSON.stringify(sensorData));
    console.log("[DOCKER-LOG][App] Data history length:", dataHistory.length);
  }, [isConnected, useMockData, dataReceived, sensorData, dataHistory]);
  
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

  const handleToggleMockData = (useMock: boolean) => {
    console.log("[DOCKER-LOG][App] Toggle mock data:", useMock);
    setUseMockData(useMock);
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
            useMockData={useMockData}
            onToggleMockData={handleToggleMockData}
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
