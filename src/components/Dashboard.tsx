
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Activity, Gauge, Settings, Terminal } from "lucide-react";
import serialService from '@/services/SerialService';
import webSocketService from '@/services/WebSocketService';
import ConnectionControl from './ConnectionControl';
import ThresholdSettings from './ThresholdSettings';
import CalibrationSettings from './CalibrationSettings';
import StatisticsView from './StatisticsView';
import MonitoringPanel from './dashboard/MonitoringPanel';
import SystemInfoPanel from './dashboard/SystemInfoPanel';
import SerialMonitor from './SerialMonitor';
import LocalStorageService from './dashboard/LocalStorageService';
import { HydroParams, Thresholds, Calibration } from './dashboard/types';

const initialParams: HydroParams = {
  ph: 6.0,
  temperature: 23.0,
  waterLevel: 'medium' as 'low' | 'medium' | 'high',
  tds: 650
};

const initialThresholds: Thresholds = {
  phMin: 5.5,
  phMax: 6.5,
  temperatureMin: 18,
  temperatureMax: 26,
  tdsMin: 500,
  tdsMax: 1000
};

const initialCalibration: Calibration = {
  phCalibrationConstant: 1.0,
  tdsCalibrationFactor: 1.0
};

const MAX_HISTORY_LENGTH = 20;

const Dashboard: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [params, setParams] = useState(initialParams);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showGraphs, setShowGraphs] = useState(true);
  const [activeTab, setActiveTab] = useState("monitor");
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [calibration, setCalibration] = useState(initialCalibration);
  const [dataReceived, setDataReceived] = useState(false);
  
  const [phHistory, setPhHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tempHistory, setTempHistory] = useState<Array<{time: string; value: number}>>([]);
  const [tdsHistory, setTdsHistory] = useState<Array<{time: string; value: number}>>([]);
  
  useEffect(() => {
    // Try WebSocket connection first for Raspberry Pi
    const setupConnection = async () => {
      const hostname = window.location.hostname;
      const isRpi = hostname === 'raspberrypi.local' || 
                    hostname.startsWith('192.168.') ||
                    hostname === 'localhost';
      
      if (isRpi) {
        console.log("Running on Raspberry Pi, trying WebSocket connection first");
        webSocketService.onData((data) => {
          const calibratedData = {
            ...data,
            ph: parseFloat((data.ph * calibration.phCalibrationConstant).toFixed(1)),
            tds: Math.round(data.tds * calibration.tdsCalibrationFactor)
          };
          
          console.log("WebSocket data received:", calibratedData);
          setParams(calibratedData);
          setDataReceived(true);
          const now = new Date();
          setLastUpdate(now);
          
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          setPhHistory(prev => {
            const newHistory = [...prev, { time: timeStr, value: calibratedData.ph }];
            return newHistory.slice(-MAX_HISTORY_LENGTH);
          });
          
          setTempHistory(prev => {
            const newHistory = [...prev, { time: timeStr, value: calibratedData.temperature }];
            return newHistory.slice(-MAX_HISTORY_LENGTH);
          });
          
          setTdsHistory(prev => {
            const newHistory = [...prev, { time: timeStr, value: calibratedData.tds }];
            return newHistory.slice(-MAX_HISTORY_LENGTH);
          });
        });
        
        try {
          const connected = webSocketService.connect();
          if (connected) {
            setConnected(true);
            console.log("WebSocket connection established");
          }
        } catch (error) {
          console.error("WebSocket connection failed:", error);
          // Fall back to serial service
          setupSerialService();
        }
      } else {
        // Not on Raspberry Pi, use regular serial service
        setupSerialService();
      }
    };
    
    // Setup the serial service data handling
    const setupSerialService = () => {
      serialService.onData((data) => {
        const calibratedData = {
          ...data,
          ph: parseFloat((data.ph * calibration.phCalibrationConstant).toFixed(1)),
          tds: Math.round(data.tds * calibration.tdsCalibrationFactor)
        };
        
        console.log("Serial data received:", calibratedData);
        setParams(calibratedData);
        setDataReceived(true);
        const now = new Date();
        setLastUpdate(now);
        
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        setPhHistory(prev => {
          const newHistory = [...prev, { time: timeStr, value: calibratedData.ph }];
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        });
        
        setTempHistory(prev => {
          const newHistory = [...prev, { time: timeStr, value: calibratedData.temperature }];
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        });
        
        setTdsHistory(prev => {
          const newHistory = [...prev, { time: timeStr, value: calibratedData.tds }];
          return newHistory.slice(-MAX_HISTORY_LENGTH);
        });
      });
    };
    
    // Set up listeners for connection events
    const handleConnectionSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.success(customEvent.detail.message, {
        description: customEvent.detail.description,
      });
      setConnected(true);
    };
    
    document.addEventListener('connection-success', handleConnectionSuccess);
    
    // Initialize connection
    setupConnection();
    
    // Listen for WebSocket errors
    const handleWebSocketError = (event: Event) => {
      const customEvent = event as CustomEvent;
      toast.error(customEvent.detail.message, {
        description: "Check server connection and logs",
      });
    };
    
    document.addEventListener('websocket-error', handleWebSocketError);
    
    // Load saved settings
    const savedThresholds = LocalStorageService.loadThresholds();
    if (savedThresholds) {
      setThresholds(savedThresholds);
    }
    
    const savedCalibration = LocalStorageService.loadCalibration();
    if (savedCalibration) {
      setCalibration(savedCalibration);
    }
    
    return () => {
      document.removeEventListener('connection-success', handleConnectionSuccess);
      document.removeEventListener('websocket-error', handleWebSocketError);
      webSocketService.disconnect();
      serialService.disconnect();
    };
  }, [calibration]);
  
  const handleConnect = () => {
    setConnected(true);
  };
  
  const handleSaveThresholds = (newThresholds: Thresholds) => {
    setThresholds(newThresholds);
    
    if (LocalStorageService.saveThresholds(newThresholds)) {
      toast.success("Threshold settings saved successfully");
    } else {
      toast.error("Failed to save threshold settings");
    }
  };
  
  const handleSaveCalibration = (newCalibration: Calibration) => {
    setCalibration(newCalibration);
    LocalStorageService.saveCalibration(newCalibration);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-hydro-dark">Hydroponics Monitoring System</h1>
        <p className="text-gray-600">Real-time parameter dashboard for your hydroponic system</p>
        
        <ConnectionControl 
          onConnect={handleConnect} 
          isConnected={connected} 
          dataReceived={dataReceived}
        />
      </header>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Gauge size={16} />
            <span>Monitoring</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            <span>Thresholds</span>
          </TabsTrigger>
          <TabsTrigger value="calibration" className="flex items-center gap-2">
            <Gauge size={16} />
            <span>Calibration</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Activity size={16} />
            <span>Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="serialmonitor" className="flex items-center gap-2">
            <Terminal size={16} />
            <span>Serial Monitor</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitor">
          <MonitoringPanel 
            params={params}
            phHistory={phHistory}
            tempHistory={tempHistory}
            tdsHistory={tdsHistory}
            showGraphs={showGraphs}
            setShowGraphs={setShowGraphs}
            thresholds={thresholds}
          />
        </TabsContent>
        
        <TabsContent value="settings">
          <ThresholdSettings 
            phMin={thresholds.phMin}
            phMax={thresholds.phMax}
            temperatureMin={thresholds.temperatureMin}
            temperatureMax={thresholds.temperatureMax}
            tdsMin={thresholds.tdsMin}
            tdsMax={thresholds.tdsMax}
            onSave={handleSaveThresholds}
          />
        </TabsContent>
        
        <TabsContent value="calibration">
          <CalibrationSettings 
            initialValues={calibration}
            onSaveCalibration={handleSaveCalibration}
          />
        </TabsContent>
        
        <TabsContent value="statistics">
          <StatisticsView />
        </TabsContent>
        
        <TabsContent value="serialmonitor">
          <SerialMonitor />
        </TabsContent>
      </Tabs>
      
      <SystemInfoPanel 
        connected={connected}
        lastUpdate={lastUpdate}
        thresholds={thresholds}
      />
    </div>
  );
};

export default Dashboard;
