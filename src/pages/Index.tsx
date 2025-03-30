
import React, { useState } from 'react';
import Dashboard from '@/components/Dashboard';
import { SerialData } from '@/services/types/serial.types';

const Index = () => {
  // Create the necessary states to pass to Dashboard
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
  
  const [features, setFeatures] = useState({
    showStatistics: true,
    showThresholds: true,
    showSystemLogs: true,
    showSerialMonitor: true
  });
  
  const handleSensorData = (data: SerialData) => {
    setSensorData(data);
    setDataHistory(prev => [...prev, data]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1">
        <Dashboard 
          features={features}
          sensorData={sensorData}
          dataHistory={dataHistory}
          thresholds={thresholds}
          setThresholds={setThresholds}
          setFeatures={setFeatures}
          onSensorData={handleSensorData}
        />
      </div>
      <footer className="py-4 px-6 border-t bg-white text-center text-sm text-gray-500">
        <p>Project by Muha Muha and RMNHS SSP G10 B2025</p>
      </footer>
    </div>
  );
};

export default Index;
