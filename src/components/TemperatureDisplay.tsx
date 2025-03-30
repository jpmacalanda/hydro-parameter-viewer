
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Thermometer } from "lucide-react";
import TimeGraph from './TimeGraph';

interface TemperatureDisplayProps {
  value: number;
  history?: Array<{time: string; value: number}>;
  showGraph?: boolean;
  optimalMin?: number;
  optimalMax?: number;
}

const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({ 
  value, 
  history = [], 
  showGraph = false,
  optimalMin = 18,
  optimalMax = 26
}) => {
  // Temperature range for display purposes
  const tempMin = 0;
  const tempMax = 40;
  
  // Calculate progress percentage (0-100)
  const progressPercent = value === 0 ? 0 : (value / tempMax) * 100;
  
  // Determine status based on temperature value
  const getStatus = () => {
    if (value === 0) return "unavailable";
    if (value < optimalMin) return "low";
    if (value > optimalMax) return "high";
    return "normal";
  };
  
  const status = getStatus();
  
  // Set color based on temperature status
  const getColor = () => {
    switch (status) {
      case "unavailable": return "text-gray-400";
      case "low": return "text-hydro-temp-low";
      case "high": return "text-hydro-temp-high";
      case "normal": return "text-hydro-temp-normal";
    }
  };
  
  const statusText = () => {
    switch (status) {
      case "unavailable": return "No Data";
      case "low": return "Too Cold";
      case "high": return "Too Hot";
      case "normal": return "Optimal";
    }
  };

  // Check if the temperature is in the optimal range
  const isOptimal = status === "normal";
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Water Temperature</span>
          <Thermometer 
            size={24} 
            className={`${getColor()} animate-pulse-slow`} 
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <span className="text-3xl font-bold">{value === 0 ? "-" : `${value.toFixed(1)}°C`}</span>
          {isOptimal ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-green-500">
              Optimal
            </span>
          ) : (
            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getBgColor()}`}>
              {statusText()}
            </span>
          )}
        </div>
        
        <div className="relative pt-1">
          <div className="flex justify-between text-xs mb-1">
            <span>Cold</span>
            <span>Optimal</span>
            <span>Hot</span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2 bg-gray-200"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span>{tempMin}</span>
            <span></span>
            <span>{tempMax}°C</span>
          </div>
          
          {/* Optimal range indicator */}
          <div 
            className="absolute h-3 bg-green-200 opacity-40 top-[18px] rounded-sm" 
            style={{ 
              left: `${(optimalMin / tempMax) * 100}%`, 
              width: `${((optimalMax - optimalMin) / tempMax) * 100}%` 
            }}
          ></div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Target: {optimalMin}-{optimalMax}°C</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {showGraph && history.length > 0 && (
          <TimeGraph 
            data={history} 
            dataKey="value" 
            color="#ff7300" 
            name="Temperature" 
            unit="°C"
            min={0}
            max={40}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TemperatureDisplay;
