
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Thermometer } from "lucide-react";

interface TemperatureDisplayProps {
  value: number;
}

const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({ value }) => {
  // Temperature range for display (Celsius)
  const tempMin = 10;
  const tempMax = 35;
  const optimalMin = 18;
  const optimalMax = 26;
  
  // Calculate progress percentage (0-100)
  const boundedValue = Math.max(tempMin, Math.min(tempMax, value));
  const progressPercent = ((boundedValue - tempMin) / (tempMax - tempMin)) * 100;
  
  // Determine status based on temperature
  const getStatus = () => {
    if (value < optimalMin) return "low";
    if (value > optimalMax) return "high";
    return "normal";
  };
  
  const status = getStatus();
  
  // Set color based on status
  const getColor = () => {
    switch (status) {
      case "low": return "hydro-temp-low";
      case "high": return "hydro-temp-high";
      case "normal": return "hydro-temp-normal";
    }
  };
  
  const statusText = () => {
    switch (status) {
      case "low": return "Too Cool";
      case "high": return "Too Warm";
      case "normal": return "Optimal";
    }
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Water Temperature</span>
          <Thermometer 
            size={24} 
            className={`text-${getColor()} animate-pulse-slow`} 
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <span className="text-3xl font-bold">{value.toFixed(1)}°C</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white bg-${getColor()}`}>
            {statusText()}
          </span>
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
            <span>{tempMin}°C</span>
            <span></span>
            <span>{tempMax}°C</span>
          </div>
          
          {/* Optimal range indicator */}
          <div 
            className="absolute h-3 bg-green-200 opacity-40 top-[18px] rounded-sm" 
            style={{ 
              left: `${((optimalMin - tempMin) / (tempMax - tempMin)) * 100}%`, 
              width: `${((optimalMax - optimalMin) / (tempMax - tempMin)) * 100}%` 
            }}
          ></div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Target: 18-26°C</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TemperatureDisplay;
